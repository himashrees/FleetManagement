const bcrypt = require('bcryptjs');
const { User } = require('../models');

// Get all users (admin only)
exports.getAll = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password', 'reset_token', 'reset_token_expiry'] },
      order: [['createdAt', 'DESC']],
    });
    return res.status(200).json({ success: true, data: users });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Get single user
exports.getById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password', 'reset_token', 'reset_token_expiry'] },
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.status(200).json({ success: true, data: user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Create user (admin only)
exports.create = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ success: false, message: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hashedPassword, role, phone, is_active: true });

    const { password: _pw, ...userData } = user.toJSON();
    return res.status(201).json({ success: true, data: userData });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Update user details (admin only) — name, email, role, phone
exports.update = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const { name, email, role, phone } = req.body;
    if (email && email !== user.email) {
      const existing = await User.findOne({ where: { email } });
      if (existing) return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    await user.update({ name, email, role, phone });
    const { password: _pw, ...userData } = user.toJSON();
    return res.status(200).json({ success: true, data: userData });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Toggle active/inactive (deactivate / reactivate)
exports.toggleActive = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Prevent admin from deactivating themselves
    if (user.id === req.session.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own account' });
    }

    user.is_active = !user.is_active;
    await user.save();
    return res.status(200).json({ success: true, data: { id: user.id, is_active: user.is_active } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Admin resets a user's password directly (no email flow)
exports.adminResetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.password = await bcrypt.hash(newPassword, 12);
    user.reset_token = null;
    user.reset_token_expiry = null;
    await user.save();

    return res.status(200).json({ success: true, message: `Password reset for ${user.email}` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Assign / change role
exports.assignRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'manager', 'driver'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.id === req.session.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot change your own role' });
    }

    user.role = role;
    await user.save();
    return res.status(200).json({ success: true, data: { id: user.id, role: user.role } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Delete user permanently
exports.remove = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.id === req.session.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    }
    await user.destroy();
    return res.status(200).json({ success: true, message: 'User deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};