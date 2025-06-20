const express = require('express');
const router = express.Router();
const clientController = require('../Controller/clientController');
const authMiddleware = require('../Middlewares/authMiddleware');


router.get('/', clientController.getAllClients); 
router.get('/:id', clientController.getClientById); 
router.get('/:id/appointments', clientController.getClientAppointments); 

// Add this new route
router.get('/user/:userId', 
  authMiddleware.authenticate,
  clientController.getClientByUserId
);

/* Crear cliente 
router.post('/',
    authMiddleware.authenticate,
    authMiddleware.authorize(['admin']),
    clientController.createClient);

// Actualizar cliente 
router.put('/:id',
    authMiddleware.authenticate,
    authMiddleware.authorize(['admin']),
    clientController.updateClient);

*/

module.exports = router;
