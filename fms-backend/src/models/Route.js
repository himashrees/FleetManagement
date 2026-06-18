const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Route = sequelize.define('Route', {
  id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name:           { type: DataTypes.STRING(100), allowNull: false },
  origin:         { type: DataTypes.STRING(200) },
  destination:    { type: DataTypes.STRING(200) },
  distance_km:    { type: DataTypes.FLOAT },
  estimated_mins: { type: DataTypes.INTEGER },
  waypoints:      { type: DataTypes.JSON },
  is_active:      { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'routes', timestamps: true });

module.exports = Route;