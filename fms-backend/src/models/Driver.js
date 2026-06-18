const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Driver = sequelize.define('Driver', {
  id:                  { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id:             { type: DataTypes.INTEGER, allowNull: false },
  license_number:      { type: DataTypes.STRING(50), allowNull: false, unique: true },
  license_expiry:      { type: DataTypes.DATEONLY },
  license_type:        { type: DataTypes.STRING(20) },
  experience_years:    { type: DataTypes.INTEGER, defaultValue: 0 },
  joining_date:        { type: DataTypes.DATEONLY },
  photo_url:           { type: DataTypes.STRING(500) },
  status:              { type: DataTypes.ENUM('available','on_trip','off_duty','suspended'), defaultValue: 'available' },
  address:             { type: DataTypes.TEXT },
  emergency_contact:   { type: DataTypes.STRING(20) },
  assigned_vehicle_id: { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'drivers', timestamps: true });

module.exports = Driver;