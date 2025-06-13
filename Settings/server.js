require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('../Models');
const { authenticate } = require('../Middlewares/authMiddleware');

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
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static('public'));
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
  listen () {
    db.sequelize.sync({ force: true })  // ¡Cuidado! Esto eliminará las tablas existentes
      .then(() => {
        this.app.listen(this.port, () =>
          console.log(`Servidor escuchando en puerto ${this.port}`)
        );
      })
      .catch(err => console.error('Database connection error:', err));
  }
}

module.exports = Server;
