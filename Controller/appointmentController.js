const db = require('../Models');
const { Op } = require('sequelize');
const moment = require('moment');

/* ═════════ helper de duración ═════════ */
const checkDuration = (service, minutes) => {
  if (minutes % service.DurationIncrement !== 0)
    throw new Error(`Duration must be multiple of ${service.DurationIncrement}`);

  if (minutes < service.BaseDuration)
    throw new Error(`Duration cannot be < ${service.BaseDuration}`);

  if (minutes > service.MaxDuration)
    throw new Error(`Duration cannot be > ${service.MaxDuration}`);
};

exports.createAppointment = async (req, res, next) => {
  try {
    const { ServiceId, ClientId, StartTime, DurationMinutes, Notes } = req.body;

    /* 1. servicio + cliente */
    const service = await db.services.findByPk(ServiceId, {
      include: [{ model: db.professionals, as: 'Professional' }]
    });
    if (!service) return res.status(404).json({ message: 'Service not found' });

    const client = await db.clients.findByPk(ClientId);
    if (!client) return res.status(404).json({ message: 'Client not found' });

    /* 2. duración correcta */
    try { checkDuration(service, DurationMinutes); }
    catch (err) { return res.status(400).json({ message: err.message }); }

    /* 3. fechas */
    const start = moment(StartTime);
    if (!start.isValid()) return res.status(400).json({ message: 'Invalid date' });
    const end = start.clone().add(DurationMinutes, 'minutes').toDate();

    /* 4. crear con ProfessionalId */
    const appt = await db.appointments.create({
      ServiceId,
      ProfessionalId: service.Professional.ProfessionalId, // Añadido
      ClientId,
      StartTime: start.toDate(),
      EndTime: end,
      DurationMinutes,
      Status: 'pending',
      Notes
    });

    res.status(201).json(appt);
  } catch (err) { next(err); }
};

// Optimizar getAllAppointments
exports.getAllAppointments = async (req, res, next) => {
  try {
    const { professionalId, clientId, status, dateFrom, dateTo } = req.query;
    
    const where = {};
    if (clientId) where.ClientId = clientId;
    if (professionalId) where.ProfessionalId = professionalId; // Directo ahora
    if (status) where.Status = status;
    
    if (dateFrom || dateTo) {
      where.StartTime = {};
      if (dateFrom) where.StartTime[Op.gte] = new Date(dateFrom);
      if (dateTo) where.StartTime[Op.lte] = new Date(dateTo);
    }

    const includes = [
      {
        model: db.services,
        as: 'Service',
        attributes: ['ServiceId', 'Name', 'Description', 'Price']
      },
      {
        model: db.clients,
        as: 'Client',
        include: [{
          model: db.users,
          as: 'User',
          attributes: ['UserId', 'FirstName', 'LastName', 'ProfilePicture']
        }]
      },
      {
        model: db.professionals,
        as: 'Professional',
        include: [{
          model: db.users,
          as: 'User',
          attributes: ['UserId', 'FirstName', 'LastName', 'ProfilePicture']
        }]
      }
    ];

    const appointments = await db.appointments.findAll({
      where,
      include: includes,
      order: [['StartTime', 'ASC']]
    });

    res.json(appointments);
  } catch (error) {
    console.error('Error en getAllAppointments:', error);
    next(error);
  }
};

// Optimizar getUpcomingAppointments
exports.getUpcomingAppointments = async (req, res, next) => {
  try {
    const where = { 
      [Op.or]: [
        { ClientId: req.user.UserId },
        { ProfessionalId: req.user.UserId } // Más directo ahora
      ],
      StartTime: { [Op.gte]: new Date() },
      Status: { [Op.in]: ['pending', 'confirmed'] }
    };

    const appointments = await db.appointments.findAll({
      where,
      include: [
        {
          model: db.services,
          as: 'Service',
          attributes: ['ServiceId', 'Name']
        },
        {
          model: db.clients,
          as: 'Client',
          include: [{
            model: db.users,
            as: 'User',
            attributes: ['FirstName', 'LastName', 'ProfilePicture']
          }]
        }
      ],
      order: [['StartTime', 'ASC']],
      limit: 5
    });

    res.json(appointments);
  } catch (error) {
    next(error);
  }
};

/* ═════════ util – calcular slots disponibles ═════════ */
const calculateAvailableSlots = (availabilities, appts, minutes, date) => {
  const slots = [];
  availabilities.forEach(av => {
    let cur = moment(`${date}T${av.StartTime}`);
    const end = moment(`${date}T${av.EndTime}`);

    while (cur.clone().add(minutes, 'm').isSameOrBefore(end)) {
      const slotEnd = cur.clone().add(minutes, 'm');
      const busy = appts.some(a =>
        moment(a.StartTime).isBefore(slotEnd) &&
        moment(a.EndTime).isAfter(cur));
      if (!busy) {
        slots.push({ start: cur.format(), end: slotEnd.format() });
      }
      cur.add(30, 'm');              // paso de 30 min
    }
  });
  return slots;
};


/* ========= getProfessionalAvailability ========= */
exports.getProfessionalAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date, duration = 60 } = req.query;
    if (!date)
      return res.status(400).json({ message: 'Date parameter is required' });

    const day = moment(date).format('dddd').toLowerCase();

    const availability = await db.availability.findAll({
      where: {
        ProfessionalId: id,
        DayOfWeek: day,
        [Op.or]: [
          { IsRecurring: true },
          {
            [Op.and]: [
              { ValidFrom: { [Op.lte]: date } },
              { [Op.or]: [{ ValidTo: null }, { ValidTo: { [Op.gte]: date } }] }
            ]
          }
        ]
      }
    });

    const appts = await db.appointments.findAll({
      where: {
        '$Service.ProfessionalId$': id,
        StartTime: {
          [Op.between]: [moment(date).startOf('day').toDate(), moment(date).endOf('day').toDate()]
        }
      },
      include: [{ model: db.services, as: 'Service' }]
    });

    const slots = calculateAvailableSlots(availability, appts, +duration, date);
    res.json({ availability, slots });
  } catch (err) { next(err); }
};


// Modificar el método getAllAppointments para soportar paginación
exports.getAllAppointments = async (req, res, next) => {
  try {
    const { 
      professionalId, 
      clientId, 
      status, 
      dateFrom, 
      dateTo,
      page = 1,      // Nueva: página actual, default 1
      limit = 10,    // Nueva: items por página, default 10
      sortBy = 'StartTime',
      sortOrder = 'ASC'
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    const where = {};
    if (clientId) where.ClientId = clientId;
    if (professionalId) where.ProfessionalId = professionalId;
    if (status) where.Status = status;
    
    if (dateFrom || dateTo) {
      where.StartTime = {};
      if (dateFrom) where.StartTime[Op.gte] = new Date(dateFrom);
      if (dateTo) where.StartTime[Op.lte] = new Date(dateTo);
    }

    const includes = [
      {
        model: db.services,
        as: 'Service',
        attributes: ['ServiceId', 'Name', 'Description', 'Price']
      },
      {
        model: db.clients,
        as: 'Client',
        include: [{
          model: db.users,
          as: 'User',
          attributes: ['UserId', 'FirstName', 'LastName', 'ProfilePicture']
        }]
      },
      {
        model: db.professionals,
        as: 'Professional',
        include: [{
          model: db.users,
          as: 'User',
          attributes: ['UserId', 'FirstName', 'LastName', 'ProfilePicture']
        }]
      }
    ];

    // Obtener el total de registros (para cálculo de páginas)
    const total = await db.appointments.count({ where, include: includes });
    
    // Obtener los datos paginados
    const appointments = await db.appointments.findAll({
      where,
      include: includes,
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      data: appointments,
      pagination: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        itemsPerPage: parseInt(limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error en getAllAppointments:', error);
    next(error);
  }
};


exports.getAppointmentById = async (req, res, next) => {
  try {
    const appointment = await db.appointments.findByPk(req.params.id, {
      include: [
        {
          model: db.services,
          as: 'Service',
          include: [
            {
              model: db.professionals,
              as: 'Professional',
              include: [
                {
                  model: db.users,
                  as: 'User',
                  attributes: ['UserId', 'FirstName', 'LastName']
                }
              ]
            }
          ]
        },
        {
          model: db.clients,
          as: 'Client',
          include: [
            {
              model: db.users,
              as: 'User',
              attributes: ['UserId', 'FirstName', 'LastName']
            }
          ]
        }
      ]
    });
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    res.json(appointment);
  } catch (error) {
    next(error);
  }
};

exports.cancelAppointment = async (req, res, next) => {
  try {
    const appointment = await db.appointments.findByPk(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Verificar si la cita puede ser cancelada (ej. no dentro de 24 horas)
    const now = moment();
    const appointmentTime = moment(appointment.StartTime);
    const hoursDifference = appointmentTime.diff(now, 'hours');

    if (hoursDifference < 24) {
      return res.status(400).json({ message: 'Appointments can only be cancelled at least 24 hours in advance' });
    }

    await appointment.update({ Status: 'cancelled' });
    res.json(appointment);
  } catch (error) {
    next(error);
  }
};

exports.updateAppointmentStatus = async (req, res, next) => {
  console.log('Entering updateAppointmentStatus for appointment:', req.params.id); // Nuevo log
  try {
    const { id } = req.params;
    const { Status } = req.body;

    if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(Status))
      return res.status(400).json({ message: 'Invalid status value' });

    const appt = await db.appointments.findByPk(id, {
      include: [{ 
        model: db.services, 
        as: 'Service',
        include: [{ model: db.professionals, as: 'Professional' }]
      }]
    });
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });

    console.log('Debug - User:', req.user);
    console.log('Debug - Appointment:', appt);
    console.log('Debug - Service ProfessionalId:', appt.Service?.Professional?.ProfessionalId);

    if (req.user.Role !== 'admin' &&
        req.user.UserId !== appt.Service.Professional?.ProfessionalId)
      return res.status(403).json({ message: 'Not authorized' });

    await appt.update({ Status });
    res.json(appt);
  } catch (err) {
    console.error('Error in updateAppointmentStatus:', err); // Log errores
    next(err);
  }
};


exports.completeAppointment = async (req, res, next) => {
  try {
    const appointment = await db.appointments.findByPk(req.params.id, {
      include: [{ model: db.services, as: 'Service' }]
    });
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.Service.ProfessionalId !== req.user.UserId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await appointment.update({ Status: 'completed' });
    res.json(appointment);
  } catch (error) {
    next(error);
  }
};