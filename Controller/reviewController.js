const db = require('../Models');

exports.createReview = async (req, res, next) => {
  try {
    const { AppointmentId, Rating, Comment } = req.body;

    /* 1. cita existente y completada */
    const appointment = await db.appointments.findByPk(AppointmentId,{
      include:[{ model: db.services, as:'Service' }]   
    });
    if (!appointment || appointment.Status !== 'completed') {
      return res.status(400).json({ message: 'Cannot review an incomplete appointment' });
    }

    /* 2. solo una review por cita */
    const exists = await db.reviews.findOne({ where: { AppointmentId } });
    if (exists) {
      return res.status(400).json({ message: 'Review already exists for this appointment' });
    }

    /* 3. rating válido */
    if (Rating < 1 || Rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    /* 4. crear review */
    const review = await db.reviews.create({
      AppointmentId,
      Rating,
      Comment,
      ProfessionalId: appointment.Service.ProfessionalId,
      ClientId      : appointment.ClientId
    });

    res.status(201).json(review);
  } catch (err) { next(err); }
};

exports.getProfessionalReviews = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    const offset = (parsedPage - 1) * parsedLimit;

    if (isNaN(parsedPage) || isNaN(parsedLimit) || parsedPage < 1 || parsedLimit < 1) {
      return res.status(400).json({ message: 'Invalid page or limit parameters' });
    }

    console.log('Fetching reviews for ProfessionalId:', req.params.id, 'Page:', parsedPage, 'Limit:', parsedLimit);

    const { count, rows } = await db.reviews.findAndCountAll({
      where: { ProfessionalId: req.params.id },
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
        },
        {
          model: db.appointments,
          as: 'Appointment',
          attributes: ['AppointmentId', 'StartTime']
        }
      ],
      order: [['createdAt', 'DESC']],
      offset,
      limit: parsedLimit
    });

    console.log('Reviews fetched:', rows.length, 'Total:', count);
    res.json({ reviews: rows, totalReviews: count });
  } catch (error) {
    console.error('Error in getProfessionalReviews:', error.message, error.stack);
    next(error);
  }
};

exports.getClientReviews = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    
    const reviews = await db.reviews.findAll({
      where: { ClientId: clientId },
      include: [
        {
          model: db.professionals,
          as: 'Professional',
          include: [{
            model: db.users,
            as: 'User',
            attributes: ['FirstName', 'LastName']
          }]
        },
        {
          model: db.appointments,
          as: 'Appointment',
          include: [{
            model: db.services,
            as: 'Service',
            attributes: ['Name']
          }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0 ? 
      reviews.reduce((sum, r) => sum + r.Rating, 0) / totalReviews : 0;
    
    res.json({
      reviews,
      totalReviews,
      averageRating
    });
  } catch (error) {
    next(error);
  }
};

exports.getReviewById = async (req, res, next) => {
  try {
    const review = await db.reviews.findByPk(req.params.id, {
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
        },
        {
          model: db.appointments,
          as: 'Appointment',
          attributes: ['AppointmentId', 'StartTime']
        }
      ]
    });
    
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.json(review);
  } catch (error) {
    next(error);
  }
};

exports.updateReview = async (req, res, next) => {
  try {
    const review = await db.reviews.findByPk(req.params.id);
    if (!review) return res.status(404).json({ message:'Review not found' });

    if (req.user.UserId !== review.ClientId)
      return res.status(403).json({ message:'Not authorized to update this review' });

    if (req.body.Rating && (req.body.Rating < 1 || req.body.Rating > 5))
      return res.status(400).json({ message:'Rating must be between 1 and 5' });

    await review.update(req.body);
    res.json(review);
  } catch (err) { next(err); }
};

exports.deleteReview = async (req, res, next) => {
  try {
    const review = await db.reviews.findByPk(req.params.id);
    if (!review) return res.status(404).json({ message:'Review not found' });

    if (req.user.UserId !== review.ClientId)
      return res.status(403).json({ message:'Not authorized to delete this review' });

    await review.destroy();
    res.status(204).end();
  } catch (err) { next(err); }
};
