const db = require('../Models');
const { Op } = require('sequelize');

exports.getAllProfessionals = async (req, res, next) => {
  try {
    const { profession, search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const where = {};

    if (profession) where.Profession = profession;
    if (search) {
      where[Op.or] = [
        { Title: { [Op.like]: `%${search}%` } },
        { Bio: { [Op.like]: `%${search}%` } },
        { '$Professional.FirstName$': { [Op.like]: `%${search}%` } },
        { '$Professional.LastName$': { [Op.like]: `%${search}%` } }
      ];
    }

    const professionals = await db.professionals.findAll({
      where,
      include: [
        {
          model: db.users,
          as: 'User',
          attributes: ['UserId', 'FirstName', 'LastName', 'Email']
        },
        {
          model: db.services,
          as: 'services',
          required: false
        }
      ],
      order: [['ProfessionalId', 'DESC']],
      offset,
      limit
    });

    res.json(professionals);
  } catch (error) {
    next(error);
  }
};

exports.getProfessionalById = async (req, res, next) => {
  try {
    const professional = await db.professionals.findByPk(req.params.id, {
      include: [
        {
          model: db.users,
          as: 'User',
          attributes: ['UserId', 'FirstName', 'LastName', 'Email']
        },
        {
          model: db.services,
          as: 'services',
          required: false
        },
        {
          model: db.reviews,
          as: 'reviews',
          required: false,
          include: [
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
        }
      ]
    });
    
    if (!professional) {
      return res.status(404).json({ message: 'Professional not found' });
    }

    res.json(professional);
  } catch (error) {
    next(error);
  }
};

exports.createProfessional = async (req, res, next) => {
  try {
    const { UserId, Title, Bio, HourlyRate, Location } = req.body;
    
    // Verificar que el usuario existe
    const user = await db.users.findByPk(UserId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verificar que no es ya profesional
    const existingProfessional = await db.professionals.findOne({ where: { ProfessionalId: UserId } });
    if (existingProfessional) {
      return res.status(400).json({ message: 'User is already a professional' });
    }

    // Crear profesional
    const professional = await db.professionals.create({
      ProfessionalId: UserId,
      Title,
      Bio,
      HourlyRate,
      Location
    });

    // Actualizar rol del usuario si es necesario
    if (user.Role !== 'professional') {
      await user.update({ Role: 'professional' });
    }

    res.status(201).json(professional);
  } catch (error) {
    next(error);
  }
};

exports.updateProfessional = async (req, res, next) => {
  try {
    const professional = await db.professionals.findByPk(req.params.id);
    if (!professional) {
      return res.status(404).json({ message: 'Professional not found' });
    }

    await professional.update(req.body);
    res.json(professional);
  } catch (error) {
    next(error);
  }
};

exports.getProfessionalServices = async (req, res, next) => {
  try {
    const services = await db.services.findAll({
      where: { ProfessionalId: req.params.id },
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
    });

    res.json(services);
  } catch (error) {
    next(error);
  }
};

exports.getProfessionalStats = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Obtener fecha actual (sin horas/minutos/segundos)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // 1. Total de citas
    const totalAppointments = await db.appointments.count({
      where: { 
        '$service.ProfessionalId$': id 
      },
      include: [{
        model: db.services,
        as: 'service'
      }]
    });

    // 2. Citas de hoy
    const todayAppointments = await db.appointments.count({
      where: { 
        '$service.ProfessionalId$': id,
        StartTime: { 
          [Op.between]: [todayStart, todayEnd]
        }
      },
      include: [{
        model: db.services,
        as: 'service'
      }]
    });

    // 3. Ganancias totales (solo citas completadas)
    const earningsResult = await db.appointments.findOne({
      attributes: [
        [db.sequelize.literal('COALESCE(SUM(service.Price * (appointments.DurationMinutes / 60)), 0)'), 'totalEarnings']
      ],
      where: { 
        '$service.ProfessionalId$': id,
        Status: 'completed'
      },
      include: [{
        model: db.services,
        as: 'service',
        attributes: []
      }],
      raw: true
    });

    // 4. Rating promedio
    const avgRating = await db.reviews.findOne({
      attributes: [
        [db.sequelize.literal('COALESCE(AVG(Rating), 0)'), 'averageRating']
      ],
      where: { 
        '$appointment.service.ProfessionalId$': id 
      },
      include: [{
        model: db.appointments,
        as: 'appointment',
        required: true,
        include: [{
          model: db.services,
          as: 'service',
          required: true
        }]
      }],
      raw: true
    });

    res.json({
      totalAppointments,
      upcomingToday: todayAppointments,
      totalEarnings: parseFloat(earningsResult?.totalEarnings) || 0,
      averageRating: parseFloat(avgRating?.averageRating) || 0
    });

  } catch (error) {
    next(error);
  }
};