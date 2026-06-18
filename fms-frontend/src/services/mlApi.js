import axios from 'axios'

const ml = axios.create({
  baseURL: 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
})

export const mlFuelAPI = {
  predict:      (data) => ml.post('/ml/fuel/predict', data),
  predictBatch: (data) => ml.post('/ml/fuel/batch', data),
}

export const mlMaintenanceAPI = {
  predict:      (data) => ml.post('/ml/maintenance/predict', data),
  predictBatch: (data) => ml.post('/ml/maintenance/batch', data),
}

export const mlAnomalyAPI = {
  detect: (data) => ml.post('/ml/anomaly/detect', data),
}

export const mlVehicleAPI = {
  score:      (data) => ml.post('/ml/vehicle/score', data),
  scoreBatch: (data) => ml.post('/ml/vehicle/batch', data),
}

export const mlDriverAPI = {
  score:      (data) => ml.post('/ml/driver/score', data),
  scoreBatch: (data) => ml.post('/ml/driver/batch', data),
}

export default ml