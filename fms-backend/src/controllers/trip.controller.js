const { Trip, Vehicle, Driver, Route, User, Alert } = require('../models');

const TRIP_INCLUDE = [
  { model: Vehicle, as: 'vehicle', attributes: ['registration_no', 'make'] },
  { model: Driver,  as: 'driver',  attributes: ['id', 'license_number'],
    include: [{ model: User, as: 'user', attributes: ['name'] }] },
  { model: Route,   as: 'route',   attributes: ['name', 'origin', 'destination'] },
];

const notifyDriver = async (trip, title, message) => {
  try {
    await Alert.create({
      driver_id:  trip.driver_id,
      vehicle_id: trip.vehicle_id,
      type:       'other',
      severity:   'medium',
      title,
      message,
      is_read:    false,
    });
  } catch (_) {}
};

/* GET /api/trips */
exports.getAll = async (req, res) => {
  try {
    const { status, driver_id, vehicle_id } = req.query;
    const where = {};
    if (status)     where.status     = status;
    if (vehicle_id) where.vehicle_id = vehicle_id;
    if (driver_id)  where.driver_id  = driver_id;
    const trips = await Trip.findAll({ where, include: TRIP_INCLUDE, order: [['createdAt', 'DESC']] });
    return res.json({ success: true, data: trips });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

/* GET /api/trips/:id */
exports.getById = async (req, res) => {
  try {
    const trip = await Trip.findByPk(req.params.id, { include: TRIP_INCLUDE });
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    return res.json({ success: true, data: trip });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

/* POST /api/trips — Admin/Manager schedules a PLANNED trip */
exports.createTrip = async (req, res) => {
  try {
    const {
      vehicle_id, driver_id, start_location, end_location,
      trip_date, start_time, expected_end_time,
      start_odometer, purpose, notes,
    } = req.body;

    const trip = await Trip.create({
      vehicle_id, driver_id, start_location, end_location,
      trip_date, start_time, expected_end_time,
      start_odometer, purpose, notes,
      status: 'planned',
    });

    const vehicle = await Vehicle.findByPk(trip.vehicle_id, { attributes: ['registration_no'] });
    const from = trip.start_location || 'TBD';
    const to   = trip.end_location   || 'TBD';
    const date = trip.trip_date      || 'TBD';
    const time = trip.start_time     || '';

    await notifyDriver(
      trip,
      'New Trip Scheduled',
      `You have a new trip on ${date}${time ? ' at ' + time : ''}: ${from} → ${to}. ` +
      `Vehicle: ${vehicle?.registration_no || '#' + trip.vehicle_id}. Trip ID: #${trip.id}. Please be ready.`
    );

    const io = req.app.get('io');
    if (io) io.emit('trip_assigned', { trip_id: trip.id, driver_id: trip.driver_id });

    return res.status(201).json({ success: true, data: trip });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

/* PUT /api/trips/:id — Edit a planned trip */
exports.updateTrip = async (req, res) => {
  try {
    const trip = await Trip.findByPk(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    if (trip.status === 'in_progress')
      return res.status(400).json({ success: false, message: 'Cannot edit a trip that is already in progress' });
    await trip.update(req.body);
    return res.json({ success: true, data: trip });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

/* PUT /api/trips/:id/cancel */
exports.cancelTrip = async (req, res) => {
  try {
    const trip = await Trip.findByPk(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    if (trip.status === 'completed')
      return res.status(400).json({ success: false, message: 'Cannot cancel a completed trip' });
    const wasInProgress = trip.status === 'in_progress';
    await trip.update({ status: 'cancelled' });
    if (wasInProgress)
      await Driver.update({ status: 'available' }, { where: { id: trip.driver_id } });
    await notifyDriver(trip, 'Trip Cancelled',
      `Trip #${trip.id} (${trip.start_location || 'N/A'} → ${trip.end_location || 'N/A'}) has been cancelled.`
    );
    return res.json({ success: true, message: 'Trip cancelled' });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

/* PUT /api/trips/:id/start — Driver or Admin starts a planned trip */
exports.startTrip = async (req, res) => {
  try {
    const trip = await Trip.findByPk(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    if (trip.status !== 'planned')
      return res.status(400).json({ success: false, message: `Trip is already ${trip.status}` });

    await trip.update({
      status:            'in_progress',
      actual_start_time: new Date(),           // records exact moment driver starts
      start_odometer:    req.body.start_odometer ?? trip.start_odometer,
    });

    await Driver.update({ status: 'on_trip' }, { where: { id: trip.driver_id } });

    return res.json({ success: true, data: trip });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

/* PUT /api/trips/:id/end */
exports.endTrip = async (req, res) => {
  try {
    const trip = await Trip.findByPk(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    if (trip.status !== 'in_progress')
      return res.status(400).json({ success: false, message: 'Trip is not in progress' });

    const { end_odometer, fuel_used, end_location } = req.body;
    const distance_km = end_odometer && trip.start_odometer
      ? parseFloat(end_odometer) - parseFloat(trip.start_odometer)
      : null;

    await trip.update({
      status:       'completed',
      end_time:     new Date(),
      end_odometer, fuel_used,
      end_location: end_location || trip.end_location,
      distance_km,
    });

    await Driver.update({ status: 'available' }, { where: { id: trip.driver_id } });

    return res.json({ success: true, data: trip });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};