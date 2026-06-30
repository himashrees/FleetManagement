// ── GPS Simulator ───────────────────────────────────────────────────────────
// There's no real GPS hardware feeding this system, so this module fakes one.
// For every "active" vehicle it keeps an in-memory virtual position + heading,
// nudges it forward each tick (like a vehicle actually driving), writes the
// new point to gps_logs (same table real devices would write to), and
// broadcasts it over Socket.io exactly the way POST /api/gps/push does.
//
// This means the rest of the app (history, live list, alerts) doesn't need to
// know or care that the data is simulated — it's indistinguishable from a
// real device hitting the push endpoint.

const { GpsLog, Vehicle } = require('../models');

const TICK_MS = 3000;       // how often vehicles "move"
const BASE_LAT = 12.9716;   // Bengaluru city center — change to your city
const BASE_LNG = 77.5946;
const SPREAD = 0.06;        // ~6km spread for starting positions

let timer = null;
let ioRef = null;
const vehicleState = new Map(); // vehicle_id -> { lat, lng, heading, speed }

function randomStart() {
  return {
    lat: BASE_LAT + (Math.random() - 0.5) * SPREAD,
    lng: BASE_LNG + (Math.random() - 0.5) * SPREAD,
    heading: Math.random() * 360,
    speed: 0,
  };
}

// Move a vehicle forward along its heading, with small random turns and
// speed changes so the path looks like real driving, not a straight line.
function step(state) {
  // Occasionally change heading a bit (turning at junctions)
  state.heading += (Math.random() - 0.5) * 40;
  if (state.heading < 0) state.heading += 360;
  if (state.heading >= 360) state.heading -= 360;

  // Mix of idle (red light), normal cruising, and occasional speeding —
  // so the dashboard's Moving / Idle / Speeding (>80) stats all populate
  // with multiple vehicles running at once instead of everyone clustering
  // in the same 20-70 km/h band.
  const r = Math.random();
  if (r < 0.12) {
    state.speed = 0;                                   // idle (red light / stopped)
  } else if (r < 0.85) {
    state.speed = Math.round(20 + Math.random() * 50);  // normal: 20-70 km/h
  } else {
    state.speed = Math.round(82 + Math.random() * 38);  // speeding: 82-120 km/h
  }

  // Convert speed (km/h) over TICK_MS into a lat/lng delta
  const distanceKm = (state.speed * (TICK_MS / 1000)) / 3600;
  const rad = (state.heading * Math.PI) / 180;
  const dLat = (distanceKm / 111) * Math.cos(rad);
  const dLng = (distanceKm / (111 * Math.cos((state.lat * Math.PI) / 180))) * Math.sin(rad);

  state.lat += dLat;
  state.lng += dLng;

  // Keep vehicles from wandering too far off the map
  if (Math.abs(state.lat - BASE_LAT) > SPREAD) state.heading = (state.heading + 180) % 360;
  if (Math.abs(state.lng - BASE_LNG) > SPREAD) state.heading = (state.heading + 180) % 360;

  return state;
}

async function tick() {
  try {
    const vehicles = await Vehicle.findAll({ where: { status: 'active' }, attributes: ['id', 'registration_no'] });
    const snapshot = [];

    for (const v of vehicles) {
      if (!vehicleState.has(v.id)) vehicleState.set(v.id, randomStart());
      const state = step(vehicleState.get(v.id));

      const log = await GpsLog.create({
        vehicle_id: v.id,
        latitude: state.lat,
        longitude: state.lng,
        speed_kmh: state.speed,
        heading: state.heading,
      });

      if (ioRef) {
        ioRef.to(`vehicle_${v.id}`).emit('location_update', {
          vehicle_id: v.id,
          latitude: state.lat,
          longitude: state.lng,
          speed_kmh: state.speed,
        });
      }

      snapshot.push({ vehicle: v, position: log });
    }

    // One combined broadcast so the dashboard/live-list updates instantly
    // without every client having to join a per-vehicle room first.
    if (ioRef) ioRef.emit('fleet_update', snapshot);
  } catch (err) {
    console.error('GPS simulator tick failed:', err.message);
  }
}

function start(io) {
  if (timer) return { already: true };
  ioRef = io;
  timer = setInterval(tick, TICK_MS);
  tick(); // fire immediately instead of waiting for the first interval
  console.log('🛰️  GPS simulator started');
  return { started: true };
}

function stop() {
  if (!timer) return { already: true };
  clearInterval(timer);
  timer = null;
  console.log('🛰️  GPS simulator stopped');
  return { stopped: true };
}

function isRunning() {
  return !!timer;
}

module.exports = { start, stop, isRunning };