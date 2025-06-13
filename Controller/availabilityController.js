const db = require('../Models');
const { Op } = require('sequelize');
const moment = require('moment');

const Availability = db.availability;

exports.createAvailability = async (req, res, next) => {
  try {

    const { id } = req.params;  // El id del profesional viene en los parámetros
    const { availability } = req.body;  // La disponibilidad se pasa en el cuerpo de la solicitud

    if (req.user.role !== 'admin' && req.user.UserId !== +id)
      return res.status(403).json({ message:'Not authorized' });
    
    // Verificar que el profesional existe
    const professional = await db.professionals.findByPk(id);
    if (!professional) {
      return res.status(404).json({ message: 'Professional not found' });
    }

    // Validación adicional (si es necesario): por ejemplo, que la duración no sea negativa
    for (let slot of availability) {
      if (!slot.DayOfWeek || !slot.StartTime || !slot.EndTime) {
        return res.status(400).json({ message: 'Invalid slot data' });
      }
      if (slot.StartTime >= slot.EndTime) {
        return res.status(400).json({ message: 'Start time must be earlier than end time' });
      }
    }

    // Crear nueva disponibilidad
    const newAvailability = await Availability.bulkCreate(
      availability.map(slot => ({
        ProfessionalId: id,  // Asigna el ID del profesional
        DayOfWeek: slot.DayOfWeek,  // Día de la semana
        StartTime: slot.StartTime,  // Hora de inicio
        EndTime: slot.EndTime,  // Hora de fin
        IsRecurring: slot.IsRecurring || false,  // Si es recurrente, por defecto es false
        ValidFrom: slot.ValidFrom || null,      // deja que el front decida
        ValidTo: slot.ValidTo || null  // Fecha de fin, si está disponible
      }))
    );

    res.status(201).json(newAvailability);  // Devuelve la disponibilidad creada
  } catch (error) {
    console.error(error);  // Agregar más información de error
    next(error);
  }
};


// Función para calcular slots disponibles
function calculateAvailableSlots(availability, appointments, duration, date) {
  const slots = [];
  
  availability.forEach(slot => {
    let currentStart = moment(`${date}T${slot.StartTime}`);
    const endTime = moment(`${date}T${slot.EndTime}`);
    
    while (currentStart.clone().add(duration, 'minutes').isSameOrBefore(endTime)) {
      const slotEnd = currentStart.clone().add(duration, 'minutes');
      
      // Verificar si no hay citas conflictivas
      const isAvailable = !appointments.some(appt => {
        const apptStart = moment(appt.StartTime);
        const apptEnd = moment(appt.EndTime);
        return (
          (currentStart.isSameOrBefore(apptEnd) && slotEnd.isSameOrAfter(apptStart))
        );
      });
      
      if (isAvailable) {
        slots.push({
          start: currentStart.format(),
          end: slotEnd.format()
        });
      }
      
      currentStart.add(30, 'minutes'); // Saltar en intervalos de 30 minutos
    }
  });
  
  return slots;
}



exports.getProfessionalAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date, duration } = req.query;
    
    if (!date) {
      return res.status(400).json({ message: 'Date parameter is required' });
    }
    
    const dayOfWeek = moment(date).format('dddd').toLowerCase();
    
    // Obtener disponibilidad del profesional
    const availability = await Availability.findAll({
      where: { 
        ProfessionalId: id, 
        DayOfWeek: dayOfWeek,
        [Op.or]: [
          { IsRecurring: true },
          {
            [Op.and]: [
              { ValidFrom: { [Op.lte]: date } },
              { 
                [Op.or]: [
                  { ValidTo: null },
                  { ValidTo: { [Op.gte]: date } }
                ]
              }
            ]
          }
        ]
      }
    });
    
    // Obtener citas existentes para esa fecha
    const appointments = await db.appointments.findAll({
      where: { 
        '$Service.ProfessionalId$': id,
        StartTime: { 
          [Op.between]: [
            moment(date).startOf('day').toDate(),
            moment(date).endOf('day').toDate()
          ] 
        }
      },
      include: [{
        model: db.services,
        as: 'Service'
      }]
    });
    
    
    const slots = calculateAvailableSlots(
      availability, 
      appointments, 
      duration || 60, 
      date
    );
    
    res.json({ availability, slots });
  } catch (error) {
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