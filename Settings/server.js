require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('../Models');
const { authenticate } = require('../Middlewares/authMiddleware');
const path = require('path'); 

class Server {
  constructor () {
    this.app = express();
    this.port = process.env.PORT || 4000;

    this.paths = {
      auth: '/api/auth',
      appointments: '/api/appointments',
      clients: '/api/clients',
      professionals: '/api/professionals',
      services: '/api/services',
      reviews: '/api/reviews',
      users: '/api/users',
      availability : '/api/availability'
    };

    this.middlewares();
    this.routes();
  }

  /* -------- Middlewares -------- */
  middlewares () {

    this.app.use(cors({
      origin: 'http://127.0.0.1:5501',
      credentials: true}));

    this.app.use(express.json());
    this.app.use(express.static('public'));
    this.app.use('/uploads', express.static('public/uploads'));
  }

  /* -------- Rutas -------- */
  routes () {
    this.app.use(this.paths.auth, require('../Routes/authRoutes'));
    this.app.use(this.paths.appointments, require('../Routes/appointmentRoutes'));
    this.app.use(this.paths.clients, require('../Routes/clientRoutes.js'));
    this.app.use(this.paths.professionals, require('../Routes/professionalRoutes'));
    this.app.use(this.paths.services, require('../Routes/serviceRoutes'));
    this.app.use(this.paths.reviews, require('../Routes/reviewRoutes'));
    this.app.use(this.paths.users, require('../Routes/userRoutes'));
    this.app.use(this.paths.availability, require('../Routes/availabilityRoutes'));
  }

  /* -------- Arranque -------- */
  listen() {
 
  db.sequelize.sync() 
    .then(() => {

      this.app.listen(this.port, () => {
        console.log(`✅ Servidor activo en puerto ${this.port}`);
        console.log(`🔹 Modo: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔹 Database: ${db.sequelize.config.database}`);
      });
    })
    .catch(err => {
      console.error('❌ Error de conexión a la base:', err);
      process.exit(1);
    });
}
}

module.exports = Server;
