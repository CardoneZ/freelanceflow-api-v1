const express     = require('express');
const router      = express.Router();

const ctrl        = require('../Controller/professionalController');
const auth        = require('../Middlewares/authMiddleware');
const roles       = require('../constants/roles');              // ← NEW

/* públicas */
router.get('/',    ctrl.getAllProfessionals);
router.get('/:id', ctrl.getProfessionalById);

/* protegidas */
router.post(
  '/',
  auth.authenticate,
  auth.authorize([roles.ADMIN]),                                // 👈
  ctrl.createProfessional
);

router.put(
  '/:id',
  auth.authenticate,
  auth.authorize([roles.ADMIN, roles.PROFESSIONAL]),            // 👈
  ctrl.updateProfessional
);

router.get('/:id/services', ctrl.getProfessionalServices);
router.get('/:id/stats',    ctrl.getProfessionalStats);

module.exports = router;
