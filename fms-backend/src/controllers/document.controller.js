const { Document } = require('../models');
const { Op } = require('sequelize');
const path = require('path');
const fs   = require('fs');

exports.getAll = async (req, res) => {
  try {
    const { vehicle_id, driver_id, type } = req.query;
    const where = {};
    if (vehicle_id) where.vehicle_id = vehicle_id;
    if (driver_id)  where.driver_id  = driver_id;
    if (type)       where.type       = type;
    const docs = await Document.findAll({ where, order: [['expiry_date','ASC']] });
    return res.json({ success: true, data: docs });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.upload = async (req, res) => {
  try {
    const file_path = req.file ? `/uploads/${req.file.filename}` : null;
    const doc = await Document.create({ ...req.body, file_path });
    return res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const doc = await Document.findByPk(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    if (doc.file_path) {
      const fullPath = path.join(__dirname, '../../', doc.file_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }
    await doc.destroy();
    return res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getExpiringDocuments = async (req, res) => {
  try {
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    const docs = await Document.findAll({
      where: { expiry_date: { [Op.lte]: thirtyDaysLater } },
      order: [['expiry_date','ASC']],
    });
    return res.json({ success: true, data: docs });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};