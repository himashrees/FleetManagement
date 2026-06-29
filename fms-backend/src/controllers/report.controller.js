// const { Trip, FuelLog, Maintenance, Vehicle, Driver } = require('../models');
// const { Op } = require('sequelize');

// exports.fleetSummary = async (req, res) => {
//   try {
//     const totalVehicles    = await Vehicle.count();
//     const activeVehicles   = await Vehicle.count({ where: { status: 'active' } });
//     const totalDrivers     = await Driver.count();
//     const availableDrivers = await Driver.count({ where: { status: 'available' } });
//     const tripsToday       = await Trip.count({ where: { createdAt: { [Op.gte]: new Date(new Date().setHours(0,0,0,0)) } } });
//     const maintenanceDue   = await Maintenance.count({ where: { status: 'scheduled', scheduled_date: { [Op.lte]: new Date() } } });
//     return res.json({ success: true, data: { totalVehicles, activeVehicles, totalDrivers, availableDrivers, tripsToday, maintenanceDue } });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// exports.fuelReport = async (req, res) => {
//   try {
//     const { from, to } = req.query;
//     const where = {};
//     if (from && to) where.filled_at = { [Op.between]: [new Date(from), new Date(to)] };
//     const logs = await FuelLog.findAll({ where });
//     const totalLitres = logs.reduce((s, l) => s + l.litres, 0).toFixed(2);
//     const totalCost   = logs.reduce((s, l) => s + parseFloat(l.total_cost || 0), 0).toFixed(2);
//     return res.json({ success: true, data: { totalLitres, totalCost, records: logs.length } });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// exports.tripReport = async (req, res) => {
//   try {
//     const { from, to, driver_id } = req.query;
//     const where = { status: 'completed' };
//     if (driver_id) where.driver_id = driver_id;
//     if (from && to) where.start_time = { [Op.between]: [new Date(from), new Date(to)] };
//     const trips = await Trip.findAll({ where });
//     const totalKm = trips.reduce((s, t) => s + (t.distance_km || 0), 0).toFixed(2);
//     return res.json({ success: true, data: { totalTrips: trips.length, totalKm, trips } });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }






// controllers/report.controller.js
const { Trip, FuelLog, Maintenance, Vehicle, Driver } = require('../models');
const { Op } = require('sequelize');
const groqService = require('../services/groq.service');

// ── Helper: run Groq insight without crashing the whole response if AI fails ──
async function safeInsight(fn, ...args) {
  try {
    return await fn(...args);
  } catch (err) {
    console.error('[Groq] insight failed:', err.message);
    return null;   // report still returns, just without AI text
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// GET /reports/summary
// ─────────────────────────────────────────────────────────────────────────────
exports.fleetSummary = async (req, res) => {
  try {
    const [totalVehicles, activeVehicles, totalDrivers, availableDrivers, tripsToday, maintenanceDue] =
      await Promise.all([
        Vehicle.count(),
        Vehicle.count({ where: { status: 'active' } }),
        Driver.count(),
        Driver.count({ where: { status: 'available' } }),
        Trip.count({ where: { createdAt: { [Op.gte]: new Date(new Date().setHours(0,0,0,0)) } } }),
        Maintenance.count({ where: { status: 'scheduled', scheduled_date: { [Op.lte]: new Date() } } }),
      ]);

    const data = { totalVehicles, activeVehicles, totalDrivers, availableDrivers, tripsToday, maintenanceDue };

    // AI insight runs in parallel — doesn't slow down the data query
    const ai_insight = await safeInsight(groqService.fleetSummaryInsight, data);

    return res.json({ success: true, data: { ...data, ai_insight } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


// ─────────────────────────────────────────────────────────────────────────────
// GET /reports/fuel?from=&to=
// ─────────────────────────────────────────────────────────────────────────────
exports.fuelReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const where = {};
    if (from && to) where.filled_at = { [Op.between]: [new Date(from), new Date(to)] };

    const logs        = await FuelLog.findAll({ where });
    const totalLitres = logs.reduce((s, l) => s + (l.litres || 0), 0).toFixed(2);
    const totalCost   = logs.reduce((s, l) => s + parseFloat(l.total_cost || 0), 0).toFixed(2);

    const data = { totalLitres: parseFloat(totalLitres), totalCost: parseFloat(totalCost), records: logs.length, logs };

    const ai_insight = await safeInsight(groqService.fuelReportInsight, data, from, to);

    return res.json({
      success: true,
      data: {
        totalLitres,
        totalCost,
        records: logs.length,
        ai_insight,
        // Don't send full logs array in response — keep it lean
        // (logs were only needed for Groq context above)
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


// ─────────────────────────────────────────────────────────────────────────────
// GET /reports/trips?from=&to=&driver_id=
// ─────────────────────────────────────────────────────────────────────────────
exports.tripReport = async (req, res) => {
  try {
    const { from, to, driver_id } = req.query;
    const where = { status: 'completed' };
    if (driver_id) where.driver_id = driver_id;
    if (from && to) where.start_time = { [Op.between]: [new Date(from), new Date(to)] };

    const trips   = await Trip.findAll({ where });
    const totalKm = trips.reduce((s, t) => s + (t.distance_km || 0), 0).toFixed(2);
    const data    = { totalTrips: trips.length, totalKm: parseFloat(totalKm), trips };

    const ai_insight = await safeInsight(groqService.tripReportInsight, data, { from, to, driver_id });

    return res.json({ success: true, data: { totalTrips: trips.length, totalKm, trips, ai_insight } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


// ─────────────────────────────────────────────────────────────────────────────
// GET /reports/executive   ← NEW: one-call summary of everything
// ─────────────────────────────────────────────────────────────────────────────
exports.executiveSummary = async (req, res) => {
  try {
    // Fetch all 3 datasets in parallel
    const [
      totalVehicles, activeVehicles, totalDrivers, availableDrivers, tripsToday, maintenanceDue,
      fuelLogs, trips,
    ] = await Promise.all([
      Vehicle.count(),
      Vehicle.count({ where: { status: 'active' } }),
      Driver.count(),
      Driver.count({ where: { status: 'available' } }),
      Trip.count({ where: { createdAt: { [Op.gte]: new Date(new Date().setHours(0,0,0,0)) } } }),
      Maintenance.count({ where: { status: 'scheduled', scheduled_date: { [Op.lte]: new Date() } } }),
      FuelLog.findAll({ where: { filled_at: { [Op.gte]: new Date(Date.now() - 7 * 86400000) } } }),
      Trip.findAll({ where: { status: 'completed', start_time: { [Op.gte]: new Date(Date.now() - 7 * 86400000) } } }),
    ]);

    const fleetData = { totalVehicles, activeVehicles, totalDrivers, availableDrivers, tripsToday, maintenanceDue };
    const fuelData  = {
      totalLitres: fuelLogs.reduce((s, l) => s + (l.litres || 0), 0).toFixed(2),
      totalCost:   fuelLogs.reduce((s, l) => s + parseFloat(l.total_cost || 0), 0).toFixed(2),
      records:     fuelLogs.length,
    };
    const tripData  = {
      totalTrips: trips.length,
      totalKm:    trips.reduce((s, t) => s + (t.distance_km || 0), 0).toFixed(2),
      trips,
    };

    const ai_insight = await safeInsight(groqService.executiveSummary, {
      fleet: fleetData,
      fuel:  fuelData,
      trips: tripData,
    });

    return res.json({
      success: true,
      data: {
        fleet: fleetData,
        fuel:  fuelData,
        trips: { totalTrips: tripData.totalTrips, totalKm: tripData.totalKm },
        ai_insight,
        period: 'Last 7 days',
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
// };
