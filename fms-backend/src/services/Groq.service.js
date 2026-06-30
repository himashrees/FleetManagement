// services/groq.service.js
// Groq-powered narrative intelligence for FleetOS reports.
// Uses llama-3.3-70b-versatile — fastest + smartest available on Groq free tier.

const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';

/**
 * Core helper — send a prompt, get plain text back.
 * All report functions go through here.
 */
async function ask(systemPrompt, userContent, maxTokens = 400) {
  const chat = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: maxTokens,
    temperature: 0.4,   // low = factual, consistent
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userContent  },
    ],
  });
  return chat.choices[0]?.message?.content?.trim() ?? '';
}

// ── System prompt shared across all fleet reports ─────────────────────────────
const FLEET_SYSTEM = `You are FleetOS AI, an expert fleet operations analyst.
You receive structured fleet data and return concise, actionable insight in plain English.
Rules:
- Never invent numbers not present in the data.
- Be specific — name vehicles, drivers, or dates when the data includes them.
- Flag risks clearly with [RISK], savings opportunities with [SAVE], and positive trends with [GOOD].
- Keep responses under 5 bullet points unless asked otherwise.
- No fluff. Fleet managers are busy — get to the point.
- Format: bullet points starting with •`;


// ─────────────────────────────────────────────────────────────────────────────
// 1. FLEET SUMMARY INSIGHT
// ─────────────────────────────────────────────────────────────────────────────
async function fleetSummaryInsight(data) {
  const content = `
Fleet Snapshot:
- Total vehicles: ${data.totalVehicles}, Active: ${data.activeVehicles}, Inactive: ${data.totalVehicles - data.activeVehicles}
- Total drivers: ${data.totalDrivers}, Available: ${data.availableDrivers}, Busy/offline: ${data.totalDrivers - data.availableDrivers}
- Trips completed today: ${data.tripsToday}
- Maintenance jobs overdue/due today: ${data.maintenanceDue}

Generate a fleet health briefing. Flag anything urgent. Suggest one immediate action.`;

  return ask(FLEET_SYSTEM, content, 350);
}


// ─────────────────────────────────────────────────────────────────────────────
// 2. FUEL REPORT INSIGHT
// ─────────────────────────────────────────────────────────────────────────────
async function fuelReportInsight(data, from, to) {
  // Build per-vehicle breakdown if logs are available
  const vehicleBreakdown = buildVehicleBreakdown(data.logs || []);

  const content = `
Fuel Report${from && to ? ` (${from} to ${to})` : ''}:
- Total litres consumed: ${data.totalLitres} L
- Total fuel cost: ₹${data.totalCost}
- Number of fill-up records: ${data.records}
- Cost per litre average: ₹${data.records > 0 ? (data.totalCost / data.totalLitres).toFixed(2) : 'N/A'}
${vehicleBreakdown ? `\nPer-vehicle breakdown:\n${vehicleBreakdown}` : ''}

Analyse fuel efficiency. Identify wastage if any. Give cost-saving recommendations.`;

  return ask(FLEET_SYSTEM, content, 400);
}


// ─────────────────────────────────────────────────────────────────────────────
// 3. TRIP REPORT INSIGHT
// ─────────────────────────────────────────────────────────────────────────────
async function tripReportInsight(data, filters) {
  const trips = data.trips || [];

  // Derive useful stats from trip list
  const avgKmPerTrip = trips.length
    ? (trips.reduce((s, t) => s + (t.distance_km || 0), 0) / trips.length).toFixed(1)
    : 0;

  const longestTrip = trips.reduce((max, t) =>
    (t.distance_km || 0) > (max.distance_km || 0) ? t : max, trips[0] || {});

  const driverTripCount = {};
  trips.forEach(t => {
    if (t.driver_id) driverTripCount[t.driver_id] = (driverTripCount[t.driver_id] || 0) + 1;
  });
  const topDriverEntry = Object.entries(driverTripCount).sort((a, b) => b[1] - a[1])[0];

  const content = `
Trip Report${filters?.from && filters?.to ? ` (${filters.from} to ${filters.to})` : ''}:
- Total completed trips: ${data.totalTrips}
- Total distance covered: ${data.totalKm} km
- Average km per trip: ${avgKmPerTrip} km
- Longest single trip: ${longestTrip?.distance_km || 0} km (Trip ID: ${longestTrip?.id || 'N/A'})
- Most active driver ID: ${topDriverEntry ? `${topDriverEntry[0]} (${topDriverEntry[1]} trips)` : 'N/A'}
${filters?.driver_id ? `- Filtered for driver ID: ${filters.driver_id}` : ''}

Analyse trip efficiency and driver utilisation. Flag underutilisation or overwork. Suggest optimisations.`;

  return ask(FLEET_SYSTEM, content, 400);
}


// ─────────────────────────────────────────────────────────────────────────────
// 4. COMBINED EXECUTIVE SUMMARY  (bonus — all 3 datasets in one call)
// ─────────────────────────────────────────────────────────────────────────────
async function executiveSummary({ fleet, fuel, trips }) {
  const content = `
Weekly Fleet Executive Summary:

Fleet: ${fleet.activeVehicles}/${fleet.totalVehicles} vehicles active, ${fleet.maintenanceDue} maintenance overdue.
Fuel: ${fuel.totalLitres}L consumed, ₹${fuel.totalCost} spent across ${fuel.records} fill-ups.
Trips: ${trips.totalTrips} completed, ${trips.totalKm} km total.

Write a 4-bullet executive summary a fleet manager would read in 30 seconds.
Include one [RISK], one [SAVE], one [GOOD] point if the data supports it.`;

  return ask(FLEET_SYSTEM, content, 500);
}


// ─────────────────────────────────────────────────────────────────────────────
// Helper: group fuel logs by vehicle for richer context
// ─────────────────────────────────────────────────────────────────────────────
function buildVehicleBreakdown(logs) {
  if (!logs.length) return null;
  const map = {};
  logs.forEach(l => {
    const key = l.vehicle_id || 'unknown';
    if (!map[key]) map[key] = { litres: 0, cost: 0, fills: 0 };
    map[key].litres += l.litres || 0;
    map[key].cost   += parseFloat(l.total_cost || 0);
    map[key].fills  += 1;
  });
  return Object.entries(map)
    .sort((a, b) => b[1].litres - a[1].litres)
    .slice(0, 5)   // top 5 consumers
    .map(([vid, d]) => `  Vehicle ${vid}: ${d.litres.toFixed(1)}L | ₹${d.cost.toFixed(0)} | ${d.fills} fill-ups`)
    .join('\n');
}


module.exports = {
  fleetSummaryInsight,
  fuelReportInsight,
  tripReportInsight,
  executiveSummary,
};