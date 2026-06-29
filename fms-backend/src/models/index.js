const sequelize = require('../config/database');
const User        = require('./User');
const Vehicle     = require('./Vehicle');
const Driver      = require('./Driver');
const GpsLog      = require('./GpsLog');
const Route       = require('./Route');
const FuelLog     = require('./FuelLog');
const Maintenance = require('./Maintenance');
const Document    = require('./Document');
const Trip        = require('./Trip');
const Alert       = require('./Alert');

User.hasOne(Driver,    { foreignKey: 'user_id', as: 'driverProfile' });
Driver.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Vehicle.hasMany(Driver,   { foreignKey: 'assigned_vehicle_id', as: 'drivers' });
Driver.belongsTo(Vehicle, { foreignKey: 'assigned_vehicle_id', as: 'assignedVehicle' });

Vehicle.hasMany(GpsLog,   { foreignKey: 'vehicle_id', as: 'gpsLogs' });
GpsLog.belongsTo(Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });

Vehicle.hasMany(FuelLog,   { foreignKey: 'vehicle_id', as: 'fuelLogs' });
FuelLog.belongsTo(Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });

Vehicle.hasMany(Maintenance,   { foreignKey: 'vehicle_id', as: 'maintenanceLogs' });
Maintenance.belongsTo(Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });

Vehicle.hasMany(Document,  { foreignKey: 'vehicle_id', as: 'documents' });
Document.belongsTo(Vehicle,{ foreignKey: 'vehicle_id', as: 'vehicle' });

Driver.hasMany(Document,   { foreignKey: 'driver_id', as: 'documents' });
Document.belongsTo(Driver, { foreignKey: 'driver_id', as: 'driver' });

Vehicle.hasMany(Trip,   { foreignKey: 'vehicle_id', as: 'trips' });
Trip.belongsTo(Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });
Driver.hasMany(Trip,    { foreignKey: 'driver_id',  as: 'trips' });
Trip.belongsTo(Driver,  { foreignKey: 'driver_id',  as: 'driver' });
Route.hasMany(Trip,     { foreignKey: 'route_id',   as: 'trips' });
Trip.belongsTo(Route,   { foreignKey: 'route_id',   as: 'route' });

Vehicle.hasMany(Alert,   { foreignKey: 'vehicle_id', as: 'alerts' });
Alert.belongsTo(Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });
Driver.hasMany(Alert,    { foreignKey: 'driver_id',  as: 'alerts' });
Alert.belongsTo(Driver,  { foreignKey: 'driver_id',  as: 'driver' });
Driver.hasMany(Alert,    { foreignKey: 'assigned_driver_id', as: 'assignedAlerts' });
Alert.belongsTo(Driver,  { foreignKey: 'assigned_driver_id', as: 'assignedDriver' });

module.exports = { sequelize, User, Vehicle, Driver, GpsLog, Route, FuelLog, Maintenance, Document, Trip, Alert };