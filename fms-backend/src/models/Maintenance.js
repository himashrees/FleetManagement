const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Maintenance = sequelize.define('Maintenance', {
  id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  vehicle_id:     { type: DataTypes.INTEGER, allowNull: false },
  type:           { type: DataTypes.ENUM('oil_change','tire','brake','engine','electrical','body','other'), defaultValue: 'other' },
  description:    { type: DataTypes.TEXT },
  status:         { type: DataTypes.ENUM('scheduled','in_progress','completed','cancelled'), defaultValue: 'scheduled' },
  scheduled_date: { type: DataTypes.DATEONLY },
  completed_date: { type: DataTypes.DATEONLY },
  cost:           { type: DataTypes.DECIMAL(10,2) },
  odometer_km:    { type: DataTypes.FLOAT },
  workshop_name:  { type: DataTypes.STRING(100) },
  next_due_km:    { type: DataTypes.FLOAT },
  next_due_date:  { type: DataTypes.DATEONLY },
}, { tableName: 'maintenance', timestamps: true });

module.exports = Maintenance;