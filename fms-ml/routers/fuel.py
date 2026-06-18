from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
from datetime import datetime, timedelta

router = APIRouter()

# ── Schemas ──────────────────────────────────────────────────────────────────

class FuelLogEntry(BaseModel):
    vehicle_id: int
    litres: float
    odometer_km: float
    filled_at: str  # ISO date string
    fuel_type: Optional[str] = "diesel"

class FuelPredictionRequest(BaseModel):
    vehicle_id: int
    fuel_logs: List[FuelLogEntry]
    predict_days: Optional[int] = 30

class FuelPredictionResponse(BaseModel):
    vehicle_id: int
    avg_consumption_per_km: float
    avg_litres_per_fillup: float
    predicted_litres_next_period: float
    predicted_cost_inr: float
    efficiency_trend: str  # "improving", "stable", "degrading"
    next_fillup_estimate_days: int
    anomalies: List[str]
    confidence: float

# ── Helpers ───────────────────────────────────────────────────────────────────

def linear_trend(values: List[float]) -> float:
    """Returns slope of linear regression over values."""
    if len(values) < 2:
        return 0.0
    n = len(values)
    x = list(range(n))
    x_mean = sum(x) / n
    y_mean = sum(values) / n
    num = sum((x[i] - x_mean) * (values[i] - y_mean) for i in range(n))
    den = sum((x[i] - x_mean) ** 2 for i in range(n))
    return num / den if den != 0 else 0.0

FUEL_PRICE_INR = {"diesel": 95.0, "petrol": 105.0, "electric": 0.0, "hybrid": 80.0}

# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/predict", response_model=FuelPredictionResponse)
def predict_fuel(req: FuelPredictionRequest):
    logs = sorted(req.fuel_logs, key=lambda x: x.filled_at)
    anomalies = []

    if len(logs) < 2:
        return FuelPredictionResponse(
            vehicle_id=req.vehicle_id,
            avg_consumption_per_km=0.1,
            avg_litres_per_fillup=40.0,
            predicted_litres_next_period=40.0 * (req.predict_days / 7),
            predicted_cost_inr=40.0 * (req.predict_days / 7) * 95.0,
            efficiency_trend="stable",
            next_fillup_estimate_days=7,
            anomalies=["Insufficient data — using fleet averages"],
            confidence=0.3,
        )

    # Consumption per km between fillups
    consumptions = []
    for i in range(1, len(logs)):
        km_diff = logs[i].odometer_km - logs[i - 1].odometer_km
        if km_diff > 0:
            c = logs[i].litres / km_diff
            consumptions.append(c)
            # Anomaly: consumption spike > 50% above average
            if len(consumptions) > 1:
                avg_so_far = np.mean(consumptions[:-1])
                if c > avg_so_far * 1.5:
                    anomalies.append(f"High consumption on {logs[i].filled_at[:10]}: {c:.3f} L/km")

    avg_consumption = float(np.mean(consumptions)) if consumptions else 0.1
    avg_litres = float(np.mean([l.litres for l in logs]))

    # Days between fillups
    dates = [datetime.fromisoformat(l.filled_at[:10]) for l in logs]
    day_gaps = [(dates[i] - dates[i - 1]).days for i in range(1, len(dates))]
    avg_gap = float(np.mean(day_gaps)) if day_gaps else 7.0

    # Predicted litres for period
    predicted_litres = avg_litres * (req.predict_days / avg_gap)

    # Fuel price
    fuel_type = logs[-1].fuel_type or "diesel"
    price = FUEL_PRICE_INR.get(fuel_type, 95.0)
    predicted_cost = predicted_litres * price

    # Efficiency trend (slope of consumption over time)
    slope = linear_trend(consumptions)
    if slope < -0.001:
        trend = "improving"
    elif slope > 0.001:
        trend = "degrading"
        anomalies.append("Fuel efficiency is degrading — consider maintenance check")
    else:
        trend = "stable"

    # Confidence: more data = higher confidence, cap at 0.95
    confidence = min(0.95, 0.3 + len(logs) * 0.05)

    return FuelPredictionResponse(
        vehicle_id=req.vehicle_id,
        avg_consumption_per_km=round(avg_consumption, 4),
        avg_litres_per_fillup=round(avg_litres, 2),
        predicted_litres_next_period=round(predicted_litres, 2),
        predicted_cost_inr=round(predicted_cost, 2),
        efficiency_trend=trend,
        next_fillup_estimate_days=round(avg_gap),
        anomalies=anomalies,
        confidence=round(confidence, 2),
    )


@router.post("/batch")
def predict_fuel_batch(vehicles: List[FuelPredictionRequest]):
    """Predict for multiple vehicles at once."""
    return [predict_fuel(v) for v in vehicles]