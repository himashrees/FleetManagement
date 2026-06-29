const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User, Driver } = require('../models');
const { sendPasswordResetEmail } = require('../utils/mailer');

/**
 * Register a new user.
 *
 * Roles & Permissions rule:
 *  - The very first user in the system (empty Users table) may register as
 *    "admin" — this is how you bootstrap your initial admin account.
 *  - After that, public self-registration is only allowed for the "driver"
 *    role. Creating "admin" or "manager" accounts requires an existing
 *    authenticated admin to do it on the user's behalf via
 *    POST /api/auth/register-staff (see exports.registerStaff below).
 *  - This prevents anyone from registering themselves as admin/manager
 *    through the public signup form.
 */
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    let { role } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ success: false, message: 'Email already registered' });

    const userCount = await User.count();
    if (userCount === 0) {
      role = 'admin'; // bootstrap: first account in the system becomes admin
    } else {
      role = 'driver'; // public registration can only ever create drivers
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hashedPassword, role, phone });
    return res.status(201).json({ success: true, data: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Register a staff account (admin or manager). Only callable by an existing
 * authenticated admin — gated by isAdmin middleware on the route.
 */
exports.registerStaff = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;
    if (!['admin', 'manager'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role must be admin or manager' });
    }
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ success: false, message: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hashedPassword, role, phone });
    return res.status(201).json({ success: true, data: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email, is_active: true } });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid email or password' });

    req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };

    // For driver accounts, attach their Driver record id so role middleware
    // can scope queries to "only this driver's own data" (e.g. their trips).
    if (user.role === 'driver') {
      const driverProfile = await Driver.findOne({ where: { user_id: user.id } });
      if (driverProfile) req.session.user.driverId = driverProfile.id;
    }

    return res.status(200).json({ success: true, data: req.session.user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ success: false, message: 'Logout failed' });
    res.clearCookie('connect.sid');
    return res.status(200).json({ success: true, message: 'Logged out' });
  });
};

exports.getMe = (req, res) => res.status(200).json({ success: true, data: req.session.user });

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.session.user.id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    return res.status(200).json({ success: true, message: 'Password changed' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Forgot Password — Step 1
 * Person submits their email. If it matches an account, we generate a
 * random reset token, store its hash + a 1-hour expiry, and email a link.
 *
 * We always return a generic success message (even if the email doesn't
 * exist) so attackers can't use this endpoint to discover which emails
 * are registered.
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const genericResponse = { success: true, message: 'If that email is registered, a reset link has been sent.' };

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(200).json(genericResponse);

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.reset_password_token = hashedToken;
    user.reset_password_expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${rawToken}`;
    const emailResult = await sendPasswordResetEmail(user.email, resetUrl, user.name);

    // In dev/demo mode (no SMTP configured), expose the reset link in the
    // API response so the frontend can display it as a clickable link.
    const responsePayload = { ...genericResponse };
    if (emailResult && emailResult.simulated) {
      responsePayload.dev_reset_link = resetUrl;
    }

    return res.status(200).json(responsePayload);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Forgot Password — Step 2
 * Person submits the token (from the emailed link) + new password.
 * We hash the incoming token and compare to what's stored, and check
 * it hasn't expired.
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: 'Token and new password are required' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      where: { reset_password_token: hashedToken },
    });

    if (!user || !user.reset_password_expires || user.reset_password_expires < new Date()) {
      return res.status(400).json({ success: false, message: 'Reset link is invalid or has expired' });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.reset_password_token = null;
    user.reset_password_expires = null;
    await user.save();

    return res.status(200).json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};