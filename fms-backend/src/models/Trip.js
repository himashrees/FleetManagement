const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Trip = sequelize.define('Trip', {
  id:                   { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  vehicle_id:           { type: DataTypes.INTEGER, allowNull: false },
  driver_id:            { type: DataTypes.INTEGER, allowNull: false },
  route_id:             { type: DataTypes.INTEGER },
  status:               { type: DataTypes.ENUM('planned','in_progress','completed','cancelled'), defaultValue: 'planned' },
  start_location:       { type: DataTypes.STRING(200) },
  end_location:         { type: DataTypes.STRING(200) },
  expected_start_time:  { type: DataTypes.DATE, allowNull: true },
  start_time:           { type: DataTypes.DATE },
  end_time:              { type: DataTypes.DATE },
  distance_km:          { type: DataTypes.FLOAT },
  start_odometer:       { type: DataTypes.FLOAT },
  end_odometer:         { type: DataTypes.FLOAT },
  fuel_used:            { type: DataTypes.FLOAT },
  notes:                { type: DataTypes.TEXT },
  purpose:              { type: DataTypes.STRING(200) },
}, { tableName: 'trips', timestamps: true });

module.exports = Trip;