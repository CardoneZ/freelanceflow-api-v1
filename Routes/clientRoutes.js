const express = require('express');
const router = express.Router();
const clientController = require('../Controller/clientController');
const authMiddleware = require('../Middlewares/authMiddleware');

// All client routes require authentication
router.use(authMiddleware.authenticate);

router.get('/', clientController.getAllClients); 
router.get('/:id', clientController.getClientById); 
router.get('/:id/appointments', clientController.getClientAppointments);
router.get('/user/:userId', clientController.getClientByUserId);

module.exports = router;