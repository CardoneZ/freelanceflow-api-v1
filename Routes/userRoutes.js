const express     = require('express');
const router      = express.Router();

const ctrl        = require('../Controller/userController');
const auth        = require('../Middlewares/authMiddleware');
const roles       = require('../constants/roles');              // ← NEW

/* admin list */
router.get(
  '/',
  auth.authenticate,
  auth.authorize([roles.ADMIN]),                                // 👈
  ctrl.getAllUsers
);

/* cada usuario puede leerse / actualizarse a sí mismo;
   eliminar, solo admin */
router.get('/:id',  auth.authenticate,           ctrl.getUserById);

router.put(
  '/:id',
  auth.authenticate,
  ctrl.updateUser                                  // (validación dentro del ctrl)
);

router.delete(
  '/:id',
  auth.authenticate,
  auth.authorize([roles.ADMIN]),                  // 👈
  ctrl.deleteUser
);

module.exports = router;
