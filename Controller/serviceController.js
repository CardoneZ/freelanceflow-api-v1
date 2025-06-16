const db = require('../Models');
const { Op } = require('sequelize');


exports.getAllServices = async (req, res, next) => {
  try {
    const { professionalId, search, minPrice, maxPrice, minDuration, maxDuration } = req.query;
    const where = {};
    
    if (professionalId) where.ProfessionalId = professionalId;
    if (search) {
      where[Op.or] = [
        { Name: { [Op.like]: `%${search}%` } },
        { Description: { [Op.like]: `%${search}%` } }
      ];
    }
    if (minPrice) where.Price = { [Op.gte]: minPrice };
    if (maxPrice) where.Price = { ...where.Price, [Op.lte]: maxPrice };
    if (minDuration) where.BaseDuration = { [Op.gte]: minDuration };
    if (maxDuration) where.MaxDuration = { [Op.lte]: maxDuration };

    const services = await db.services.findAll({
      where,
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
      ],
      order: [['ServiceId', 'DESC']]
    });

    res.json(services);
  } catch (error) {
    next(error);
  }
};

exports.getServiceById = async (req, res, next) => {
  try {
    const service = await db.services.findByPk(req.params.id, {
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
    
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.json(service);
  } catch (error) {
    next(error);
  }
};

exports.createService = async (req, res, next) => {
  try {
    const { ProfessionalId, Name, Description, BaseDuration, MaxDuration, DurationIncrement, Price, PriceType } = req.body;
    
    
    const professional = await db.professionals.findByPk(ProfessionalId);
    if (!professional) {
      return res.status(404).json({ message: 'Professional not found' });
    }

   
    if (BaseDuration > MaxDuration) {
      return res.status(400).json({ message: 'Base duration cannot be greater than max duration' });
    }
    
    if (MaxDuration % DurationIncrement !== 0 || BaseDuration % DurationIncrement !== 0) {
      return res.status(400).json({ message: 'Durations must be multiples of the increment value' });
    }

    const service = await db.services.create({
      ProfessionalId,
      Name,
      Description,
      BaseDuration,
      MaxDuration,
      DurationIncrement,
      Price,
      PriceType
    });

    res.status(201).json(service);
  } catch (error) {
    next(error);
  }
};


exports.updateService = async (req, res, next) => {
  try {
    const service = await db.services.findByPk(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // Validar duraciones si se están actualizando
    if (req.body.BaseDuration || req.body.MaxDuration || req.body.DurationIncrement) {
      const newBase = req.body.BaseDuration ?? service.BaseDuration;
      const newMax = req.body.MaxDuration ?? service.MaxDuration;
      const newIncrement = req.body.DurationIncrement ?? service.DurationIncrement;
      
      if (newBase > newMax) {
        return res.status(400).json({ message: 'Base duration cannot be greater than max duration' });
      }
      
      if (newMax % newIncrement !== 0 || newBase % newIncrement !== 0) {
        return res.status(400).json({ message: 'Durations must be multiples of the increment value' });
      }
    }

    await service.update(req.body);
    res.json(service);
  } catch (error) {
    next(error);
  }
};


exports.deleteService = async (req, res, next) => {
  try {
    const service = await db.services.findByPk(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    await service.destroy();
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

const validateServiceDuration = (service, duration) => {
  if (duration % service.DurationIncrement !== 0) {
    throw new Error(`Duration must be in increments of ${service.DurationIncrement} minutes`);
  }
  
  if (duration < service.BaseDuration) {
    throw new Error(`Duration cannot be less than ${service.BaseDuration} minutes`);
  }
  
  if (duration > service.MaxDuration) {
    throw new Error(`Duration cannot exceed ${service.MaxDuration} minutes`);
  }
};


exports.validateDuration = async (req, res) => {
  try {
    const { serviceId, duration } = req.params;
    const service = await db.services.findByPk(serviceId);
    if (!service) return res.status(404).json({ message: 'Servicio no encontrado' });

    const d = parseInt(duration, 10);
    
    
    validateServiceDuration(service, d);
    
    const allowedDurations = [];
    for (let x = service.BaseDuration; x <= service.MaxDuration; x += service.DurationIncrement) {
      allowedDurations.push(x);
    }

    res.json({ valid: true, allowedDurations: allowedDurations });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message });
  }
};



function getAllowedDurations(service) {
  const durations = [];
  for (let d = service.BaseDuration; d <= service.MaxDuration; d += service.DurationIncrement) {
    durations.push(d);
  }
  return durations;
}