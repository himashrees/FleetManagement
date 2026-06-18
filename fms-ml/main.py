from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import fuel, maintenance, anomaly, vehicle_health, driver_safety
import uvicorn

app = FastAPI(title="FleetOS ML Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(fuel.router,           prefix="/ml/fuel",           tags=["Fuel Prediction"])
app.include_router(maintenance.router,    prefix="/ml/maintenance",    tags=["Maintenance Prediction"])
app.include_router(anomaly.router,        prefix="/ml/anomaly",        tags=["Anomaly Detection"])
app.include_router(vehicle_health.router, prefix="/ml/vehicle",        tags=["Vehicle Health"])
app.include_router(driver_safety.router,  prefix="/ml/driver",         tags=["Driver Safety"])

@app.get("/")
def root():
    return {"service": "FleetOS ML", "status": "running", "version": "1.0.0"}

@app.get("/health")
def health():
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)