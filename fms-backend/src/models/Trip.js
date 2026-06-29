const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Trip = sequelize.define('Trip', {
  id:                { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  vehicle_id:        { type: DataTypes.INTEGER, allowNull: false },
  driver_id:         { type: DataTypes.INTEGER, allowNull: false },
  route_id:          { type: DataTypes.INTEGER },
  status:            { type: DataTypes.ENUM('planned','scheduled','in_progress','completed','cancelled'), defaultValue: 'planned' },
  start_location:    { type: DataTypes.STRING(200) },
  end_location:      { type: DataTypes.STRING(200) },
  start_time:        { type: DataTypes.DATE },
  end_time:          { type: DataTypes.DATE },
  distance_km:       { type: DataTypes.FLOAT },
  start_odometer:    { type: DataTypes.FLOAT },
  end_odometer:      { type: DataTypes.FLOAT },
  fuel_filled:       { type: DataTypes.BOOLEAN, defaultValue: false },
  fuel_used:         { type: DataTypes.FLOAT },
  fuel_cost:         { type: DataTypes.DECIMAL(10,2) },
  fuel_station:      { type: DataTypes.STRING(150) },
  toll_charges:      { type: DataTypes.DECIMAL(10,2) },
  toll_receipt_url:  { type: DataTypes.TEXT('long') },
  fuel_receipt_url:  { type: DataTypes.TEXT('long') },
  notes:             { type: DataTypes.TEXT },
  purpose:           { type: DataTypes.STRING(200) },
  reporting_time:    { type: DataTypes.DATE },
  priority:          { type: DataTypes.ENUM('low','normal','high','urgent'), defaultValue: 'normal' },
  estimated_distance:{ type: DataTypes.FLOAT },
  cargo_type:        { type: DataTypes.STRING(100) },
  cargo_weight:      { type: DataTypes.FLOAT },
  customer_name:     { type: DataTypes.STRING(150) },
  customer_phone:    { type: DataTypes.STRING(20) },
  pickup_address:    { type: DataTypes.STRING(255) },
}, { tableName: 'trips', timestamps: true });

module.exports = Trip;