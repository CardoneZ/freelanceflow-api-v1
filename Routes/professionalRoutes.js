const express = require('express');
const router = express.Router();
const ctrl = require('../Controller/professionalController');
const auth = require('../Middlewares/authMiddleware');
const roles = require('../Constants/roles');
const availabilityController = require('../Controller/availabilityController');
const appointmentController = require('../Controller/appointmentController');

/* públicas */
router.get('/', ctrl.getAllProfessionals); // Default endpoint for all professionals
router.get('/clients', ctrl.getProfessionalsForClients); // New endpoint for clients
router.get('/:id', ctrl.getProfessionalById);
router.get('/:id/services', ctrl.getProfessionalServices);
router.get('/:id/stats', ctrl.getProfessionalStats);
router.get('/:id/availability', availabilityController.getProfessionalAvailability);
router.get('/:id/appointments', appointmentController.getAllAppointments);

/* protegidas */
router.post(
  '/',
  auth.authenticate,
  auth.authorize([roles.ADMIN]),
  ctrl.createProfessional
);

router.put(
  '/:id',
  auth.authenticate,
  auth.authorize([roles.ADMIN, roles.PROFESSIONAL]),
  ctrl.updateProfessional
);

router.get('/:id/stats', 
  auth.authenticate, 
  auth.authorize([roles.ADMIN, roles.PROFESSIONAL]),
  ctrl.getProfessionalStats
);

module.exports = router;