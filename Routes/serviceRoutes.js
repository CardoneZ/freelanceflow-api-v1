const express     = require('express');
const router      = express.Router();

const ctrl        = require('../Controller/serviceController');
const auth        = require('../Middlewares/authMiddleware');
const roles       = require('../constants/roles');              // ← NEW

/* públicas */
router.get('/',  ctrl.getAllServices);
router.get('/:id', ctrl.getServiceById);
router.get('/:serviceId/validate-duration/:duration', ctrl.validateDuration);

/* protegidas */
router.post(
  '/',
  auth.authenticate,
  auth.authorize([roles.PROFESSIONAL, roles.ADMIN]),            // 👈
  ctrl.createService
);

router.put(
  '/:id',
  auth.authenticate,
  auth.authorize([roles.PROFESSIONAL, roles.ADMIN]),            // 👈
  ctrl.updateService
);

router.delete(
  '/:id',
  auth.authenticate,
  auth.authorize([roles.PROFESSIONAL, roles.ADMIN]),            // 👈
  ctrl.deleteService
);

router.get('/professionals/:id/services', 
  auth.authenticate, 
  auth.authorize([roles.PROFESSIONAL, roles.ADMIN]), 
  ctrl.getAllServices
);


module.exports = router;
