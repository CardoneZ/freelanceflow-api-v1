const express     = require('express');
const router      = express.Router();

const ctrl        = require('../Controller/availabilityController');
const auth        = require('../Middlewares/authMiddleware');
const roles       = require('../constants/roles');              // ← NEW

/* públicas */
router.get('/:id', ctrl.getProfessionalAvailability);

/* protegidas */
router.post(
  '/:id',
  auth.authenticate,
  auth.authorize([roles.ADMIN, roles.PROFESSIONAL]),            // 👈
  ctrl.createAvailability
);

router.put(
  '/:id',
  auth.authenticate,
  auth.authorize([roles.ADMIN, roles.PROFESSIONAL]),            // 👈
  ctrl.updateAvailability
);

router.delete(
    '/:id/:slotId',
    auth.authenticate,
    auth.authorize([roles.ADMIN, roles.PROFESSIONAL]),
    ctrl.deleteAvailability
);

module.exports = router;
