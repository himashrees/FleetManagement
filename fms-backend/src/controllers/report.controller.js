const { Trip, FuelLog, Maintenance, Vehicle, Driver } = require('../models');
const { Op } = require('sequelize');

exports.fleetSummary = async (req, res) => {
  try {
    const totalVehicles    = await Vehicle.count();
    const activeVehicles   = await Vehicle.count({ where: { status: 'active' } });
    const totalDrivers     = await Driver.count();
    const availableDrivers = await Driver.count({ where: { status: 'available' } });
    const tripsToday       = await Trip.count({ where: { createdAt: { [Op.gte]: new Date(new Date().setHours(0,0,0,0)) } } });
    const maintenanceDue   = await Maintenance.count({ where: { status: 'scheduled', scheduled_date: { [Op.lte]: new Date() } } });
    return res.json({ success: true, data: { totalVehicles, activeVehicles, totalDrivers, availableDrivers, tripsToday, maintenanceDue } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.fuelReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const where = {};
    if (from && to) where.filled_at = { [Op.between]: [new Date(from), new Date(to)] };
    const logs = await FuelLog.findAll({ where });
    const totalLitres = logs.reduce((s, l) => s + l.litres, 0).toFixed(2);
    const totalCost   = logs.reduce((s, l) => s + parseFloat(l.total_cost || 0), 0).toFixed(2);
    return res.json({ success: true, data: { totalLitres, totalCost, records: logs.length } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.tripReport = async (req, res) => {
  try {
    const { from, to, driver_id } = req.query;
    const where = { status: 'completed' };
    if (driver_id) where.driver_id = driver_id;
    if (from && to) where.start_time = { [Op.between]: [new Date(from), new Date(to)] };
    const trips = await Trip.findAll({ where });
    const totalKm = trips.reduce((s, t) => s + (t.distance_km || 0), 0).toFixed(2);
    return res.json({ success: true, data: { totalTrips: trips.length, totalKm, trips } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};