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

// Sequelize's DATEONLY/DECIMAL/FLOAT types don't accept '' as "no value" —
// they try to coerce it into the target type and produce something MySQL
// then rejects (e.g. "Incorrect date value: 'Invalid date'" or "Incorrect
// decimal value: ''"). Blank form inputs submit '' rather than null/
// undefined, so we normalize those empty strings to null before they ever
// reach Sequelize.
const DATE_FIELDS = ['scheduled_date', 'completed_date', 'next_due_date'];
const NUMERIC_FIELDS = ['cost', 'odometer_km', 'next_due_km'];
const sanitizeBody = (body) => {
  const clean = { ...body };
  for (const field of [...DATE_FIELDS, ...NUMERIC_FIELDS]) {
    if (clean[field] === '') clean[field] = null;
  }
  return clean;
};

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
    const record = await Maintenance.create(sanitizeBody(req.body));
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
    await record.update(sanitizeBody(req.body));
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