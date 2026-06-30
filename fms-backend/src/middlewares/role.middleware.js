const isAdmin = (req, res, next) => {
  if (req.session.user?.role === 'admin') return next();
  return res.status(403).json({ success: false, message: 'Admin access required' });
};

const isManager = (req, res, next) => {
  const role = req.session.user?.role;
  if (role === 'admin' || role === 'manager') return next();
  return res.status(403).json({ success: false, message: 'Manager access required' });
};

const isDriver = (req, res, next) => {
  if (req.session.user?.role === 'driver') return next();
  return res.status(403).json({ success: false, message: 'Driver access required' });
};

// ── scopeDriverTo ────────────────────────────────────────────────────────────
// Forces driver-role users to only see their own records.
//
// IMPORTANT: In Express 5, req.query is a getter that returns a fresh parsed
// object on each access in some setups — directly assigning a new key to it
// (req.query[field] = value) can silently fail to persist to the next
// middleware/controller. To guarantee the value survives, we attach it to
// req itself (req.scopedDriverId) AND attempt the query mutation as a
// fallback for older Express versions / other code that still reads
// req.query[field] directly.
const scopeDriverTo = (queryField) => (req, res, next) => {
  const { role, driverId } = req.session.user || {};
  if (role === 'admin' || role === 'manager') return next();
  if (role === 'driver') {
    if (!driverId) {
      return res.status(403).json({ success: false, message: 'No driver profile linked to this account' });
    }
    // Primary: reliable across Express 4 and 5
    req.scopedDriverId = driverId;
    // Fallback: still try the old approach in case some controller reads req.query directly
    try { req.query[queryField] = String(driverId); } catch { /* ignore if read-only */ }
    return next();
  }
  return res.status(403).json({ success: false, message: 'Access denied' });
};

module.exports = { isAdmin, isManager, isDriver, scopeDriverTo };