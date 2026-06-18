from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
import statistics

router = APIRouter()

# ── Schemas ───────────────────────────────────────────────────────────────────

class SpeedPoint(BaseModel):
    timestamp: str
    speed_kmh: float
    latitude: Optional[float]
    longitude: Optional[float]

class TripData(BaseModel):
    vehicle_id: int
    trip_id: int
    gps_points: List[SpeedPoint]
    driver_id: Optional[int]

class AnomalyResult(BaseModel):
    vehicle_id: int
    trip_id: int
    anomalies: List[dict]
    risk_score: float
    summary: str

# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/detect", response_model=AnomalyResult)
def detect_anomalies(trip: TripData):
    anomalies = []
    points = trip.gps_points

    if not points:
        return AnomalyResult(vehicle_id=trip.vehicle_id, trip_id=trip.trip_id,
                             anomalies=[], risk_score=0.0, summary="No GPS data")

    speeds = [p.speed_kmh for p in points]
    avg_speed = statistics.mean(speeds) if speeds else 0
    max_speed = max(speeds) if speeds else 0

    # 1. Speeding detection (>80 km/h)
    speeding_points = [p for p in points if p.speed_kmh > 80]
    if speeding_points:
        anomalies.append({
            "type": "speeding",
            "severity": "high" if max_speed > 100 else "medium",
            "detail": f"Speed exceeded 80 km/h at {len(speeding_points)} points. Max: {max_speed:.1f} km/h",
            "timestamp": speeding_points[0].timestamp,
        })

    # 2. Sudden acceleration / hard braking
    for i in range(1, len(points)):
        delta = abs(points[i].speed_kmh - points[i - 1].speed_kmh)
        if delta > 30:
            anomalies.append({
                "type": "harsh_driving",
                "severity": "medium",
                "detail": f"Sudden speed change of {delta:.1f} km/h detected",
                "timestamp": points[i].timestamp,
            })

    # 3. Prolonged idling (speed=0 for many points)
    idle_count = sum(1 for p in points if p.speed_kmh == 0)
    idle_pct = (idle_count / len(points)) * 100
    if idle_pct > 30:
        anomalies.append({
            "type": "excessive_idling",
            "severity": "low",
            "detail": f"Vehicle idle {idle_pct:.1f}% of trip — wasting fuel",
            "timestamp": points[0].timestamp,
        })

    # Risk score
    risk = 0.0
    for a in anomalies:
        if a["severity"] == "high":   risk += 30
        elif a["severity"] == "medium": risk += 15
        elif a["severity"] == "low":    risk += 5
    risk = min(100.0, risk)

    if risk >= 60:
        summary = "High risk trip — driver coaching recommended"
    elif risk >= 30:
        summary = "Moderate driving issues detected"
    else:
        summary = "Trip within acceptable parameters"

    return AnomalyResult(
        vehicle_id=trip.vehicle_id,
        trip_id=trip.trip_id,
        anomalies=anomalies,
        risk_score=round(risk, 1),
        summary=summary,
    )