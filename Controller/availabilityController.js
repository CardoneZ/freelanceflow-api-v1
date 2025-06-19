const db = require('../Models');
const { Op } = require('sequelize');
const moment = require('moment');

const Availability = db.availability;

// availabilityController.js
exports.createAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { availability } = req.body;

    if (req.user.role !== 'admin' && req.user.UserId !== +id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const professional = await db.professionals.findByPk(id);
    if (!professional) {
      return res.status(404).json({ message: 'Professional not found' });
    }

    // Validación mejorada
    for (let slot of availability) {
      if (!slot.StartTime || !slot.EndTime) {
        return res.status(400).json({ message: 'Missing required fields: StartTime or EndTime' });
      }
      if (slot.StartTime >= slot.EndTime) {
        return res.status(400).json({ message: 'Start time must be earlier than end time' });
      }
      if (slot.IsRecurring && !slot.DayOfWeek && slot.DayOfWeek !== 0) {
        return res.status(400).json({ message: 'DayOfWeek is required for recurring slots' });
      }
    }

    const formattedAvailability = availability.map(slot => ({
      ProfessionalId: id,
      DayOfWeek: slot.IsRecurring ? slot.DayOfWeek : null, // Accept number or string
      StartTime: slot.StartTime,
      EndTime: slot.EndTime,
      IsRecurring: slot.IsRecurring,
      ValidFrom: slot.ValidFrom || new Date().toISOString().split('T')[0],
      ValidTo: slot.IsRecurring ? (slot.ValidTo || '2025-12-31') : slot.ValidTo
    }));

    const newAvailability = await Availability.bulkCreate(formattedAvailability);
    res.status(201).json(newAvailability);
  } catch (error) {
    console.error('Create availability error:', error);
    res.status(500).json({ message: 'Server error while creating availability', error: error.message });
    next(error);
  }
};

// Función para calcular slots disponibles
function calculateAvailableSlots(availability, appointments, duration, date) {
    const slots = [];
    const durationInMinutes = parseInt(duration) || 60;
    
    availability.forEach(slot => {
        const start = moment(`${date}T${slot.StartTime}`);
        const end = moment(`${date}T${slot.EndTime}`);
        
        let currentStart = moment(start);
        
        while (currentStart.clone().add(durationInMinutes, 'minutes').isSameOrBefore(end)) {
            const slotEnd = currentStart.clone().add(durationInMinutes, 'minutes');
            
            // Verificar que no choque con citas existentes
            const isAvailable = !appointments.some(appt => {
                const apptStart = moment(appt.StartTime);
                const apptEnd = moment(appt.EndTime);
                return currentStart.isBefore(apptEnd) && slotEnd.isAfter(apptStart);
            });
            
            if (isAvailable) {
                slots.push({
                    id: `slot-${slot.id}-${currentStart.format('HHmm')}`,
                    start: currentStart.toISOString(),
                    end: slotEnd.toISOString(),
                    title: 'Available',
                    extendedProps: {
                        type: 'availability',
                        slotId: slot.id
                    }
                });
            }
            
            currentStart.add(30, 'minutes'); // Espacio entre slots
        }
    });
    
    return slots;
}

exports.getProfessionalAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date } = req.query;
    
    if (!date) return res.status(400).json({ message: 'Date parameter is required' });
    
    const requestedDate = moment(date);
    const startOfWeek = requestedDate.clone().startOf('week');
    const endOfWeek = requestedDate.clone().endOf('week');
    
    // Obtener disponibilidad recurrente y no recurrente
    const availability = await Availability.findAll({
      where: {
        ProfessionalId: id,
        [Op.or]: [
          { 
            IsRecurring: true,
            [Op.and]: [
              { ValidFrom: { [Op.lte]: endOfWeek.format('YYYY-MM-DD') } },
              { ValidTo: { [Op.gte]: startOfWeek.format('YYYY-MM-DD') } }
            ]
          },
          { 
            IsRecurring: false,
            ValidFrom: { [Op.lte]: requestedDate.format('YYYY-MM-DD') },
            ValidTo: { [Op.gte]: requestedDate.format('YYYY-MM-DD') }
          }
        ]
      },
      raw: true
    });

    // Preparar respuesta para el calendario
    const calendarSlots = availability.map(slot => {
      const isRecurring = slot.IsRecurring;
      let dayOfWeek = null;
      
      if (isRecurring && slot.DayOfWeek) {
        if (typeof slot.DayOfWeek === 'string') {
          dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
            .indexOf(slot.DayOfWeek.toLowerCase());
        } else {
          dayOfWeek = slot.DayOfWeek;
        }
      }

      return {
        AvailabilityId: slot.AvailabilityId,
        title: isRecurring ? 'Available (Recurring)' : 'Available (One-time)',
        StartTime: slot.StartTime,
        EndTime: slot.EndTime,
        IsRecurring: isRecurring,
        daysOfWeek: isRecurring && slot.DayOfWeek !== null ? [dayOfWeek] : null,
        start: !isRecurring ? `${date}T${slot.StartTime}` : null,
        end: !isRecurring ? `${date}T${slot.EndTime}` : null,
        startRecur: isRecurring ? slot.ValidFrom : null,
        endRecur: isRecurring ? slot.ValidTo : null,
        extendedProps: {
          type: 'availability',
          isRecurring: isRecurring
        }
      };
    });

    res.json({ 
      recurring: availability.filter(s => s.IsRecurring),
      calendar: calendarSlots
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteAvailability = async (req, res, next) => {
  try {
    const { id, slotId } = req.params;

    if (req.user.role !== 'admin' && req.user.UserId !== +id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const availability = await Availability.findOne({ where: { AvailabilityId: slotId, ProfessionalId: id } });
    if (!availability) {
      return res.status(404).json({ message: 'Availability slot not found' });
    }

    await availability.destroy();
    res.status(200).json({ message: 'Availability slot deleted' });
  } catch (error) {
    console.error('Delete availability error:', error);
    res.status(500).json({ message: 'Server error while deleting availability', error: error.message });
    next(error);
  }
};

exports.updateAvailability = async (req, res, next) => {
  try {

    const { id } = req.params;
    const { availability } = req.body;

    if (req.user.role !== 'admin' && req.user.UserId !== +id)
      return res.status(403).json({ message:'Not authorized' });

    // Verificar que el profesional existe
    const professional = await db.professionals.findByPk(id);
    if (!professional) {
      return res.status(404).json({ message: 'Professional not found' });
    }

    // Eliminar disponibilidad existente
    await Availability.destroy({ where: { ProfessionalId: id } });

    // Crear nueva disponibilidad
    const newAvailability = await Availability.bulkCreate(
      availability.map(slot => ({ 
        ProfessionalId: id,
        ...slot 
      }))
    );

    res.status(201).json(newAvailability);
  } catch (error) {
    next(error);
  }
};