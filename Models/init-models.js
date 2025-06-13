var DataTypes = require("sequelize").DataTypes;
var _appointments = require("./appointments");
var _availability = require("./availability");
var _clients = require("./clients");
var _professionals = require("./professionals");
var _reviews = require("./reviews");
var _services = require("./services");
var _users = require("./users");

function initModels(sequelize) {
  var appointments = _appointments(sequelize, DataTypes);
  var availability = _availability(sequelize, DataTypes);
  var clients = _clients(sequelize, DataTypes);
  var professionals = _professionals(sequelize, DataTypes);
  var reviews = _reviews(sequelize, DataTypes);
  var services = _services(sequelize, DataTypes);
  var users = _users(sequelize, DataTypes);

  reviews.belongsTo(appointments, { as: "Appointment", foreignKey: "AppointmentId"});
  appointments.hasOne(reviews, { as: "review", foreignKey: "AppointmentId"});
  appointments.belongsTo(clients, { as: "Client", foreignKey: "ClientId"});
  clients.hasMany(appointments, { as: "appointments", foreignKey: "ClientId"});
  availability.belongsTo(professionals, { as: "Professional", foreignKey: "ProfessionalId"});
  professionals.hasMany(availability, { as: "availabilities", foreignKey: "ProfessionalId"});
  services.belongsTo(professionals, { as: "Professional", foreignKey: "ProfessionalId"});
  professionals.hasMany(services, { as: "services", foreignKey: "ProfessionalId"});
  appointments.belongsTo(services, { as: "Service", foreignKey: "ServiceId"});
  services.hasMany(appointments, { as: "appointments", foreignKey: "ServiceId"});
  clients.belongsTo(users, { as: "Client", foreignKey: "ClientId"});
  users.hasOne(clients, { as: "client", foreignKey: "ClientId"});
  professionals.belongsTo(users, { as: "Professional", foreignKey: "ProfessionalId"});
  users.hasOne(professionals, { as: "professional", foreignKey: "ProfessionalId"});

  return {
    appointments,
    availability,
    clients,
    professionals,
    reviews,
    services,
    users,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
