const { Alert, Vehicle, Driver } = require('../models');
const { runAllChecks } = require('../utils/alertChecker');

exports.getAll = async (req, res) => {
  try {
    const { is_read, severity } = req.query;
    const where = {};
    if (is_read !== undefined) where.is_read = is_read === 'true';
    if (severity)              where.severity = severity;

    // If driver, scope alerts to their driver_id only
    if (req.session.user?.role === 'driver') {
      const driverRecord = await Driver.findOne({ where: { user_id: req.session.user.id } });
      if (driverRecord) where.driver_id = driverRecord.id;
      else return res.json({ success: true, data: [] });
    }

    const alerts = await Alert.findAll({
      where,
      include: [
        { model: Vehicle, as: 'vehicle', attributes: ['registration_no'], required: false },
        { model: Driver,  as: 'driver',  attributes: ['id'],              required: false },
      ],
      order: [['createdAt','DESC']],
    });
    return res.json({ success: true, data: alerts });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const alert = await Alert.create(req.body);
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
    return res.json({ success: true, message: 'Marked as read' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    await Alert.update({ is_read: true }, { where: { is_read: false } });
    return res.json({ success: true, message: 'All marked as read' });
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