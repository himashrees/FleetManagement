const { Trip, Vehicle, Driver, Route, User, Alert } = require('../models');

/* ─── shared include list ─── */
const TRIP_INCLUDE = [
  { model: Vehicle, as: 'vehicle', attributes: ['registration_no', 'make'] },
  { model: Driver,  as: 'driver',  attributes: ['id', 'license_number'],
    include: [{ model: User, as: 'user', attributes: ['name'] }] },
  { model: Route,   as: 'route',   attributes: ['name', 'origin', 'destination'] },
];

/* ─── helper: send driver notification alert ─── */
const notifyDriver = async (trip, titleText, messageText) => {
  try {
    await Alert.create({
      driver_id:  trip.driver_id,
      vehicle_id: trip.vehicle_id,
      type:       'other',
      severity:   'medium',
      title:      titleText,
      message:    messageText,
      is_read:    false,
    });
  } catch (_) {
    // non-fatal — don't block the main response if alert fails
  }
};

/* ─────────────────────────────────────────────
   GET /api/trips
   Admin/Manager → all trips
   Driver        → scoped to their own (via scopeDriverTo middleware)
───────────────────────────────────────────── */
exports.getAll = async (req, res) => {
  try {
    const { status, driver_id, vehicle_id } = req.query;
    const where = {};
    if (status)     where.status     = status;
    if (vehicle_id) where.vehicle_id = vehicle_id;
    if (driver_id)  where.driver_id  = driver_id;

    const trips = await Trip.findAll({
      where,
      include: TRIP_INCLUDE,
      order: [['createdAt', 'DESC']],
    });
    return res.json({ success: true, data: trips });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ─────────────────────────────────────────────
   GET /api/trips/:id
───────────────────────────────────────────── */
exports.getById = async (req, res) => {
  try {
    const trip = await Trip.findByPk(req.params.id, { include: TRIP_INCLUDE });
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    return res.json({ success: true, data: trip });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ─────────────────────────────────────────────
   POST /api/trips  (Admin / Manager only)
   Creates a PLANNED trip and notifies the driver.
───────────────────────────────────────────── */
exports.createTrip = async (req, res) => {
  try {
    const trip = await Trip.create({ ...req.body, status: 'planned' });

    // Fetch vehicle reg for the notification message
    const vehicle = await Vehicle.findByPk(trip.vehicle_id, { attributes: ['registration_no'] });
    const from = trip.start_location || 'TBD';
    const to   = trip.end_location   || 'TBD';

    await notifyDriver(
      trip,
      'New Trip Scheduled',
      `A trip has been scheduled for you: ${from} → ${to}. ` +
      `Vehicle: ${vehicle?.registration_no || `#${trip.vehicle_id}`}. ` +
      `Trip ID: #${trip.id}. Please be ready.`
    );

    // Real-time push
    const io = req.app.get('io');
    if (io) io.emit('trip_assigned', { trip_id: trip.id, driver_id: trip.driver_id });

    return res.status(201).json({ success: true, data: trip });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ─────────────────────────────────────────────
   PUT /api/trips/:id  (Admin / Manager only)
   Edit a planned trip (before it starts).
───────────────────────────────────────────── */
exports.updateTrip = async (req, res) => {
  try {
    const trip = await Trip.findByPk(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    if (trip.status === 'in_progress') {
      return res.status(400).json({ success: false, message: 'Cannot edit a trip that is already in progress' });
    }
    await trip.update(req.body);
    return res.json({ success: true, data: trip });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ─────────────────────────────────────────────
   PUT /api/trips/:id/cancel  (Admin / Manager only)
───────────────────────────────────────────── */
exports.cancelTrip = async (req, res) => {
  try {
    const trip = await Trip.findByPk(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    if (trip.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Cannot cancel a completed trip' });
    }

    await trip.update({ status: 'cancelled' });

    // If it was in progress, free the driver
    if (trip.status === 'in_progress') {
      await Driver.update({ status: 'available' }, { where: { id: trip.driver_id } });
    }

    await notifyDriver(
      trip,
      'Trip Cancelled',
      `Trip #${trip.id} (${trip.start_location || 'N/A'} → ${trip.end_location || 'N/A'}) has been cancelled by the admin.`
    );

    return res.json({ success: true, message: 'Trip cancelled' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ─────────────────────────────────────────────
   PUT /api/trips/:id/start  (Driver or Admin)
   Marks a planned trip as in_progress.
───────────────────────────────────────────── */
exports.startTrip = async (req, res) => {
  try {
    const trip = await Trip.findByPk(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    if (trip.status !== 'planned') {
      return res.status(400).json({ success: false, message: `Trip is already ${trip.status}` });
    }

    const { start_odometer } = req.body;
    await trip.update({
      status:         'in_progress',
      start_time:     new Date(),
      start_odometer: start_odometer ?? trip.start_odometer,
    });

    await Driver.update({ status: 'on_trip' }, { where: { id: trip.driver_id } });

    return res.json({ success: true, data: trip });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ─────────────────────────────────────────────
   PUT /api/trips/:id/end  (Driver or Admin)
───────────────────────────────────────────── */
exports.endTrip = async (req, res) => {
  try {
    const trip = await Trip.findByPk(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    if (trip.status !== 'in_progress') {
      return res.status(400).json({ success: false, message: 'Trip is not in progress' });
    }

    const { end_odometer, fuel_used, end_location } = req.body;
    const distance_km = end_odometer && trip.start_odometer
      ? parseFloat(end_odometer) - parseFloat(trip.start_odometer)
      : null;

    await trip.update({
      status:       'completed',
      end_time:     new Date(),
      end_odometer,
      fuel_used,
      end_location: end_location || trip.end_location,
      distance_km,
    });

    await Driver.update({ status: 'available' }, { where: { id: trip.driver_id } });

    return res.json({ success: true, data: trip });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};