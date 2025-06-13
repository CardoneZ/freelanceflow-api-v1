const express        = require('express');
const router         = express.Router();

const authCtrl       = require('../Controller/authController');
const auth           = require('../Middlewares/authMiddleware');
const roles          = require('../constants/roles');            // ← NEW

router.post('/register', authCtrl.register);
router.post('/login',    authCtrl.login);
router.get ('/me',       authCtrl.getMe);


router.put(
  '/upgrade-to-professional',
  auth.authenticate,
  auth.authorize([roles.CLIENT]),                               // 👈
  authCtrl.upgradeToProfessional
);

module.exports = router;
