const db = require('../Models');
const { Op } = require('sequelize');
const moment = require('moment');

const Availability = db.availability;

// availabilityController.js
exports.createAvailability = async (req, res, next) => {
  try {
    const { professionalId } = req.params;
    const { availability } = req.body;

    console.log('Create availability request:', { professionalId, availability });

    if (req.user.role !== 'admin' && req.user.UserId !== +professionalId) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const professional = await db.professionals.findByPk(professionalId);
    if (!professional) {
      return res.status(404).json({ message: 'Professional not found' });
    }

    for (let slot of availability) {
      console.log('Validating slot:', slot);
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

    const formattedAvailability = availability.map(slot => {
      const dayOfWeek = slot.IsRecurring ? (typeof slot.DayOfWeek === 'string' ? 
        ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
          .indexOf(slot.DayOfWeek.toLowerCase()) : slot.DayOfWeek) : null;
      const formattedSlot = {
        ProfessionalId: professionalId,
        DayOfWeek: dayOfWeek,
        StartTime: slot.StartTime,
        EndTime: slot.EndTime,
        IsRecurring: slot.IsRecurring,
        ValidFrom: slot.ValidFrom || new Date().toISOString().split('T')[0],
        ValidTo: slot.IsRecurring ? (slot.ValidTo || '2025-12-31') : slot.ValidTo
      };
      console.log('Formatted slot:', formattedSlot);
      return formattedSlot;
    });

    const newAvailability = await Availability.bulkCreate(formattedAvailability);
    console.log('Created availability:', newAvailability);
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
      
      currentStart.add(30, 'minutes');
    }
  });
  
  return slots;
}

exports.getProfessionalAvailability = async (req, res, next) => {
  try {
    const { professionalId } = req.params;
    const { date } = req.query;
    
    if (!date) return res.status(400).json({ message: 'Date parameter is required' });
    
    const requestedDate = moment(date);
    const startOfWeek = requestedDate.clone().startOf('week');
    const endOfWeek = requestedDate.clone().endOf('week');
    
    const availability = await Availability.findAll({
      where: {
        ProfessionalId: professionalId,
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

    const calendarSlots = availability.map(slot => {
      const isRecurring = slot.IsRecurring;
      let dayOfWeek = null;
      
      if (isRecurring && slot.DayOfWeek !== null) {
        if (typeof slot.DayOfWeek === 'string') {
          dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
            .indexOf(slot.DayOfWeek.toLowerCase());
        } else {
          dayOfWeek = slot.DayOfWeek;
        }
      }

      return {
        id: slot.AvailabilityId,
        title: isRecurring ? 'Available (Recurring)' : 'Available (One-time)',
        start: !isRecurring ? `${date}T${slot.StartTime}` : null,
        end: !isRecurring ? `${date}T${slot.EndTime}` : null,
        daysOfWeek: isRecurring ? [dayOfWeek] : null,
        startTime: isRecurring ? slot.StartTime : null,
        endTime: isRecurring ? slot.EndTime : null,
        startRecur: isRecurring ? slot.ValidFrom : null,
        endRecur: isRecurring ? slot.ValidTo : null,
        backgroundColor: isRecurring ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
        borderColor: isRecurring ? 'rgba(16, 185, 129, 0.8)' : 'rgba(59, 130, 246, 0.8)',
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

exports.getAvailabilitySlot = async (req, res, next) => {
  try {
    const { professionalId, slotId } = req.params;

    if (req.user.role !== 'admin' && req.user.UserId !== +professionalId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const slot = await Availability.findOne({
      where: {
        AvailabilityId: slotId,
        ProfessionalId: professionalId
      },
      raw: true
    });

    if (!slot) {
      return res.status(404).json({ message: 'Availability slot not found' });
    }

    res.status(200).json(slot);
  } catch (error) {
    console.error('Get availability slot error:', error);
    res.status(500).json({ message: 'Server error while fetching availability slot', error: error.message });
    next(error);
  }
};

exports.deleteAvailability = async (req, res, next) => {
  try {
    const { professionalId, slotId } = req.params;

    console.log('Deleting slot:', { professionalId, slotId });

    if (req.user.role !== 'admin' && req.user.UserId !== +professionalId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const availability = await Availability.findOne({ where: { AvailabilityId: slotId, ProfessionalId: professionalId } });
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
    const { professionalId, slotId } = req.params;
    const { availability } = req.body;

    console.log('Updating slot:', { professionalId, slotId, availability });

    if (req.user.role !== 'admin' && req.user.UserId !== +professionalId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const slot = await Availability.findOne({ where: { AvailabilityId: slotId, ProfessionalId: professionalId } });
    if (!slot) {
      return res.status(404).json({ message: 'Availability slot not found' });
    }

    const dayOfWeek = availability[0].IsRecurring ? (typeof availability[0].DayOfWeek === 'string' ? 
      ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        .indexOf(availability[0].DayOfWeek.toLowerCase()) : availability[0].DayOfWeek) : null;

    const updateData = {
      StartTime: availability[0].StartTime,
      EndTime: availability[0].EndTime,
      IsRecurring: availability[0].IsRecurring,
      DayOfWeek: dayOfWeek,
      ValidFrom: availability[0].ValidFrom,
      ValidTo: availability[0].IsRecurring ? availability[0].ValidTo : availability[0].ValidFrom
    };

    await slot.update(updateData);
    res.status(200).json(slot);
  } catch (error) {
    console.error('Update availability error:', error);
    res.status(500).json({ message: 'Server error while updating availability', error: error.message });
    next(error);
  }
};