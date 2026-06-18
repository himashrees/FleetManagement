const { Vehicle, Maintenance, Driver } = require('../models');
const { Op } = require('sequelize');
const { computeVehicleHealthScore } = require('../utils/scoring');

exports.getAll = async (req, res) => {
  try {
    const { status, type, search } = req.query;
    const where = {};
    if (status) where.status = status;
    if (type)   where.type   = type;
    if (search) where.registration_no = { [Op.like]: `%${search}%` };

    const vehicles = await Vehicle.findAll({
      where,
      include: [{ model: Maintenance, as: 'maintenanceLogs', required: false }],
      order: [['createdAt', 'DESC']],
    });

    const data = vehicles.map(v => {
      const plain = v.toJSON();
      const { health_score, health_level } = computeVehicleHealthScore(plain, plain.maintenanceLogs || []);
      return { ...plain, health_score, health_level };
    });

    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const vehicle = await Vehicle.findByPk(req.params.id, {
      include: [
        { model: Maintenance, as: 'maintenanceLogs', required: false },
        { model: Driver, as: 'drivers', required: false, attributes: ['id', 'user_id', 'license_number', 'status'] },
      ],
    });
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });

    const plain = vehicle.toJSON();
    const scoreInfo = computeVehicleHealthScore(plain, plain.maintenanceLogs || []);

    return res.json({ success: true, data: { ...plain, ...scoreInfo } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const vehicle = await Vehicle.create(req.body);
    return res.status(201).json({
      success: true,
      data: vehicle
    });
  } catch (err) {

    console.log("========== VEHICLE ERROR ==========");
    console.log(err);
    console.log(err.errors);
    console.log("===================================");

    return res.status(500).json({
      success: false,
      message: err.message,
      errors: err.errors
    });
  }
};

exports.update = async (req, res) => {
  try {
    const vehicle = await Vehicle.findByPk(req.params.id);
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
    await vehicle.update(req.body);
    return res.json({ success: true, data: vehicle });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const vehicle = await Vehicle.findByPk(req.params.id);
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
    await vehicle.destroy();
    return res.json({ success: true, message: 'Vehicle deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};