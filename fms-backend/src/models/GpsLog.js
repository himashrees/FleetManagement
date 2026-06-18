const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const GpsLog = sequelize.define('GpsLog', {
  id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  vehicle_id: { type: DataTypes.INTEGER, allowNull: false },
  latitude:   { type: DataTypes.DECIMAL(10, 8), allowNull: false },
  longitude:  { type: DataTypes.DECIMAL(11, 8), allowNull: false },
  speed_kmh:  { type: DataTypes.FLOAT, defaultValue: 0 },
  heading:    { type: DataTypes.FLOAT },
  altitude_m: { type: DataTypes.FLOAT },
  accuracy_m: { type: DataTypes.FLOAT },
  logged_at:  { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'gps_logs', timestamps: false });

module.exports = GpsLog;