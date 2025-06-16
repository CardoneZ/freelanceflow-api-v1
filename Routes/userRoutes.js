const express = require('express');
const router = express.Router();
const upload = require('../Config/multer.config'); 
const ctrl = require('../Controller/userController');
const auth = require('../Middlewares/authMiddleware');
const roles = require('../constants/roles');

/* admin list */
router.get(
  '/',
  auth.authenticate,
  auth.authorize([roles.ADMIN]),
  ctrl.getAllUsers
);

/* Endpoint para obtener el usuario actual */
router.get(
  '/me',
  auth.authenticate,
  ctrl.getCurrentUser
);

/* Endpoint para subir imagen de perfil */
router.post(
  '/me/profile-picture',
  auth.authenticate,
  upload.single('profilePicture'), // Usa el middleware de multer
  ctrl.uploadProfilePicture
);

/* cada usuario puede leerse / actualizarse a sí mismo */
router.get('/:id', auth.authenticate, ctrl.getUserById);
router.put('/:id', auth.authenticate, ctrl.updateUser);

/* eliminar, solo admin */
router.delete(
  '/:id',
  auth.authenticate,
  auth.authorize([roles.ADMIN]),
  ctrl.deleteUser
);

module.exports = router;