const express = require('express');
const router = express.Router();

const apptCtrl = require('../Controller/appointmentController');
const auth = require('../Middlewares/authMiddleware');
const roles = require('../Constants/roles');

// Endpoints protegidos
router.post('/', 
  auth.authenticate, 
  auth.authorize([roles.CLIENT, roles.ADMIN]),
  apptCtrl.createAppointment
);

router.get('/', 
  auth.authenticate,
  apptCtrl.getAllAppointments
);

router.get('/:id', 
  auth.authenticate,
  apptCtrl.getAppointmentById
);

router.patch('/:id/status', 
  auth.authenticate, 
  auth.authorize([roles.PROFESSIONAL, roles.ADMIN]),
  apptCtrl.updateAppointmentStatus
);

router.delete('/:id', 
  auth.authenticate,
  auth.authorize([roles.PROFESSIONAL, roles.CLIENT, roles.ADMIN]),
  apptCtrl.cancelAppointment
);

router.get('/upcoming/me', 
  auth.authenticate,
  apptCtrl.getUpcomingAppointments
);

router.patch('/:id/complete', 
  auth.authenticate,
  auth.authorize([roles.PROFESSIONAL, roles.ADMIN]),
  apptCtrl.completeAppointment
);

router.get('/client/:clientId', 
  auth.authenticate,
  apptCtrl.getClientAppointments
);

router.patch('/:id/cancel',
  auth.authenticate,
  auth.authorize(['client', 'admin']),
  apptCtrl.cancelAppointment
);

router.get('/reviewable', 
  auth.authenticate, 
  apptCtrl.getReviewableAppointments
);

module.exports = router;