const db = require('../Models');
const { Op } = require('sequelize');


exports.createProfessional = async (req, res, next) => {
  try {
    const { UserId, Title, Bio, HourlyRate, Location } = req.body;
    
    const user = await db.users.findByPk(UserId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const existingProfessional = await db.professionals.findOne({ 
      where: { ProfessionalId: UserId } 
    });
    if (existingProfessional) {
      return res.status(400).json({ message: 'User is already a professional' });
    }

    const professional = await db.professionals.create({
      ProfessionalId: UserId,
      Title,
      Bio,
      HourlyRate,
      Location
    });

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
        { '$User.FirstName$': { [Op.like]: `%${search}%` } },
        { '$User.LastName$': { [Op.like]: `%${search}%` } }
      ];
    }

    const professionals = await db.professionals.findAll({
      where,
      include: [
        {
          model: db.users,
          as: 'User',
          attributes: ['UserId', 'FirstName', 'LastName', 'Email', 'ProfilePicture']
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
          attributes: ['UserId', 'FirstName', 'LastName', 'Email', 'ProfilePicture']
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
                  attributes: ['UserId', 'FirstName', 'LastName', 'ProfilePicture']
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
              attributes: ['FirstName', 'LastName']
            }
          ]
        }
      ],
      order: [['ServiceId', 'DESC']]
    });
    
    res.json(services);
  } catch (error) {
    next(error);
  }
};

exports.getProfessionalStats = async (req, res) => {
  try {
    const professionalId = req.params.id;

    const totalAppointments = await db.appointments.count({
      where: { ProfessionalId: professionalId }
    });

    const earnings = await db.appointments.findAll({
      include: [
        {
          model: db.services,
          as: 'Service', 
          attributes: ['Price']
        }
      ],
      where: { 
        ProfessionalId: professionalId,
        Status: 'completed' 
      },
      raw: true
    });

    const totalEarnings = earnings.reduce((sum, appt) => {
      return sum + (parseFloat(appt['Service.Price'] || 0) || 0);
    }, 0);

    const reviews = await db.reviews.findAll({
      where: { ProfessionalId: professionalId },
      attributes: [
        [db.sequelize.fn('AVG', db.sequelize.col('Rating')), 'avgRating']
      ],
      raw: true
    });

    const averageRating = reviews[0]?.avgRating || 0;

    const formattedAvgRating = parseFloat(averageRating).toFixed(1);


    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const upcomingToday = await db.appointments.count({
      where: {
        ProfessionalId: professionalId,
        StartTime: {
          [db.Sequelize.Op.between]: [todayStart, todayEnd]
        },
        Status: 'confirmed'
      }
    });

    res.json({
      success: true,
      stats: {
        totalAppointments,
        totalEarnings: totalEarnings.toFixed(2),
        averageRating: formattedAvgRating, 
        upcomingToday
      }
    });

  } catch (error) {
    console.error('Error getting professional stats:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error getting professional stats',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};