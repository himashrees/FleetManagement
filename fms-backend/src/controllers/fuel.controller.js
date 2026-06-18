const { FuelLog, Driver } = require('../models');
const { Op } = require('sequelize');

exports.getAll = async (req, res) => {
  try {
    const { vehicle_id, from, to } = req.query;
    const where = {};
    if (from && to) where.filled_at = { [Op.between]: [new Date(from), new Date(to)] };

    // If driver, scope to their assigned vehicle only
    if (req.session.user?.role === 'driver') {
      const driverRecord = await Driver.findOne({ where: { user_id: req.session.user.id } });
      if (driverRecord?.assigned_vehicle_id) {
        where.vehicle_id = driverRecord.assigned_vehicle_id;
      } else {
        return res.json({ success: true, data: [] });
      }
    } else {
      if (vehicle_id) where.vehicle_id = vehicle_id;
    }

    const logs = await FuelLog.findAll({ where, order: [['filled_at','DESC']] });
    return res.json({ success: true, data: logs });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { litres, cost_per_litre } = req.body;
    const total_cost = (litres * cost_per_litre).toFixed(2);
    const log = await FuelLog.create({ ...req.body, total_cost });
    return res.status(201).json({ success: true, data: log });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const logs = await FuelLog.findAll({ where: { vehicle_id: req.params.vehicle_id } });
    const totalLitres = logs.reduce((s, l) => s + l.litres, 0);
    const totalCost   = logs.reduce((s, l) => s + parseFloat(l.total_cost || 0), 0);
    return res.json({ success: true, data: { totalLitres, totalCost, entries: logs.length } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await FuelLog.destroy({ where: { id: req.params.id } });
    return res.json({ success: true, message: 'Fuel log deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};