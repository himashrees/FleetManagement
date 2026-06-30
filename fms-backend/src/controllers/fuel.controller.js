// const { FuelLog, Driver } = require('../models');
// const { Op } = require('sequelize');

// exports.getAll = async (req, res) => {
//   try {
//     const { vehicle_id, from, to } = req.query;
//     const where = {};
//     if (from && to) where.filled_at = { [Op.between]: [new Date(from), new Date(to)] };

//     // If driver, scope to their assigned vehicle only
//     if (req.session.user?.role === 'driver') {
//       const driverRecord = await Driver.findOne({ where: { user_id: req.session.user.id } });
//       if (driverRecord?.assigned_vehicle_id) {
//         where.vehicle_id = driverRecord.assigned_vehicle_id;
//       } else {
//         return res.json({ success: true, data: [] });
//       }
//     } else {
//       if (vehicle_id) where.vehicle_id = vehicle_id;
//     }

//     const logs = await FuelLog.findAll({ where, order: [['filled_at','DESC']] });
//     return res.json({ success: true, data: logs });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// exports.create = async (req, res) => {
//   try {
//     const { litres, cost_per_litre } = req.body;
//     const total_cost = (litres * cost_per_litre).toFixed(2);
//     const log = await FuelLog.create({ ...req.body, total_cost });
//     return res.status(201).json({ success: true, data: log });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// exports.getStats = async (req, res) => {
//   try {
//     const logs = await FuelLog.findAll({ where: { vehicle_id: req.params.vehicle_id } });
//     const totalLitres = logs.reduce((s, l) => s + l.litres, 0);
//     const totalCost   = logs.reduce((s, l) => s + parseFloat(l.total_cost || 0), 0);
//     return res.json({ success: true, data: { totalLitres, totalCost, entries: logs.length } });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// exports.remove = async (req, res) => {
//   try {
//     await FuelLog.destroy({ where: { id: req.params.id } });
//     return res.json({ success: true, message: 'Fuel log deleted' });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };
const { FuelLog, Driver, Vehicle } = require('../models');
const { Op } = require('sequelize');

exports.getAll = async (req, res) => {
  try {
    const { vehicle_id, from, to } = req.query;
    const where = {};

    if (from && to) {
      where.filled_at = { [Op.between]: [new Date(from), new Date(to + 'T23:59:59')] };
    } else if (from) {
      where.filled_at = { [Op.gte]: new Date(from) };
    } else if (to) {
      where.filled_at = { [Op.lte]: new Date(to + 'T23:59:59') };
    }

    if (req.session.user?.role === 'driver') {
      const driver = await Driver.findOne({ where: { user_id: req.session.user.id } });
      if (driver?.assigned_vehicle_id) {
        where.vehicle_id = driver.assigned_vehicle_id;
      } else {
        return res.json({ success: true, data: [] });
      }
    } else {
      if (vehicle_id) where.vehicle_id = parseInt(vehicle_id);
    }

    const logs = await FuelLog.findAll({ where, order: [['filled_at', 'DESC']] });
    return res.json({ success: true, data: logs });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { vehicle_id, litres, cost_per_litre, fuel_type, odometer_km, station_name, driver_id } = req.body;

    if (!vehicle_id)                               return res.status(400).json({ success: false, message: 'vehicle_id is required' });
    if (!litres || parseFloat(litres) <= 0)        return res.status(400).json({ success: false, message: 'litres must be > 0' });
    if (!cost_per_litre || parseFloat(cost_per_litre) <= 0) return res.status(400).json({ success: false, message: 'cost_per_litre must be > 0' });

    const total_cost = (parseFloat(litres) * parseFloat(cost_per_litre)).toFixed(2);

    // Default the fuel type to whatever was registered on the vehicle itself,
    // rather than hardcoding 'diesel' — keeps fuel logs consistent with what
    // was set up in Vehicles without making the user re-select it every time.
    let resolvedFuelType = fuel_type;
    if (!resolvedFuelType) {
      const vehicle = await Vehicle.findByPk(vehicle_id);
      resolvedFuelType = vehicle?.fuel_type || 'diesel';
    }

    const log = await FuelLog.create({
      vehicle_id:     parseInt(vehicle_id),
      driver_id:      driver_id ? parseInt(driver_id) : null,
      litres:         parseFloat(litres),
      cost_per_litre: parseFloat(cost_per_litre),
      total_cost,
      fuel_type:      resolvedFuelType,
      odometer_km:    odometer_km ? parseFloat(odometer_km) : null,
      station_name:   station_name || null,
      filled_at:      new Date(),
    });

    return res.status(201).json({ success: true, data: log });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const log = await FuelLog.findByPk(req.params.id);
    if (!log) return res.status(404).json({ success: false, message: 'Fuel log not found' });
    return res.json({ success: true, data: log });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const logs = await FuelLog.findAll({
      where: { vehicle_id: req.params.vehicle_id },
      order: [['filled_at', 'ASC']],
    });
    const totalLitres = logs.reduce((s, l) => s + (parseFloat(l.litres) || 0), 0);
    const totalCost   = logs.reduce((s, l) => s + parseFloat(l.total_cost || 0), 0);
    const avgCostPerL = totalLitres > 0 ? (totalCost / totalLitres) : 0;

    const withOdo = logs.filter(l => l.odometer_km);
    let kmPerLitre = null;
    if (withOdo.length >= 2) {
      const km = parseFloat(withOdo[withOdo.length - 1].odometer_km) - parseFloat(withOdo[0].odometer_km);
      const litresForRange = withOdo.slice(1).reduce((s, l) => s + parseFloat(l.litres), 0);
      if (litresForRange > 0) kmPerLitre = (km / litresForRange).toFixed(2);
    }

    return res.json({ success: true, data: { totalLitres, totalCost, avgCostPerL: avgCostPerL.toFixed(2), entries: logs.length, kmPerLitre } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const log = await FuelLog.findByPk(req.params.id);
    if (!log) return res.status(404).json({ success: false, message: 'Fuel log not found' });

    const { vehicle_id, driver_id, litres, cost_per_litre, fuel_type, odometer_km, station_name, filled_at } = req.body;

    const nextLitres = litres !== undefined ? parseFloat(litres) : parseFloat(log.litres);
    const nextRate   = cost_per_litre !== undefined ? parseFloat(cost_per_litre) : parseFloat(log.cost_per_litre);

    if (!nextLitres || nextLitres <= 0) return res.status(400).json({ success: false, message: 'litres must be > 0' });
    if (!nextRate || nextRate <= 0)     return res.status(400).json({ success: false, message: 'cost_per_litre must be > 0' });

    await log.update({
      vehicle_id:     vehicle_id !== undefined ? parseInt(vehicle_id) : log.vehicle_id,
      driver_id:      driver_id !== undefined ? (driver_id ? parseInt(driver_id) : null) : log.driver_id,
      litres:         nextLitres,
      cost_per_litre: nextRate,
      total_cost:     (nextLitres * nextRate).toFixed(2),
      fuel_type:      fuel_type || log.fuel_type,
      odometer_km:    odometer_km !== undefined ? (odometer_km ? parseFloat(odometer_km) : null) : log.odometer_km,
      station_name:   station_name !== undefined ? (station_name || null) : log.station_name,
      filled_at:      filled_at || log.filled_at,
    });

    return res.json({ success: true, data: log });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const log = await FuelLog.findByPk(req.params.id);
    if (!log) return res.status(404).json({ success: false, message: 'Fuel log not found' });
    await log.destroy();
    return res.json({ success: true, message: 'Fuel log deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};