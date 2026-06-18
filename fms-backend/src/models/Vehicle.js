const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Vehicle = sequelize.define('Vehicle', {
  id:               { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  registration_no:  { type: DataTypes.STRING(50), allowNull: false, unique: true },
  make:             { type: DataTypes.STRING(50) },
  model:            { type: DataTypes.STRING(50) },
  year:             { type: DataTypes.INTEGER },
  type:             { type: DataTypes.ENUM('truck','van','car','bus','bike'), defaultValue: 'car' },
  fuel_type:        { type: DataTypes.ENUM('petrol','diesel','electric','hybrid'), defaultValue: 'diesel' },
  status:           { type: DataTypes.ENUM('active','inactive','maintenance','retired'), defaultValue: 'active' },
  odometer_km:      { type: DataTypes.FLOAT, defaultValue: 0 },
  capacity_kg:      { type: DataTypes.FLOAT },
  color:            { type: DataTypes.STRING(30) },
  vin_number:       { type: DataTypes.STRING(100) },
  insurance_expiry: { type: DataTypes.DATEONLY },
  rc_expiry:        { type: DataTypes.DATEONLY },
  photo_url:        { type: DataTypes.TEXT },
}, { tableName: 'vehicles', timestamps: true });

module.exports = Vehicle;