from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from datetime import date

router = APIRouter()

# ── Schemas ───────────────────────────────────────────────────────────────────

class DriverSafetyRequest(BaseModel):
    driver_id: int
    name: str
    experience_years: Optional[int] = 0
    total_trips: Optional[int] = 0
    total_km: Optional[float] = 0
    speeding_incidents: Optional[int] = 0
    harsh_braking_incidents: Optional[int] = 0
    idle_violations: Optional[int] = 0
    license_expiry: Optional[str] = None   # ISO date string
    alerts_count: Optional[int] = 0
    on_time_trips: Optional[int] = 0
    accidents: Optional[int] = 0

class DriverSafetyResponse(BaseModel):
    driver_id: int
    name: str
    safety_score: float          # 0-100
    safety_rating: str           # Excellent, Good, Average, Poor, Dangerous
    speeding_score: float
    behaviour_score: float
    experience_score: float
    reliability_score: float
    license_days_remaining: Optional[int]
    license_status: str          # Valid, Expiring Soon, Expired
    recommendations: List[str]
    eligible_for_bonus: bool
    requires_training: bool

# ── Scoring ───────────────────────────────────────────────────────────────────

def score_speeding(incidents: int, trips: int) -> float:
    if trips == 0: return 80.0
    rate = incidents / trips
    if rate == 0:      return 100.0
    if rate <= 0.05:   return 85.0
    if rate <= 0.10:   return 65.0
    if rate <= 0.20:   return 45.0
    return max(10.0, 45.0 - rate * 100)

def score_behaviour(harsh: int, idle: int, accidents: int, trips: int) -> float:
    base = 100.0
    if trips > 0:
        base -= (harsh / trips) * 30
        base -= (idle / trips) * 15
    base -= accidents * 25
    return max(0.0, min(100.0, base))

def score_experience(years: int, total_km: float) -> float:
    exp_score = min(100.0, years * 10)
    km_score  = min(100.0, total_km / 1000)
    return round(exp_score * 0.5 + km_score * 0.5, 1)

def score_reliability(on_time: int, total: int, alerts: int) -> float:
    if total == 0: return 80.0
    on_time_pct = (on_time / total) * 100
    base = on_time_pct - alerts * 3
    return max(0.0, min(100.0, base))

def check_license(expiry_str: Optional[str]):
    if not expiry_str:
        return None, "Unknown"
    try:
        expiry = date.fromisoformat(expiry_str[:10])
        days = (expiry - date.today()).days
        if days < 0:
            return days, "Expired"
        elif days <= 30:
            return days, "Expiring Soon"
        else:
            return days, "Valid"
    except:
        return None, "Unknown"

# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/score", response_model=DriverSafetyResponse)
def driver_safety(req: DriverSafetyRequest):
    s_speed   = score_speeding(req.speeding_incidents, req.total_trips)
    s_behav   = score_behaviour(req.harsh_braking_incidents, req.idle_violations, req.accidents, req.total_trips)
    s_exp     = score_experience(req.experience_years, req.total_km)
    s_rel     = score_reliability(req.on_time_trips, req.total_trips, req.alerts_count)

    safety = round(s_speed * 0.30 + s_behav * 0.35 + s_exp * 0.15 + s_rel * 0.20, 1)

    if safety >= 90:   rating = "Excellent"
    elif safety >= 75: rating = "Good"
    elif safety >= 55: rating = "Average"
    elif safety >= 35: rating = "Poor"
    else:              rating = "Dangerous"

    license_days, license_status = check_license(req.license_expiry)

    recommendations = []
    if req.accidents > 0:
        recommendations.append(f"{req.accidents} accident(s) recorded — mandatory safety review required")
    if req.speeding_incidents > 3:
        recommendations.append("Frequent speeding — assign speed awareness training")
    if req.harsh_braking_incidents > 5:
        recommendations.append("Harsh braking detected — defensive driving course recommended")
    if license_status == "Expired":
        recommendations.append("License EXPIRED — driver must not operate vehicles")
    elif license_status == "Expiring Soon":
        recommendations.append(f"License expiring in {license_days} days — renew immediately")
    if safety >= 90 and req.total_trips > 50:
        recommendations.append("Excellent driver — eligible for performance bonus")
    if not recommendations:
        recommendations.append("Driver performing well — continue monitoring")

    return DriverSafetyResponse(
        driver_id=req.driver_id,
        name=req.name,
        safety_score=safety,
        safety_rating=rating,
        speeding_score=round(s_speed, 1),
        behaviour_score=round(s_behav, 1),
        experience_score=round(s_exp, 1),
        reliability_score=round(s_rel, 1),
        license_days_remaining=license_days,
        license_status=license_status,
        recommendations=recommendations,
        eligible_for_bonus=(safety >= 90 and req.total_trips > 50),
        requires_training=(safety < 55 or req.accidents > 0),
    )

@router.post("/batch")
def driver_safety_batch(drivers: List[DriverSafetyRequest]):
    return [driver_safety(d) for d in drivers]