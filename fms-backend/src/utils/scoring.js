/**
 * Scoring utilities for Vehicle Health Score (Module 2) and
 * Driver Safety Score (Module 3).
 *
 * Both functions return a value 0-100 plus a "level" of
 * good / fair / critical, which the frontend renders as a
 * green / amber / red badge.
 */

function levelFromScore(score) {
  if (score >= 75) return 'good';
  if (score >= 50) return 'fair';
  return 'critical';
}

/**
 * Vehicle Health Score
 * Factors:
 *  - Vehicle age (older = lower score)
 *  - Odometer reading (higher mileage = lower score)
 *  - Current status (maintenance/inactive/retired = penalty)
 *  - Overdue maintenance items (each overdue item = penalty)
 *
 * @param {object} vehicle - plain vehicle object (must include year, odometer_km, status)
 * @param {Array}  maintenanceRecords - maintenance rows for this vehicle
 */
function computeVehicleHealthScore(vehicle, maintenanceRecords = []) {
  let score = 100;
  const breakdown = [];

  // 1. Age penalty — up to -30
  const currentYear = new Date().getFullYear();
  const age = vehicle.year ? Math.max(0, currentYear - vehicle.year) : 0;
  const agePenalty = Math.min(age * 3, 30);
  if (agePenalty > 0) {
    score -= agePenalty;
    breakdown.push({ factor: 'Vehicle age', impact: -agePenalty, detail: `${age} years old` });
  }

  // 2. Odometer penalty — up to -30 (every 10,000 km = -2, capped)
  const odo = vehicle.odometer_km || 0;
  const odoPenalty = Math.min(Math.floor(odo / 10000) * 2, 30);
  if (odoPenalty > 0) {
    score -= odoPenalty;
    breakdown.push({ factor: 'Odometer reading', impact: -odoPenalty, detail: `${odo.toLocaleString()} km` });
  }

  // 3. Status penalty
  if (vehicle.status === 'maintenance') {
    score -= 20;
    breakdown.push({ factor: 'Currently in maintenance', impact: -20 });
  } else if (vehicle.status === 'inactive') {
    score -= 10;
    breakdown.push({ factor: 'Vehicle inactive', impact: -10 });
  } else if (vehicle.status === 'retired') {
    score = 0;
    breakdown.push({ factor: 'Vehicle retired', impact: -100 });
  }

  // 4. Overdue maintenance penalty — up to -30 (each overdue scheduled item = -10)
  const today = new Date();
  const overdue = maintenanceRecords.filter(m =>
    m.status === 'scheduled' && m.scheduled_date && new Date(m.scheduled_date) < today
  );
  if (overdue.length > 0) {
    const penalty = Math.min(overdue.length * 10, 30);
    score -= penalty;
    breakdown.push({ factor: 'Overdue maintenance', impact: -penalty, detail: `${overdue.length} item(s) overdue` });
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    health_score: score,
    health_level: levelFromScore(score),
    health_breakdown: breakdown,
  };
}

/**
 * Driver Safety Score
 * Factors:
 *  - Experience (more years = higher base score)
 *  - Completed trip count (more completed trips = small bonus, builds trust)
 *  - License expiry status (expired / expiring soon = penalty)
 *  - Driver status (suspended = critical)
 *
 * @param {object} driver - plain driver object (must include experience_years, license_expiry, status)
 * @param {number} completedTripCount
 */
function computeDriverSafetyScore(driver, completedTripCount = 0) {
  let score = 60; // base score
  const breakdown = [{ factor: 'Base score', impact: 60 }];

  // 1. Experience bonus — up to +25
  const exp = driver.experience_years || 0;
  const expBonus = Math.min(exp * 3, 25);
  if (expBonus > 0) {
    score += expBonus;
    breakdown.push({ factor: 'Driving experience', impact: expBonus, detail: `${exp} years` });
  }

  // 2. Completed trips bonus — up to +15
  const tripBonus = Math.min(completedTripCount * 1, 15);
  if (tripBonus > 0) {
    score += tripBonus;
    breakdown.push({ factor: 'Completed trips', impact: tripBonus, detail: `${completedTripCount} trips` });
  }

  // 3. License expiry penalty
  if (driver.license_expiry) {
    const expiry = new Date(driver.license_expiry);
    const today = new Date();
    const daysLeft = Math.floor((expiry - today) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) {
      score -= 30;
      breakdown.push({ factor: 'License expired', impact: -30, detail: `${Math.abs(daysLeft)} days ago` });
    } else if (daysLeft <= 30) {
      score -= 10;
      breakdown.push({ factor: 'License expiring soon', impact: -10, detail: `${daysLeft} days left` });
    }
  }

  // 4. Status penalty
  if (driver.status === 'suspended') {
    score = Math.min(score, 15);
    breakdown.push({ factor: 'Driver suspended', impact: 'capped at 15' });
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    safety_score: score,
    safety_level: levelFromScore(score),
    safety_breakdown: breakdown,
  };
}

module.exports = { computeVehicleHealthScore, computeDriverSafetyScore, levelFromScore };