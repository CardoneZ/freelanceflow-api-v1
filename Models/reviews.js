const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('reviews', {
    ReviewId: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    AppointmentId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'appointments',
        key: 'AppointmentId'
      },
      unique: "fk_review_appt"
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
    Rating: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false
    },
    Comment: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'reviews',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "ReviewId" },
        ]
      },
      {
        name: "uq_reviews_appointment",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "AppointmentId" },
        ]
      },
      {
        name: "fk_review_professional",
        using: "BTREE",
        fields: [
          { name: "ProfessionalId" },
        ]
      },
      {
        name: "fk_review_client",
        using: "BTREE",
        fields: [
          { name: "ClientId" },
        ]
      },
    ]
  });
};
