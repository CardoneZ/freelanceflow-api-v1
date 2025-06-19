const express = require('express');
const router = express.Router();

const ctrl = require('../Controller/availabilityController');
const auth = require('../Middlewares/authMiddleware');
const roles = require('../Constants/roles');

/* públicas */
router.get('/:professionalId', ctrl.getProfessionalAvailability);

/* protegidas */
router.post(
  '/:professionalId',
  auth.authenticate,
  auth.authorize([roles.ADMIN, roles.PROFESSIONAL]),
  ctrl.createAvailability
);

router.put(
  '/:professionalId/:slotId',
  auth.authenticate,
  auth.authorize([roles.ADMIN, roles.PROFESSIONAL]),
  ctrl.updateAvailability
);

router.delete(
  '/:professionalId/:slotId',
  auth.authenticate,
  auth.authorize([roles.ADMIN, roles.PROFESSIONAL]),
  ctrl.deleteAvailability
);

router.get(
  '/:professionalId/:slotId',
  auth.authenticate,
  auth.authorize([roles.ADMIN, roles.PROFESSIONAL]),
  ctrl.getAvailabilitySlot
);

module.exports = router;