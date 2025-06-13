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
    const { startDate, endDate } = req.query;
    
    const where = { ProfessionalId: id };
    if (startDate && endDate) {
      where.createdAt = { [Op.between]: [startDate, endDate] };
    }

    const stats = {
      totalAppointments: await db.appointments.count({ where }),
      completedAppointments: await db.appointments.count({ 
        where: { ...where, Status: 'completed' } 
      }),
      averageRating: await db.reviews.findOne({
        where: { ProfessionalId: id },
        attributes: [
          [db.sequelize.fn('AVG', db.sequelize.col('Rating')), 'avgRating']
        ],
        raw: true
      }),
      earnings: await db.appointments.findOne({
        where: { ...where, Status: 'completed' },
        include: [{ model: db.services, as: 'Service' }],
        attributes: [
          [db.sequelize.fn('SUM', db.sequelize.col('Service.Price')), 'totalEarnings']
        ],
        raw: true
      })
    };

    res.json(stats);
  } catch (error) {
    next(error);
  }
};
