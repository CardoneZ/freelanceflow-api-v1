'use strict';

const fs        = require('fs');
const path      = require('path');
const Sequelize = require('sequelize');
const basename  = path.basename(__filename);
const env       = process.env.NODE_ENV || 'development';
const config    = require(__dirname + '/../Config/Config.json')[env];
const db        = {};

/* ───── conexión ───── */
const sequelize = config.use_env_variable
  ? new Sequelize(process.env[config.use_env_variable], config)
  : new Sequelize(config.database, config.username, config.password, config);

/* ───── carga dinámica de modelos ───── */
fs.readdirSync(__dirname)
  .filter(file =>
    file.indexOf('.') !== 0 &&
    file !== basename &&
    file.slice(-3) === '.js' &&
    !file.endsWith('.test.js'))
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

/* ───── asociaciones automáticas nativas (si algún modelo las define) ───── */
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) db[modelName].associate(db);
});

/* ──────────────────────────────────────────── */
/*        asociaciones manuales (alias)        */
/* ──────────────────────────────────────────── */
const {
  users,
  professionals,
  clients,
  services,
  appointments,
  reviews,
  availability      
} = db;

/* truco para evitar throw si un modelo faltara */
const has = m => Boolean(m);

/* Users ↔ Clients / Professionals */
if (has(users) && has(clients)) {
  users.hasOne(clients, { as: 'Client', foreignKey: 'ClientId' });
  clients.belongsTo(users, { as: 'User', foreignKey: 'ClientId' });
}
if (has(users) && has(professionals)) {
  users.hasOne(professionals, { as: 'Professional', foreignKey: 'ProfessionalId' });
  professionals.belongsTo(users, { as: 'User', foreignKey: 'ProfessionalId' });
}

/* Service ↔ Professional */
if (has(professionals) && has(services)) {
  professionals.hasMany(services, { as: 'services', foreignKey: 'ProfessionalId' });
  services.belongsTo(professionals, { as: 'Professional', foreignKey: 'ProfessionalId' });
}

/* Appointment ↔ Service / Client */
if (has(services) && has(appointments)) {
  services.hasMany(appointments, { as: 'Appointments', foreignKey: 'ServiceId' });
  appointments.belongsTo(services, { as: 'Service', foreignKey: 'ServiceId' });
}
if (has(clients) && has(appointments)) {
  clients.hasMany(appointments, { as: 'Appointments', foreignKey: 'ClientId' });
  appointments.belongsTo(clients, { as: 'Client', foreignKey: 'ClientId' });
}

/* Availability ↔ Professional */
if (has(professionals) && has(availability)) {
  professionals.hasMany(availability, { as: 'Availability', foreignKey: 'ProfessionalId' });
  availability.belongsTo(professionals, { as: 'Professional', foreignKey: 'ProfessionalId' });
}

/* Reviews ↔ Appointment / Professional / Client */
if (has(appointments) && has(reviews))
  appointments.hasOne(reviews, { as: 'Review', foreignKey: 'AppointmentId' });
if (has(reviews) && has(appointments))
  reviews.belongsTo(appointments, { as: 'Appointment', foreignKey: 'AppointmentId' });

if (has(professionals) && has(reviews)) {
  professionals.hasMany(reviews, { as: 'reviews', foreignKey: 'ProfessionalId' });
  reviews.belongsTo(professionals, { as: 'Professional', foreignKey: 'ProfessionalId' });
}
if (has(clients) && has(reviews)) {
  clients.hasMany(reviews, { as: 'ClientReviews', foreignKey: 'ClientId' });
  reviews.belongsTo(clients, { as: 'Client', foreignKey: 'ClientId' });
}

/* ───── exportar ───── */
db.sequelize = sequelize;
db.Sequelize = Sequelize;
module.exports = db;
