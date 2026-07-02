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
const { Maintenance, Vehicle, Alert, Trip } = require('../models');
const { Op } = require('sequelize');
const { maintenanceAdvisorInsight } = require('../services/Groq.service');

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

// Keeps Vehicle.status in sync with its maintenance records: a vehicle
// goes to 'maintenance' as soon as any record for it is 'in_progress',
// and reverts to 'active' once none are. Mirrors the pattern trip.controller
// uses to flip Driver.status/Vehicle.on_trip on start/end. Retired vehicles
// are never overridden.
const syncVehicleStatus = async (vehicleId) => {
  if (!vehicleId) return;
  const vehicle = await Vehicle.findByPk(vehicleId);
  if (!vehicle || vehicle.status === 'retired') return;

  const activeRepair = await Maintenance.findOne({
    where: { vehicle_id: vehicleId, status: 'in_progress' },
  });

  if (activeRepair && vehicle.status !== 'maintenance') {
    await vehicle.update({ status: 'maintenance' });
  } else if (!activeRepair && vehicle.status === 'maintenance') {
    await vehicle.update({ status: 'active' });
  }
};

// When a job is marked completed with an odometer reading, push that
// reading onto the vehicle if it's more recent than what's stored — same
// idea as trip.controller updating Vehicle.odometer_km on trip end.
const syncOdometer = async (record) => {
  if (record.status !== 'completed' || record.odometer_km == null) return;
  const vehicle = await Vehicle.findByPk(record.vehicle_id);
  if (vehicle && parseFloat(record.odometer_km) > (vehicle.odometer_km || 0)) {
    await vehicle.update({ odometer_km: parseFloat(record.odometer_km) });
  }
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
    await syncVehicleStatus(record.vehicle_id);
    await syncOdometer(record);
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
    await syncVehicleStatus(record.vehicle_id);
    await syncOdometer(record);
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
    const record = await Maintenance.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    const vehicleId = record.vehicle_id;
    await record.destroy();
    await syncVehicleStatus(vehicleId);
    return res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// AI MAINTENANCE ADVISOR
// The due-date/km math below is deterministic (LLMs guess at arithmetic and
// will get days-until-due wrong) — Groq is only used afterward to turn the
// numbers into a one-line recommendation, same pattern as the report insights.
// ─────────────────────────────────────────────────────────────────────────────
const DAY_MS = 86400000;

// Industry-standard-ish service intervals, whichever threshold (km or days)
// is hit first triggers the next service.
const SERVICE_INTERVALS = {
  oil_change: { km: 5000,  days: 90,  label: 'Engine Oil' },
  brake:      { km: 10000, days: 180, label: 'Brake Inspection' },
  tire:       { km: 40000, days: 730, label: 'Tyres' },
  engine:     { km: 15000, days: 365, label: 'Engine Service' },
  electrical: { km: 20000, days: 365, label: 'Electrical Check' },
  body:       { km: 20000, days: 365, label: 'Body Inspection' },
  other:      { km: 10000, days: 180, label: 'General Service' },
};

function classifyDaysRemaining(days) {
  if (days < 0) {
    const overdue = Math.abs(Math.round(days));
    return { urgency: 'urgent', eta_text: `Overdue by ${overdue} day${overdue === 1 ? '' : 's'}` };
  }
  if (days <= 7) {
    const d = Math.max(1, Math.round(days));
    return { urgency: 'urgent', eta_text: `Within ${d} day${d === 1 ? '' : 's'}` };
  }
  if (days <= 21) {
    const d = Math.round(days);
    return { urgency: 'soon', eta_text: d <= 10 ? `Within ${d} days` : `Within ${Math.round(d / 7)} week${Math.round(d / 7) === 1 ? '' : 's'}` };
  }
  if (days <= 60) {
    const w = Math.round(days / 7);
    return { urgency: 'good', eta_text: `Good for ${w} week${w === 1 ? '' : 's'}` };
  }
  const m = Math.round(days / 30);
  return { urgency: 'good', eta_text: `Good for ${m} month${m === 1 ? '' : 's'}` };
}

async function computeVehiclePrediction(vehicleId) {
  const vehicle = await Vehicle.findByPk(vehicleId);
  if (!vehicle) return null;

  const now = new Date();
  const ageDays = Math.max(1, Math.round((now - new Date(vehicle.createdAt)) / DAY_MS));

  // Average daily travel from the last 90 days of completed trips; falls
  // back to lifetime average (odometer / age) if there's no recent trip
  // history, and finally to a 50km/day placeholder for a brand-new vehicle.
  const since = new Date(now - 90 * DAY_MS);
  const recentTrips = await Trip.findAll({
    where: { vehicle_id: vehicleId, status: 'completed', end_time: { [Op.gte]: since } },
  });
  let avgDailyKm;
  if (recentTrips.length) {
    const totalKm = recentTrips.reduce((s, t) => s + (t.distance_km || 0), 0);
    const earliest = recentTrips.reduce((min, t) => (t.end_time < min ? t.end_time : min), now);
    const spanDays = Math.max(1, Math.round((now - new Date(earliest)) / DAY_MS));
    avgDailyKm = totalKm / spanDays;
  } else if (vehicle.odometer_km > 0) {
    avgDailyKm = vehicle.odometer_km / ageDays;
  } else {
    avgDailyKm = 50;
  }
  avgDailyKm = Math.max(1, Math.round(avgDailyKm));

  const allCompleted = await Maintenance.findAll({
    where: { vehicle_id: vehicleId, status: 'completed' },
    order: [['completed_date', 'DESC']],
  });

  const predictions = Object.entries(SERVICE_INTERVALS).map(([type, interval]) => {
    const lastForType = allCompleted.find(r => r.type === type);
    const baselineDate = lastForType?.completed_date ? new Date(lastForType.completed_date) : new Date(vehicle.createdAt);
    const baselineKm   = lastForType?.odometer_km != null ? parseFloat(lastForType.odometer_km) : 0;

    const nextDueKm    = baselineKm + interval.km;
    const kmRemaining  = nextDueKm - vehicle.odometer_km;
    const daysByKm     = avgDailyKm > 0 ? kmRemaining / avgDailyKm : Infinity;

    const nextDueDate  = new Date(baselineDate.getTime() + interval.days * DAY_MS);
    const daysByDate    = (nextDueDate - now) / DAY_MS;

    const daysRemaining = Math.min(daysByKm, daysByDate);
    const { urgency, eta_text } = classifyDaysRemaining(daysRemaining);

    return {
      type, label: interval.label, urgency, eta_text,
      days_remaining: Math.round(daysRemaining),
      last_serviced: lastForType?.completed_date || null,
    };
  }).sort((a, b) => a.days_remaining - b.days_remaining);

  return {
    vehicle_id: vehicle.id,
    registration_no: vehicle.registration_no,
    odometer_km: vehicle.odometer_km,
    avg_daily_km: avgDailyKm,
    service_count: allCompleted.length,
    age_days: ageDays,
    predictions,
  };
}

exports.getPrediction = async (req, res) => {
  try {
    const result = await computeVehiclePrediction(req.params.vehicleId);
    if (!result) return res.status(404).json({ success: false, message: 'Vehicle not found' });

    let ai_insight = '';
    try { ai_insight = await maintenanceAdvisorInsight(result); }
    catch { ai_insight = ''; } // AI narrative is a nice-to-have; predictions still return without it

    return res.json({ success: true, data: { ...result, ai_insight } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};