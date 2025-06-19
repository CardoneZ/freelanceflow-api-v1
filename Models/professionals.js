const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('professionals', {
    ProfessionalId: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    UserId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'users',
        key: 'UserId'
      },
      unique: "fk_prof_user"
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
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "ProfessionalId" },
        ]
      },
      {
        name: "uq_prof_user",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "UserId" },
        ]
      },
      {
        name: "idx_professionals_user",
        using: "BTREE",
        fields: [
          { name: "UserId" },
        ]
      },
    ]
  });
};
