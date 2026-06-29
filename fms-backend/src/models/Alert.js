const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Alert = sequelize.define('Alert', {
  id:                 { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  vehicle_id:         { type: DataTypes.INTEGER },
  driver_id:          { type: DataTypes.INTEGER },
  assigned_driver_id: { type: DataTypes.INTEGER },   // driver assigned by admin to act on this alert
  assigned_at:        { type: DataTypes.DATE },
  assignment_note:    { type: DataTypes.TEXT },
  driver_acknowledged:{ type: DataTypes.BOOLEAN, defaultValue: false },
  acknowledged_at:    { type: DataTypes.DATE },
  type:        { type: DataTypes.ENUM('speeding','geofence','maintenance_due','document_expiry','fuel_low','accident','idle','other') },
  title:       { type: DataTypes.STRING(150) },
  message:     { type: DataTypes.TEXT },
  severity:    { type: DataTypes.ENUM('low','medium','high','critical'), defaultValue: 'medium' },
  is_read:     { type: DataTypes.BOOLEAN, defaultValue: false },
  resolved_at: { type: DataTypes.DATE },
  voice_note:  { type: DataTypes.TEXT },
}, { tableName: 'alerts', timestamps: true });

module.exports = Alert;