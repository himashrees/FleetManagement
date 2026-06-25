// const { Maintenance, Vehicle } = require('../models');
// const { Op } = require('sequelize');

// exports.getAll = async (req, res) => {
//   try {
//     const { status, vehicle_id } = req.query;
//     const where = {};
//     if (status)     where.status     = status;
//     if (vehicle_id) where.vehicle_id = vehicle_id;
//     const records = await Maintenance.findAll({
//       where,
//       include: [{ model: Vehicle, as: 'vehicle', attributes: ['registration_no','make','model'] }],
//       order: [['scheduled_date','ASC']],
//     });
//     return res.json({ success: true, data: records });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// exports.getUpcoming = async (req, res) => {
//   try {
//     const records = await Maintenance.findAll({
//       where: { status: 'scheduled', scheduled_date: { [Op.gte]: new Date() } },
//       include: [{ model: Vehicle, as: 'vehicle', attributes: ['registration_no'] }],
//       order: [['scheduled_date','ASC']],
//       limit: 20,
//     });
//     return res.json({ success: true, data: records });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// exports.create = async (req, res) => {
//   try {
//     const record = await Maintenance.create(req.body);
//     return res.status(201).json({ success: true, data: record });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// exports.update = async (req, res) => {
//   try {
//     const record = await Maintenance.findByPk(req.params.id);
//     if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
//     await record.update(req.body);
//     return res.json({ success: true, data: record });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// exports.remove = async (req, res) => {
//   try {
//     await Maintenance.destroy({ where: { id: req.params.id } });
//     return res.json({ success: true, message: 'Deleted' });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };
const { Maintenance, Vehicle, Alert } = require('../models');
const { Op } = require('sequelize');

exports.getAll = async (req, res) => {
  try {
    const { status, vehicle_id } = req.query;
    const where = {};
    if (status)     where.status     = status;
    if (vehicle_id) where.vehicle_id = vehicle_id;
    const records = await Maintenance.findAll({
      where,
      include: [{ model: Vehicle, as: 'vehicle', attributes: ['registration_no','make','model'] }],
      order: [['scheduled_date','ASC']],
    });
    return res.json({ success: true, data: records });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getUpcoming = async (req, res) => {
  try {
    const records = await Maintenance.findAll({
      where: { status: 'scheduled', scheduled_date: { [Op.gte]: new Date() } },
      include: [{ model: Vehicle, as: 'vehicle', attributes: ['registration_no'] }],
      order: [['scheduled_date','ASC']],
      limit: 20,
    });
    return res.json({ success: true, data: records });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const record = await Maintenance.create(req.body);
    if (record.next_due_date) {
  await Alert.create({
    vehicle_id: record.vehicle_id,
    type: 'maintenance_due',
    title: 'Maintenance Scheduled',
    message: `Maintenance due on ${record.next_due_date}`,
    severity: 'medium'
  });
}
    return res.status(201).json({ success: true, data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const record = await Maintenance.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    await record.update(req.body);
    if (record.status === 'scheduled' && record.next_due_date) {
  await Alert.create({
    vehicle_id: record.vehicle_id,
    type: 'maintenance_due',
    title: 'Maintenance Reminder',
    message: `Maintenance due on ${record.next_due_date}`,
    severity: 'high'
  });
}
    return res.json({ success: true, data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await Maintenance.destroy({ where: { id: req.params.id } });
    return res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
