from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from datetime import date

router = APIRouter()

# ── Schemas ───────────────────────────────────────────────────────────────────

class VehicleHealthRequest(BaseModel):
    vehicle_id: int
    registration_no: str
    year: int
    odometer_km: float
    fuel_type: Optional[str] = "diesel"
    status: Optional[str] = "active"
    maintenance_count: Optional[int] = 0
    overdue_maintenance: Optional[int] = 0
    fuel_logs_count: Optional[int] = 0
    avg_fuel_consumption: Optional[float] = 0.1
    last_service_days_ago: Optional[int] = 30
    total_trips: Optional[int] = 0
    alerts_count: Optional[int] = 0

class VehicleHealthResponse(BaseModel):
    vehicle_id: int
    registration_no: str
    health_score: float           # 0-100
    health_status: str            # Excellent, Good, Fair, Poor, Critical
    age_years: int
    odometer_score: float
    maintenance_score: float
    usage_score: float
    recommendations: List[str]
    estimated_value_pct: float    # % of original value remaining
    replacement_recommended: bool

# ── Scoring logic ─────────────────────────────────────────────────────────────

def score_age(year: int) -> float:
    age = date.today().year - year
    if age <= 2:   return 100.0
    if age <= 4:   return 85.0
    if age <= 6:   return 70.0
    if age <= 8:   return 55.0
    if age <= 10:  return 40.0
    return max(10.0, 40.0 - (age - 10) * 3)

def score_odometer(km: float) -> float:
    if km <= 30000:   return 100.0
    if km <= 60000:   return 85.0
    if km <= 100000:  return 70.0
    if km <= 150000:  return 50.0
    if km <= 200000:  return 30.0
    return max(5.0, 30.0 - (km - 200000) / 10000)

def score_maintenance(maintenance_count: int, overdue: int, days_since: int) -> float:
    base = 100.0
    base -= overdue * 20          # each overdue item -20
    base -= max(0, days_since - 90) * 0.2   # -0.2 per day past 90 days
    if maintenance_count == 0:
        base -= 20                # never serviced penalty
    return max(0.0, min(100.0, base))

def score_usage(total_trips: int, alerts: int) -> float:
    base = 100.0
    base -= alerts * 5            # each alert -5
    if total_trips > 500:
        base -= 10
    return max(0.0, min(100.0, base))

def depreciation(age: int, km: float) -> float:
    # Simple depreciation model
    age_dep = max(0, 1 - age * 0.12)
    km_dep = max(0, 1 - km / 300000)
    return round((age_dep * 0.6 + km_dep * 0.4) * 100, 1)

# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/score", response_model=VehicleHealthResponse)
def vehicle_health(req: VehicleHealthRequest):
    age = date.today().year - req.year

    s_age   = score_age(req.year)
    s_odo   = score_odometer(req.odometer_km)
    s_maint = score_maintenance(req.maintenance_count, req.overdue_maintenance, req.last_service_days_ago)
    s_usage = score_usage(req.total_trips, req.alerts_count)

    # Weighted average
    health = (s_age * 0.25 + s_odo * 0.30 + s_maint * 0.30 + s_usage * 0.15)
    health = round(health, 1)

    if health >= 85:   status = "Excellent"
    elif health >= 70: status = "Good"
    elif health >= 50: status = "Fair"
    elif health >= 30: status = "Poor"
    else:              status = "Critical"

    recommendations = []
    if req.overdue_maintenance > 0:
        recommendations.append(f"{req.overdue_maintenance} maintenance item(s) overdue — service immediately")
    if req.last_service_days_ago > 180:
        recommendations.append("No service in 6+ months — schedule inspection")
    if req.odometer_km > 150000:
        recommendations.append("High mileage vehicle — increase inspection frequency")
    if age > 10:
        recommendations.append("Vehicle is over 10 years old — evaluate replacement")
    if req.alerts_count > 5:
        recommendations.append("Multiple alerts recorded — investigate root cause")
    if not recommendations:
        recommendations.append("Vehicle is in good health — continue routine maintenance")

    est_value = depreciation(age, req.odometer_km)
    replacement = health < 30 or (age > 12 and req.odometer_km > 200000)

    return VehicleHealthResponse(
        vehicle_id=req.vehicle_id,
        registration_no=req.registration_no,
        health_score=health,
        health_status=status,
        age_years=age,
        odometer_score=round(s_odo, 1),
        maintenance_score=round(s_maint, 1),
        usage_score=round(s_usage, 1),
        recommendations=recommendations,
        estimated_value_pct=est_value,
        replacement_recommended=replacement,
    )

@router.post("/batch")
def vehicle_health_batch(vehicles: List[VehicleHealthRequest]):
    return [vehicle_health(v) for v in vehicles]