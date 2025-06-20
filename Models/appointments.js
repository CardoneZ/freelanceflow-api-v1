const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('appointments', {
    AppointmentId: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    ServiceId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'services',
        key: 'ServiceId'
      }
    },
    ProfessionalId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'professionals',
        key: 'ProfessionalId'
      }
    },
    ClientId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'clients',
        key: 'ClientId'
      }
    },
    StartTime: {
      type: DataTypes.DATE,
      allowNull: false
    },
    DurationMinutes: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    EndTime: {
      type: DataTypes.DATE,
      allowNull: true
    },
    Status: {
      type: DataTypes.ENUM('pending','confirmed','completed','cancelled'),
      allowNull: false,
      defaultValue: "pending"
    },
    Notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'appointments',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "AppointmentId" },
        ]
      },
      {
        name: "idx_appt_service",
        using: "BTREE",
        fields: [
          { name: "ServiceId" },
        ]
      },
      {
        name: "idx_appt_client",
        using: "BTREE",
        fields: [
          { name: "ClientId" },
        ]
      },
      {
        name: "idx_appt_professional",
        using: "BTREE",
        fields: [
          { name: "ProfessionalId" },
        ]
      },
      {
        name: "idx_appt_start_time",
        using: "BTREE",
        fields: [
          { name: "StartTime" },
        ]
      },
    ]
  });
};
