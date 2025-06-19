const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('availability', {
    AvailabilityId: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    ProfessionalId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'professionals',
        key: 'ProfessionalId'
      }
    },
    DayOfWeek: {
      type: DataTypes.ENUM('monday','tuesday','wednesday','thursday','friday','saturday','sunday'),
      allowNull: true
    },
    StartTime: {
      type: DataTypes.TIME,
      allowNull: false
    },
    EndTime: {
      type: DataTypes.TIME,
      allowNull: false
    },
    IsRecurring: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: 1
    },
    ValidFrom: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    ValidTo: {
      type: DataTypes.DATEONLY,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'availability',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "AvailabilityId" },
        ]
      },
      {
        name: "fk_availability_professional",
        using: "BTREE",
        fields: [
          { name: "ProfessionalId" },
        ]
      },
    ]
  });
};
