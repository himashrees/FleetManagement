const { Trip, Vehicle, Driver, Route, User, FuelLog } = require('../models');

exports.getAll = async (req, res) => {
  try {
    const { status, driver_id, vehicle_id } = req.query;
    const where = {};
    if (status)     where.status     = status;
    if (driver_id)  where.driver_id  = driver_id;
    if (vehicle_id) where.vehicle_id = vehicle_id;
    const trips = await Trip.findAll({
      where,
      include: [
        { model: Vehicle, as: 'vehicle', attributes: ['registration_no','make'] },
        { model: Driver,  as: 'driver',  attributes: ['id','license_number'], include: [
          { model: User, as: 'user', attributes: ['name'] },
        ] },
        { model: Route,   as: 'route',   attributes: ['name','origin','destination'] },
      ],
      order: [['createdAt','DESC']],
    });
    return res.json({ success: true, data: trips });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.startTrip = async (req, res) => {
  try {
    const trip = await Trip.create({ ...req.body, status: 'in_progress', start_time: new Date() });
    await Driver.update({ status: 'on_trip' }, { where: { id: trip.driver_id } });
    return res.status(201).json({ success: true, data: trip });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Driver Workflow — Complete Trip
// Captures: end odometer, fuel filled (y/n), fuel qty/cost/station,
// toll charges, toll receipt, fuel receipt, notes.
// If fuel was filled, a matching FuelLog entry is auto-created so it
// shows up in Fuel Logs / Admin Dashboard fuel reports automatically.
exports.endTrip = async (req, res) => {
  try {
    const trip = await Trip.findByPk(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

    const {
      end_odometer,
      end_location,
      fuel_filled,
      fuel_used,
      fuel_cost,
      fuel_station,
      toll_charges,
      toll_receipt_url,
      fuel_receipt_url,
      notes,
    } = req.body;

    if (end_odometer == null) {
      return res.status(400).json({ success: false, message: 'End odometer is required' });
    }

    const distance_km = parseFloat(end_odometer) - parseFloat(trip.start_odometer || 0);
    const filledFuel  = fuel_filled === true || fuel_filled === 'true';

    await trip.update({
      status:            'completed',
      end_time:          new Date(),
      end_location:      end_location || trip.end_location,
      end_odometer:      parseFloat(end_odometer),
      distance_km,
      fuel_filled:       filledFuel,
      fuel_used:         filledFuel ? parseFloat(fuel_used) || null : null,
      fuel_cost:         filledFuel ? parseFloat(fuel_cost) || null : null,
      fuel_station:      filledFuel ? (fuel_station || null) : null,
      toll_charges:      toll_charges ? parseFloat(toll_charges) : null,
      toll_receipt_url:  toll_receipt_url || null,
      fuel_receipt_url:  filledFuel ? (fuel_receipt_url || null) : null,
      notes:             notes || trip.notes,
    });

    // Driver is free again
    await Driver.update({ status: 'available' }, { where: { id: trip.driver_id } });

    // If fuel was filled during this trip, log it in Fuel Logs automatically
    if (filledFuel && fuel_used && fuel_cost) {
      const litres        = parseFloat(fuel_used);
      const totalCost      = parseFloat(fuel_cost);
      const costPerLitre   = litres > 0 ? (totalCost / litres).toFixed(2) : null;

      await FuelLog.create({
        vehicle_id:     trip.vehicle_id,
        driver_id:      trip.driver_id,
        litres,
        cost_per_litre: costPerLitre,
        total_cost:     totalCost,
        odometer_km:    parseFloat(end_odometer),
        station_name:   fuel_station || null,
        filled_at:      new Date(),
      });
    }

    return res.json({ success: true, data: trip, message: 'Trip completed successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const trip = await Trip.findByPk(req.params.id, {
      include: [
        { model: Vehicle, as: 'vehicle' },
        { model: Driver,  as: 'driver', include: [{ model: User, as: 'user', attributes: ['name'] }] },
        { model: Route,   as: 'route'  },
      ],
    });
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    return res.json({ success: true, data: trip });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};