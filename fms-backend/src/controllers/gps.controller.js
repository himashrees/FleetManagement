const { GpsLog, Vehicle } = require('../models');
const { Op } = require('sequelize');

exports.pushLocation = async (req, res) => {
  try {
    const { vehicle_id, latitude, longitude, speed_kmh, heading, altitude_m } = req.body;
    const log = await GpsLog.create({ vehicle_id, latitude, longitude, speed_kmh, heading, altitude_m });
    const io = req.app.get('io');
    if (io) io.to(`vehicle_${vehicle_id}`).emit('location_update', { vehicle_id, latitude, longitude, speed_kmh });
    return res.status(201).json({ success: true, data: log });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAllLatestPositions = async (req, res) => {
  try {
    const vehicles = await Vehicle.findAll({ where: { status: 'active' }, attributes: ['id','registration_no'] });
    const results = [];
    for (const v of vehicles) {
      const latest = await GpsLog.findOne({ where: { vehicle_id: v.id }, order: [['logged_at','DESC']] });
      if (latest) results.push({ vehicle: v, position: latest });
    }
    return res.json({ success: true, data: results });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getVehicleHistory = async (req, res) => {
  try {
    const { from, to } = req.query;
    const where = { vehicle_id: req.params.id };
    if (from && to) where.logged_at = { [Op.between]: [new Date(from), new Date(to)] };
    const logs = await GpsLog.findAll({ where, order: [['logged_at','ASC']], limit: 1000 });
    return res.json({ success: true, data: logs });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};