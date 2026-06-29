const { Trip, Vehicle, Driver, Route, User, FuelLog, Alert } = require('../models');
const { Op } = require('sequelize');

const tripInclude = [
  { model: Vehicle, as: 'vehicle', attributes: ['registration_no','make','model','odometer_km'] },
  { model: Driver,  as: 'driver',  attributes: ['id','license_number'], include: [
    { model: User, as: 'user', attributes: ['name','phone'] },
  ]},
  { model: Route, as: 'route', attributes: ['name','origin','destination'] },
];

// ── GET ALL ──────────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { status, driver_id, vehicle_id } = req.query;
    const where = {};
    if (status)     where.status     = status;
    if (driver_id)  where.driver_id  = parseInt(driver_id);
    if (vehicle_id) where.vehicle_id = parseInt(vehicle_id);

    const trips = await Trip.findAll({ where, include: tripInclude, order: [['createdAt','DESC']] });
    return res.json({ success: true, data: trips });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET BY ID ────────────────────────────────────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const trip = await Trip.findByPk(req.params.id, { include: tripInclude });
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    return res.json({ success: true, data: trip });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── SCHEDULE TRIP (Admin creates trip as "scheduled") ────────────────────────
exports.scheduleTrip = async (req, res) => {
  try {
    const {
      vehicle_id, driver_id, start_location, end_location,
      reporting_time, purpose, notes, priority,
      estimated_distance, cargo_type, cargo_weight,
      customer_name, customer_phone, pickup_address,
    } = req.body;

    if (!vehicle_id) return res.status(400).json({ success: false, message: 'Vehicle is required' });
    if (!driver_id)  return res.status(400).json({ success: false, message: 'Driver is required' });

    const trip = await Trip.create({
      vehicle_id, driver_id, start_location, end_location,
      reporting_time: reporting_time || null,
      purpose, notes, priority: priority || 'normal',
      estimated_distance: estimated_distance ? parseFloat(estimated_distance) : null,
      cargo_type, cargo_weight: cargo_weight ? parseFloat(cargo_weight) : null,
      customer_name, customer_phone, pickup_address,
      status: 'scheduled',   // ← key change: admin schedules, not starts
    });

    // Notify the assigned driver
    const io = req.app.get('io');
    const driverRecord = await Driver.findByPk(driver_id, { include: [{ model: User, as: 'user', attributes: ['name'] }] });
    const vehicleRecord = await Vehicle.findByPk(vehicle_id);

    const alert = await Alert.create({
      driver_id: parseInt(driver_id),
      vehicle_id: parseInt(vehicle_id),
      type: 'other',
      title: `New Trip Assigned: TRP${String(trip.id).padStart(3,'0')}`,
      message: `Trip from ${start_location || '—'} to ${end_location || '—'}. Reporting time: ${reporting_time ? new Date(reporting_time).toLocaleString('en-IN') : '—'}. Vehicle: ${vehicleRecord?.registration_no || '—'}.`,
      severity: priority === 'urgent' ? 'high' : priority === 'high' ? 'high' : 'medium',
      is_read: false,
    });

    if (io) {
      io.emit('new_alert', alert);
      io.emit('driver_notification', {
        driver_id: parseInt(driver_id),
        alert_id: alert.id,
        title: alert.title,
        message: alert.message,
        severity: alert.severity,
        type: 'trip_assigned',
        trip_id: trip.id,
      });
    }

    const full = await Trip.findByPk(trip.id, { include: tripInclude });
    return res.status(201).json({ success: true, data: full });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── START TRIP (Driver starts the trip) ──────────────────────────────────────
exports.startTrip = async (req, res) => {
  try {
    const { trip_id, start_odometer, start_odometer_photo, vehicle_photo_before } = req.body;

    if (!trip_id) return res.status(400).json({ success: false, message: 'trip_id is required' });
    if (start_odometer == null || start_odometer === '') {
      return res.status(400).json({ success: false, message: 'Start odometer is required' });
    }

    const trip = await Trip.findByPk(trip_id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    if (!['scheduled', 'planned'].includes(trip.status)) {
      return res.status(400).json({ success: false, message: `Trip cannot be started — current status: ${trip.status}` });
    }

    await trip.update({
      status:                'in_progress',
      start_time:            new Date(),
      start_odometer:        parseFloat(start_odometer),
      start_odometer_photo:  start_odometer_photo || null,
      vehicle_photo_before:  vehicle_photo_before || null,
    });

    await Driver.update({ status: 'on_trip' }, { where: { id: trip.driver_id } });
    await Vehicle.update({ on_trip: true }, { where: { id: trip.vehicle_id } });

    // Notify admin/manager
    const io = req.app.get('io');
    const driverRecord = await Driver.findByPk(trip.driver_id, { include: [{ model: User, as: 'user', attributes: ['name'] }] });

    const alert = await Alert.create({
      vehicle_id: trip.vehicle_id,
      type: 'other',
      title: `Trip Started: TRP${String(trip.id).padStart(3,'0')}`,
      message: `Driver ${driverRecord?.user?.name || `#${trip.driver_id}`} started trip from ${trip.start_location || '—'} to ${trip.end_location || '—'}. Start odometer: ${start_odometer} km at ${new Date().toLocaleTimeString('en-IN')}.`,
      severity: 'low',
      is_read: false,
    });

    if (io) io.emit('new_alert', alert);

    const full = await Trip.findByPk(trip.id, { include: tripInclude });
    return res.json({ success: true, data: full });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── END TRIP (Driver completes) ───────────────────────────────────────────────
exports.endTrip = async (req, res) => {
  try {
    const trip = await Trip.findByPk(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    if (trip.status !== 'in_progress') {
      return res.status(400).json({ success: false, message: 'Trip is not in progress' });
    }

    const {
      end_odometer, end_location, end_odometer_photo, vehicle_photo_after,
      fuel_used, fuel_cost, fuel_station, fuel_receipt_url,
      toll_charges, toll_location, toll_receipt_url, other_charges, notes,
    } = req.body;

    if (end_odometer == null) {
      return res.status(400).json({ success: false, message: 'End odometer is required' });
    }

    const distance_km = parseFloat(end_odometer) - parseFloat(trip.start_odometer || 0);
    const filledFuel  = !!(fuel_used && fuel_cost);

    await trip.update({
      status:               'completed',
      end_time:             new Date(),
      end_location:         end_location || trip.end_location,
      end_odometer:         parseFloat(end_odometer),
      end_odometer_photo:   end_odometer_photo || null,
      vehicle_photo_after:  vehicle_photo_after || null,
      distance_km:          Math.max(0, distance_km),
      fuel_filled:          filledFuel,
      fuel_used:            filledFuel ? parseFloat(fuel_used) : null,
      fuel_cost:            filledFuel ? parseFloat(fuel_cost) : null,
      fuel_station:         filledFuel ? (fuel_station || null) : null,
      fuel_receipt_url:     filledFuel ? (fuel_receipt_url || null) : null,
      toll_charges:         toll_charges ? parseFloat(toll_charges) : null,
      toll_location:        toll_location || null,
      toll_receipt_url:     toll_receipt_url || null,
      other_charges:        other_charges ? parseFloat(other_charges) : null,
      notes:                notes || trip.notes,
    });

    await Driver.update({ status: 'available' }, { where: { id: trip.driver_id } });
    await Vehicle.update({ on_trip: false, odometer_km: parseFloat(end_odometer) }, { where: { id: trip.vehicle_id } });

    // Auto-create fuel log if fuel was recorded
    if (filledFuel) {
      const litres       = parseFloat(fuel_used);
      const totalCost    = parseFloat(fuel_cost);
      await FuelLog.create({
        vehicle_id:     trip.vehicle_id,
        driver_id:      trip.driver_id,
        litres,
        cost_per_litre: litres > 0 ? (totalCost / litres).toFixed(2) : null,
        total_cost:     totalCost,
        odometer_km:    parseFloat(end_odometer),
        station_name:   fuel_station || null,
        filled_at:      new Date(),
      });
    }

    // Notify admin
    const io = req.app.get('io');
    const driverRecord = await Driver.findByPk(trip.driver_id, { include: [{ model: User, as: 'user', attributes: ['name'] }] });

    const alert = await Alert.create({
      vehicle_id: trip.vehicle_id,
      type: 'other',
      title: `Trip Completed: TRP${String(trip.id).padStart(3,'0')}`,
      message: `Driver ${driverRecord?.user?.name || `#${trip.driver_id}`} completed trip from ${trip.start_location || '—'} to ${trip.end_location || '—'}. Distance: ${Math.max(0, distance_km).toFixed(0)} km.`,
      severity: 'low',
      is_read: false,
    });

    if (io) io.emit('new_alert', alert);

    const full = await Trip.findByPk(trip.id, { include: tripInclude });
    return res.json({ success: true, data: full, message: 'Trip completed successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── CANCEL TRIP ───────────────────────────────────────────────────────────────
exports.cancelTrip = async (req, res) => {
  try {
    const trip = await Trip.findByPk(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    if (['completed','cancelled'].includes(trip.status)) {
      return res.status(400).json({ success: false, message: `Cannot cancel a ${trip.status} trip` });
    }
    await trip.update({ status: 'cancelled', end_time: new Date() });
    if (trip.driver_id) {
      await Driver.update({ status: 'available' }, { where: { id: trip.driver_id } });
    }
    if (trip.vehicle_id) {
      await Vehicle.update({ on_trip: false }, { where: { id: trip.vehicle_id } });
    }
    return res.json({ success: true, message: 'Trip cancelled', data: trip });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};