const { Alert, Vehicle, Driver, User } = require('../models');
const { Op } = require('sequelize');
const { runAllChecks } = require('../utils/alertChecker');

const driverInclude = [
  { model: Vehicle, as: 'vehicle', attributes: ['registration_no'], required: false },
  { model: Driver,  as: 'driver',  attributes: ['id', 'license_number'], required: false },
  { model: Driver,  as: 'assignedDriver', attributes: ['id', 'license_number'],
    include: [{ model: User, as: 'user', attributes: ['name', 'phone'] }], required: false },
];

exports.getAll = async (req, res) => {
  try {
    const { is_read, severity } = req.query;
    const where = {};
    if (is_read !== undefined) where.is_read = is_read === 'true';
    if (severity) where.severity = severity;

    if (req.session.user?.role === 'driver') {
      const driverRecord = await Driver.findOne({ where: { user_id: req.session.user.id } });
      if (!driverRecord) return res.json({ success: true, data: [] });
      // Driver sees alerts assigned to them OR alerts about them
      where[Op.or] = [
        { assigned_driver_id: driverRecord.id },
        { driver_id: driverRecord.id },
      ];
    }

    const alerts = await Alert.findAll({
      where,
      include: driverInclude,
      order: [['createdAt', 'DESC']],
    });
    return res.json({ success: true, data: alerts });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const payload = { ...req.body };

    // If the alert is tied to a driver but no vehicle was specified
    // (e.g. driver-submitted issue reports), fall back to the
    // driver's currently assigned vehicle so it still shows up in the table.
    if (!payload.vehicle_id && payload.driver_id) {
      const driver = await Driver.findByPk(payload.driver_id);
      if (driver?.assigned_vehicle_id) {
        payload.vehicle_id = driver.assigned_vehicle_id;
      }
    }

    const alert = await Alert.create(payload);
    const io = req.app.get('io');
    if (io) io.emit('new_alert', alert);
    return res.status(201).json({ success: true, data: alert });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.markRead = async (req, res) => {
  try {
    await Alert.update({ is_read: true }, { where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    await Alert.update({ is_read: true }, { where: { is_read: false } });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Admin assigns an available driver to act on an alert
exports.assignDriver = async (req, res) => {
  try {
    const { driver_id, note } = req.body;
    if (!driver_id) return res.status(400).json({ success: false, message: 'driver_id required' });

    const driver = await Driver.findByPk(driver_id, {
      include: [{ model: User, as: 'user', attributes: ['name'] }],
    });
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
    if (driver.status !== 'available')
      return res.status(400).json({ success: false, message: 'Driver is not available' });

    const alert = await Alert.findByPk(req.params.id);
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });

    await alert.update({
      assigned_driver_id: driver_id,
      assigned_at: new Date(),
      assignment_note: note || null,
      is_read: true,
    });

    // Push real-time notification to the driver
    const io = req.app.get('io');
    if (io) {
      io.emit('driver_notification', {
        driver_id,
        alert_id: alert.id,
        title: alert.title,
        message: note || alert.message,
        severity: alert.severity,
        type: alert.type,
        assigned_at: new Date(),
      });
    }

    const updated = await Alert.findByPk(req.params.id, { include: driverInclude });
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Driver acknowledges they received and acted on the assignment
exports.acknowledge = async (req, res) => {
  try {
    const driverRecord = await Driver.findOne({ where: { user_id: req.session.user.id } });
    if (!driverRecord) return res.status(403).json({ success: false, message: 'Not a driver' });

    const alert = await Alert.findByPk(req.params.id);
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
    if (alert.assigned_driver_id !== driverRecord.id)
      return res.status(403).json({ success: false, message: 'Not assigned to you' });

    await alert.update({ driver_acknowledged: true, acknowledged_at: new Date() });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.checkExpiry = async (req, res) => {
  try {
    const io = req.app.get('io');
    const result = await runAllChecks(io);
    return res.json({ success: true, message: `Created ${result.created} new alert(s)`, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.resolve = async (req, res) => {
  try {
    await Alert.update({ resolved_at: new Date(), is_read: true }, { where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await Alert.destroy({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};