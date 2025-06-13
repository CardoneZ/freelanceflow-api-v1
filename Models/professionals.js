const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('professionals', {
    ProfessionalId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'users',
        key: 'UserId'
      }
    },
    Title: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    Bio: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    HourlyRate: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: true
    },
    Location: {
      type: DataTypes.STRING(100),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'professionals',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "ProfessionalId" },
        ]
      },
    ]
  });
};
