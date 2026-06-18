/**
 * Auto-Alert Checker
 *
 * Runs checks across Drivers, Documents, and Maintenance records and
 * automatically creates Alert rows for things that need attention:
 *
 *  1. Driver license expiring within 30 days (or already expired)
 *  2. Vehicle/Driver documents (insurance, permit, etc.) expiring within 30 days
 *  3. Maintenance scheduled items that are overdue
 *
 * Designed to be idempotent — it won't create duplicate alerts for the
 * same issue within a 24h window.
 */

const { Driver, Document, Maintenance, Alert } = require('../models');
const { Op: SequelizeOp } = require('sequelize');

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

async function alreadyAlerted(type, driver_id, vehicle_id) {
  const since = new Date(Date.now() - ONE_DAY_MS);
  const where = { type, createdAt: { [SequelizeOp.gte]: since } };
  if (driver_id)  where.driver_id  = driver_id;
  if (vehicle_id) where.vehicle_id = vehicle_id;
  const existing = await Alert.findOne({ where });
  return !!existing;
}

async function checkDriverLicenses(io) {
  const drivers = await Driver.findAll({ where: { license_expiry: { [SequelizeOp.ne]: null } } });
  const now = new Date();
  let created = 0;

  for (const driver of drivers) {
    const expiry = new Date(driver.license_expiry);
    const daysLeft = Math.floor((expiry - now) / ONE_DAY_MS);

    if (daysLeft <= 30) {
      if (await alreadyAlerted('document_expiry', driver.id, null)) continue;

      const severity = daysLeft < 0 ? 'critical' : daysLeft <= 7 ? 'high' : 'medium';
      const title = daysLeft < 0
        ? `Driver license expired ${Math.abs(daysLeft)} day(s) ago`
        : `Driver license expiring in ${daysLeft} day(s)`;

      const alert = await Alert.create({
        driver_id: driver.id,
        type: 'document_expiry',
        title,
        message: `License ${driver.license_number} ${daysLeft < 0 ? 'expired on' : 'expires on'} ${driver.license_expiry}.`,
        severity,
      });
      if (io) io.emit('new_alert', alert);
      created++;
    }
  }
  return created;
}

async function checkDocumentExpiry(io) {
  const docs = await Document.findAll({ where: { expiry_date: { [SequelizeOp.ne]: null } } });
  const now = new Date();
  let created = 0;

  for (const doc of docs) {
    const expiry = new Date(doc.expiry_date);
    const daysLeft = Math.floor((expiry - now) / ONE_DAY_MS);

    if (daysLeft <= 30) {
      if (await alreadyAlerted('document_expiry', doc.driver_id, doc.vehicle_id)) continue;

      const severity = daysLeft < 0 ? 'critical' : daysLeft <= 7 ? 'high' : 'medium';
      const title = daysLeft < 0
        ? `${doc.title} expired ${Math.abs(daysLeft)} day(s) ago`
        : `${doc.title} expiring in ${daysLeft} day(s)`;

      const alert = await Alert.create({
        vehicle_id: doc.vehicle_id || null,
        driver_id: doc.driver_id || null,
        type: 'document_expiry',
        title,
        message: `Document "${doc.title}" (${doc.type}) ${daysLeft < 0 ? 'expired on' : 'expires on'} ${doc.expiry_date}.`,
        severity,
      });
      if (io) io.emit('new_alert', alert);
      created++;
    }
  }
  return created;
}

async function checkOverdueMaintenance(io) {
  const records = await Maintenance.findAll({
    where: { status: 'scheduled', scheduled_date: { [SequelizeOp.ne]: null } },
  });
  const now = new Date();
  let created = 0;

  for (const rec of records) {
    const scheduled = new Date(rec.scheduled_date);
    if (scheduled < now) {
      if (await alreadyAlerted('maintenance_due', null, rec.vehicle_id)) continue;

      const daysOverdue = Math.floor((now - scheduled) / ONE_DAY_MS);
      const severity = daysOverdue > 14 ? 'critical' : daysOverdue > 3 ? 'high' : 'medium';

      const alert = await Alert.create({
        vehicle_id: rec.vehicle_id,
        type: 'maintenance_due',
        title: `${rec.type.replace('_', ' ')} maintenance overdue by ${daysOverdue} day(s)`,
        message: `Scheduled for ${rec.scheduled_date} at ${rec.workshop_name || 'workshop'}.`,
        severity,
      });
      if (io) io.emit('new_alert', alert);
      created++;
    }
  }
  return created;
}

/**
 * Run all expiry/overdue checks. Returns a summary object.
 */
async function runAllChecks(io) {
  const [licenses, documents, maintenance] = await Promise.all([
    checkDriverLicenses(io),
    checkDocumentExpiry(io),
    checkOverdueMaintenance(io),
  ]);
  const total = licenses + documents + maintenance;
  if (total > 0) {
    console.log(`🔔 Auto-alert check: created ${total} new alert(s) (licenses: ${licenses}, documents: ${documents}, maintenance: ${maintenance})`);
  }
  return { created: total, licenses, documents, maintenance };
}

/**
 * Start a recurring background job (every 24h) that runs all checks.
 * Also runs once immediately on startup.
 */
function startAlertScheduler(io) {
  runAllChecks(io).catch(err => console.error('Alert check failed:', err.message));
  setInterval(() => {
    runAllChecks(io).catch(err => console.error('Alert check failed:', err.message));
  }, ONE_DAY_MS);
}

module.exports = { runAllChecks, startAlertScheduler };