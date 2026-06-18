const bcrypt = require('bcryptjs');
const { Driver, User, Vehicle, Trip } = require('../models');
const { computeDriverSafetyScore } = require('../utils/scoring');

exports.getAll = async (req, res) => {
  try {
    const drivers = await Driver.findAll({
      include: [
        { model: User,    as: 'user',            attributes: ['name','email','phone'] },
        { model: Vehicle, as: 'assignedVehicle', attributes: ['registration_no','make','model'] },
        { model: Trip,    as: 'trips',           attributes: ['id','status'], required: false },
      ],
    });

    const data = drivers.map(d => {
      const plain = d.toJSON();
      const completedTripCount = (plain.trips || []).filter(t => t.status === 'completed').length;
      const { safety_score, safety_level } = computeDriverSafetyScore(plain, completedTripCount);
      delete plain.trips; // not needed on the list response
      return { ...plain, safety_score, safety_level, completed_trips: completedTripCount };
    });

    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const driver = await Driver.findByPk(req.params.id, {
      include: [
        { model: User,    as: 'user', attributes: ['name','email','phone'] },
        { model: Vehicle, as: 'assignedVehicle', attributes: ['registration_no','make','model'] },
        { model: Trip,    as: 'trips', attributes: ['id','status'], required: false },
      ],
    });
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    const plain = driver.toJSON();
    const completedTripCount = (plain.trips || []).filter(t => t.status === 'completed').length;
    const scoreInfo = computeDriverSafetyScore(plain, completedTripCount);

    return res.json({ success: true, data: { ...plain, ...scoreInfo, completed_trips: completedTripCount } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Create a driver.
 *
 * Two ways to call this:
 *  1. Pass `user_id` directly to link an existing User account (legacy/advanced).
 *  2. Pass `name` (+ optional email/phone) to auto-create a brand new User
 *     account with role "driver" and link the new Driver to it. This is the
 *     normal path used by the "Add Driver" form — no need to know user IDs.
 */
exports.create = async (req, res) => {
  try {
    const { name, email, phone, user_id, ...driverFields } = req.body;
    let finalUserId = user_id;

    if (!finalUserId) {
      if (!name) {
        return res.status(400).json({ success: false, message: 'Driver name is required' });
      }
      const driverEmail = email || `driver.${driverFields.license_number || Date.now()}@fleetos.local`.toLowerCase().replace(/\s+/g, '');
      const existing = await User.findOne({ where: { email: driverEmail } });
      if (existing) {
        return res.status(400).json({ success: false, message: `A user with email ${driverEmail} already exists. Provide a different email.` });
      }
      const tempPassword = await bcrypt.hash('Driver@123', 12);
      const newUser = await User.create({
        name,
        email: driverEmail,
        password: tempPassword,
        role: 'driver',
        phone: phone || null,
      });
      finalUserId = newUser.id;
    }

    const driver = await Driver.create({ ...driverFields, user_id: finalUserId });
    const result = await Driver.findByPk(driver.id, {
      include: [
        { model: User,    as: 'user', attributes: ['name','email','phone'] },
        { model: Vehicle, as: 'assignedVehicle', attributes: ['registration_no','make','model'] },
      ],
    });
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Update a driver. If `name`, `email`, or `phone` are present in the body,
 * the linked User account is updated too — this is how you "rename" a driver.
 */
exports.update = async (req, res) => {
  try {
    const { name, email, phone, ...driverFields } = req.body;
    const driver = await Driver.findByPk(req.params.id);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    if (Object.keys(driverFields).length > 0) {
      await driver.update(driverFields);
    }

    if (name || email || phone) {
      const user = await User.findByPk(driver.user_id);
      if (user) {
        const userUpdates = {};
        if (name)  userUpdates.name  = name;
        if (email) userUpdates.email = email;
        if (phone) userUpdates.phone = phone;
        await user.update(userUpdates);
      }
    }

    const result = await Driver.findByPk(driver.id, {
      include: [
        { model: User,    as: 'user', attributes: ['name','email','phone'] },
        { model: Vehicle, as: 'assignedVehicle', attributes: ['registration_no','make','model'] },
      ],
    });
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.assignVehicle = async (req, res) => {
  try {
    const driver = await Driver.findByPk(req.params.id);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
    await driver.update({ assigned_vehicle_id: req.body.vehicle_id });
    return res.json({ success: true, message: 'Vehicle assigned' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const driver = await Driver.findByPk(req.params.id);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
    await driver.destroy();
    return res.json({ success: true, message: 'Driver deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};