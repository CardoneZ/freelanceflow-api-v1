const db = require('../Models');
const { Op } = require('sequelize');

exports.getAllClients = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const where = {}; 

    if (search) {
      where[Op.or] = [
        { '$User.FirstName$': { [Op.like]: `%${search}%` } },
        { '$User.LastName$': { [Op.like]: `%${search}%` } }
      ];
    }

    const clients = await db.clients.findAll({
      where,
      include: [
        {
          model: db.users,
          as: 'User',
          attributes: ['UserId', 'FirstName', 'LastName', 'Email', 'Role']
        }
      ],
      order: [['ClientId', 'DESC']],
      offset,
      limit
    });

    res.json(clients);
  } catch (error) {
    next(error);
  }
};

exports.getClientByUserId = async (req, res, next) => {
  try {
    const client = await db.clients.findOne({
      where: { UserId: req.params.userId },
      include: [
        {
          model: db.users,
          as: 'User',
          attributes: ['UserId', 'FirstName', 'LastName', 'Email']
        }
      ]
    });
    
    if (!client) {
      return res.status(404).json({ 
        success: false,
        message: 'Client not found for this user' 
      });
    }
    
    res.json({
      success: true,
      ClientId: client.ClientId,
      User: client.User
    });
  } catch (error) {
    next(error);
  }
};

exports.getClientById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const client = await db.clients.findByPk(id, {
      include: [
        {
          model: db.users,
          as: 'User',
          attributes: ['UserId', 'FirstName', 'LastName', 'Email', 'Role']
        }
      ]
    });

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json(client);
  } catch (error) {
    next(error);
  }
};


exports.getClientAppointments = async (req, res, next) => {
  try {
    const { status, upcoming } = req.query;
    const where = { ClientId: req.params.id };
    
    // Verify the requesting user owns this client profile
    const client = await db.clients.findByPk(req.params.id);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Check if the authenticated user matches this client's UserId
    if (client.UserId !== req.user.UserId && req.user.Role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (status) where.Status = status;
    if (upcoming === 'true') {
      where.StartTime = { [Op.gte]: new Date() };
    }

    const appointments = await db.appointments.findAll({
      where,
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
        }
      ],
      order: [['StartTime', 'ASC']]
    });

    res.json(appointments);
  } catch (error) {
    next(error);
  }
};