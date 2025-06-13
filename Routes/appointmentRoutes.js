const express     = require('express');
const router      = express.Router();

const apptCtrl    = require('../Controller/appointmentController');
const auth        = require('../Middlewares/authMiddleware');
const roles       = require('../constants/roles');         // ← NUEVO

/*  Crear cita  */
router.post(
  '/',
  auth.authenticate,
  auth.authorize([roles.CLIENT, roles.ADMIN]),             // 👈
  apptCtrl.createAppointment
);

/*  Cambiar estado de la cita  */
router.patch(
  '/:id/status',
  auth.authenticate,
  auth.authorize([roles.PROFESSIONAL, roles.ADMIN]),       // 👈
  apptCtrl.updateAppointmentStatus
);

/*  Resto de endpoints  */
router.get('/',              apptCtrl.getAllAppointments);
router.get('/:id',           apptCtrl.getAppointmentById);
router.delete(
  '/:id',
  auth.authenticate,
  auth.authorize([roles.PROFESSIONAL, roles.ADMIN]),       // opcional
  apptCtrl.cancelAppointment
);
router.get(
  '/upcoming/me',
  auth.authenticate,
  apptCtrl.getUpcomingAppointments
);
router.patch(
  '/:id/complete',
  auth.authenticate,
  auth.authorize([roles.PROFESSIONAL, roles.ADMIN]),       // opcional
  apptCtrl.completeAppointment
);

module.exports = router;
