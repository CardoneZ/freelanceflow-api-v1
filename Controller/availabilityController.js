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
            if (slot.IsRecurring && (slot.DayOfWeek === undefined || slot.DayOfWeek === null)) {
                return res.status(400).json({ message: 'DayOfWeek is required for recurring slots' });
            }
        }

        // Convertir DayOfWeek de número a texto si es necesario
        const formattedAvailability = availability.map(slot => ({
            ProfessionalId: id,
            DayOfWeek: slot.IsRecurring ? 
                ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][parseInt(slot.DayOfWeek)] : 
                null,
            StartTime: slot.StartTime,
            EndTime: slot.EndTime,
            IsRecurring: slot.IsRecurring,
            ValidFrom: slot.IsRecurring ? null : slot.ValidFrom,
            ValidTo: slot.IsRecurring ? null : slot.ValidTo
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
        
        if (!date) {
            return res.status(400).json({ message: 'Date parameter is required' });
        }
        
        const requestedDate = moment(date);
        const dayOfWeek = requestedDate.format('dddd').toLowerCase(); // 'monday', 'tuesday', etc.
        
        // 1. Get availability (both recurring and specific)
        const availability = await Availability.findAll({
            where: { 
                ProfessionalId: id,
                [Op.or]: [
                    { 
                        DayOfWeek: dayOfWeek,
                        IsRecurring: true
                    },
                    {
                        ValidFrom: requestedDate.format('YYYY-MM-DD'),
                        IsRecurring: false
                    }
                ]
            },
            raw: true
        });

        // 2. Get appointments for the date
        const appointments = await db.appointments.findAll({
            where: {
                ProfessionalId: id,
                StartTime: {
                    [Op.between]: [
                        requestedDate.startOf('day').toDate(),
                        requestedDate.endOf('day').toDate()
                    ]
                }
            },
            raw: true
        });

        // 3. Format calendar slots
        const calendarSlots = availability.map(slot => ({
            id: slot.AvailabilityId,
            title: 'Available',
            start: `${date}T${slot.StartTime}`,
            end: `${date}T${slot.EndTime}`,
            backgroundColor: 'rgba(14, 165, 233, 0.1)',
            borderColor: 'rgba(14, 165, 233, 0.8)',
            textColor: '#0ea5e9',
            extendedProps: {
                type: 'availability'
            }
        }));

        res.json({ 
            recurring: availability.filter(s => s.IsRecurring),
            calendar: calendarSlots 
        });
        
    } catch (error) {
        console.error('Error in getProfessionalAvailability:', error);
        next(error);
    }
};

exports.deleteAvailability = async (req, res, next) => {
    try {
        const { id, slotId } = req.params;

        if (req.user.role !== 'admin' && req.user.UserId !== +id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const availability = await Availability.findOne({ where: { id: slotId, ProfessionalId: id } });
        if (!availability) {
            return res.status(404).json({ message: 'Availability slot not found' });
        }

        await availability.destroy();
        res.status(200).json({ message: 'Availability slot deleted' });
    } catch (error) {
        console.error('Delete availability error:', error);
        res.status(500).json({ message: 'Server error while deleting availability' });
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