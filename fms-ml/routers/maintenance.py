from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date, timedelta

router = APIRouter()

# ── Schemas ───────────────────────────────────────────────────────────────────

class MaintenanceRecord(BaseModel):
    type: str                         # oil_change, tire, brake, engine, electrical, body, other
    completed_date: Optional[str]
    odometer_km: Optional[float]
    cost: Optional[float]
    next_due_km: Optional[float]
    next_due_date: Optional[str]

class VehicleState(BaseModel):
    vehicle_id: int
    registration_no: str
    current_odometer_km: float
    last_service_date: Optional[str]
    maintenance_records: List[MaintenanceRecord]

class MaintenancePrediction(BaseModel):
    vehicle_id: int
    registration_no: str
    risk_score: float               # 0-100
    risk_level: str                 # low, medium, high, critical
    overdue_items: List[str]
    due_soon_items: List[str]
    predicted_next_service_days: int
    estimated_cost_inr: float
    recommendations: List[str]

# ── Service intervals (km) ────────────────────────────────────────────────────

SERVICE_INTERVALS_KM = {
    "oil_change":   5000,
    "tire":         20000,
    "brake":        30000,
    "engine":       50000,
    "electrical":   40000,
    "body":         None,   # time-based
    "other":        10000,
}

# Average cost per service type in INR
SERVICE_COST_INR = {
    "oil_change":  2500,
    "tire":        8000,
    "brake":       5000,
    "engine":      15000,
    "electrical":  4000,
    "body":        3000,
    "other":       2000,
}

# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/predict", response_model=MaintenancePrediction)
def predict_maintenance(vehicle: VehicleState):
    overdue = []
    due_soon = []
    recommendations = []
    total_cost = 0.0

    today = date.today()
    current_km = vehicle.current_odometer_km

    # Group latest record per type
    latest = {}
    for r in vehicle.maintenance_records:
        if r.type not in latest or (r.completed_date or "") > (latest[r.type].completed_date or ""):
            latest[r.type] = r

    for stype, interval_km in SERVICE_INTERVALS_KM.items():
        rec = latest.get(stype)

        # Check next_due_km override
        if rec and rec.next_due_km:
            km_remaining = rec.next_due_km - current_km
            if km_remaining <= 0:
                overdue.append(f"{stype.replace('_', ' ').title()} — overdue by {abs(km_remaining):.0f} km")
                total_cost += SERVICE_COST_INR.get(stype, 2000)
            elif km_remaining <= 1000:
                due_soon.append(f"{stype.replace('_', ' ').title()} — due in {km_remaining:.0f} km")

        # Check next_due_date override
        elif rec and rec.next_due_date:
            due_date = date.fromisoformat(rec.next_due_date)
            days_remaining = (due_date - today).days
            if days_remaining <= 0:
                overdue.append(f"{stype.replace('_', ' ').title()} — overdue by {abs(days_remaining)} days")
                total_cost += SERVICE_COST_INR.get(stype, 2000)
            elif days_remaining <= 14:
                due_soon.append(f"{stype.replace('_', ' ').title()} — due in {days_remaining} days")

        # Estimate from interval + last service km
        elif interval_km and rec and rec.odometer_km:
            km_since = current_km - rec.odometer_km
            km_remaining = interval_km - km_since
            if km_remaining <= 0:
                overdue.append(f"{stype.replace('_', ' ').title()} — overdue by {abs(km_remaining):.0f} km")
                total_cost += SERVICE_COST_INR.get(stype, 2000)
            elif km_remaining <= 1000:
                due_soon.append(f"{stype.replace('_', ' ').title()} — due in {km_remaining:.0f} km")

        # Never serviced
        elif interval_km and not rec and current_km > interval_km:
            overdue.append(f"{stype.replace('_', ' ').title()} — no record found, likely overdue")
            total_cost += SERVICE_COST_INR.get(stype, 2000)

    # Risk score
    risk_score = min(100.0, len(overdue) * 25.0 + len(due_soon) * 10.0)
    if risk_score >= 75:
        risk_level = "critical"
        recommendations.append("Immediate workshop visit required")
    elif risk_score >= 50:
        risk_level = "high"
        recommendations.append("Schedule service within 3 days")
    elif risk_score >= 25:
        risk_level = "medium"
        recommendations.append("Schedule service within 2 weeks")
    else:
        risk_level = "low"
        recommendations.append("Vehicle in good condition — routine monitoring")

    if len(overdue) > 2:
        recommendations.append("Multiple items overdue — vehicle may be unsafe to operate")

    # Next service estimate in days
    if overdue:
        next_service_days = 0
    elif due_soon:
        next_service_days = 7
    else:
        next_service_days = 30

    return MaintenancePrediction(
        vehicle_id=vehicle.vehicle_id,
        registration_no=vehicle.registration_no,
        risk_score=round(risk_score, 1),
        risk_level=risk_level,
        overdue_items=overdue,
        due_soon_items=due_soon,
        predicted_next_service_days=next_service_days,
        estimated_cost_inr=round(total_cost, 2),
        recommendations=recommendations,
    )


@router.post("/batch")
def predict_maintenance_batch(vehicles: List[VehicleState]):
    return [predict_maintenance(v) for v in vehicles]