/**
 * Speeding Alert Helper
 *
 * The Alert model already has a 'speeding' type, and the GPS Tracking page
 * already shows a "Speeding >80" count — but that count was only ever
 * computed client-side from raw GPS logs. No Alert row was ever created for
 * it, so it never reached the Alerts page, the notification bell, or the
 * driver. This module closes that gap.
 *
 * Called from both the GPS simulator (fake data) and the real /gps/push
 * endpoint (real device data) so the behavior is identical either way.
 *
 * A cooldown prevents spamming an alert every few seconds while a vehicle
 * stays over the limit — one alert per vehicle per cooldown window.
 */

const { Alert, Vehicle, Driver } = require('../models');

const SPEED_LIMIT_KMH = 80;
const COOLDOWN_MS = 5 * 60 * 1000; // one speeding alert per vehicle per 5 minutes

const lastAlertedAt = new Map(); // vehicle_id -> timestamp

async function checkSpeedAlert(io, vehicleId, speedKmh) {
  if (!speedKmh || speedKmh <= SPEED_LIMIT_KMH) return null;

  const last = lastAlertedAt.get(vehicleId);
  if (last && Date.now() - last < COOLDOWN_MS) return null;
  lastAlertedAt.set(vehicleId, Date.now());

  try {
    const [vehicle, driver] = await Promise.all([
      Vehicle.findByPk(vehicleId),
      Driver.findOne({ where: { assigned_vehicle_id: vehicleId }, include: [{ model: require('../models').User, as: 'user', attributes: ['name'] }] }),
    ]);

    const severity = speedKmh > 110 ? 'critical' : speedKmh > 95 ? 'high' : 'medium';
    const regNo = vehicle?.registration_no || `Vehicle #${vehicleId}`;
    const driverName = driver?.user?.name || null;

    const alert = await Alert.create({
      vehicle_id: vehicleId,
      driver_id: driver ? driver.id : null,
      type: 'speeding',
      title: `Speeding: ${regNo} at ${Math.round(speedKmh)} km/h`,
      message: `${regNo}${driverName ? ` (driver: ${driverName})` : ''} was recorded at ${Math.round(speedKmh)} km/h, over the ${SPEED_LIMIT_KMH} km/h limit.`,
      severity,
      is_read: false,
    });

    if (io) {
      io.emit('new_alert', alert);
      if (driver) {
        io.emit('driver_notification', {
          driver_id: driver.id,
          alert_id: alert.id,
          title: alert.title,
          message: alert.message,
          severity: alert.severity,
          type: 'speeding',
          vehicle_id: vehicleId,
        });
      }
    }

    return alert;
  } catch (err) {
    console.error('Speeding alert check failed:', err.message);
    return null;
  }
}

module.exports = { checkSpeedAlert, SPEED_LIMIT_KMH };