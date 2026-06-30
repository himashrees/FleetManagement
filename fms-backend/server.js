require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const path       = require('path');

const sessionMiddleware           = require('./src/config/session');
const { sequelize }               = require('./src/models');
const setupSocket                 = require('./src/utils/socket');
const { startAlertScheduler }     = require('./src/utils/alertChecker');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: process.env.CLIENT_URL, credentials: true },
});

app.set('io', io);
app.use(helmet());
app.use(morgan('dev'));
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sessionMiddleware);

// ── Disable HTTP caching on every /api response ──────────────────────────────
// Without this, the browser was returning cached 304s for GET /api/trips
// (and other endpoints) instead of re-running the route + session middleware,
// which made driver-scoped queries (scopeDriverTo) appear to "not run" on
// repeat requests even though the code was correct.
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth',        require('./src/routes/auth.routes'));
app.use('/api/users',       require('./src/routes/user.routes'));
app.use('/api/vehicles',    require('./src/routes/vehicle.routes'));
app.use('/api/drivers',     require('./src/routes/driver.routes'));
app.use('/api/gps',         require('./src/routes/gps.routes'));
app.use('/api/fuel',        require('./src/routes/fuel.routes'));
app.use('/api/maintenance', require('./src/routes/maintenance.routes'));
app.use('/api/documents',   require('./src/routes/document.routes'));
app.use('/api/trips',       require('./src/routes/trip.routes'));
app.use('/api/alerts',      require('./src/routes/alert.routes'));
app.use('/api/reports',     require('./src/routes/report.routes'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

setupSocket(io);

const PORT = process.env.PORT || 5000;

// Use plain sync() for normal dev runs — it creates missing tables but
// won't touch existing ones, so nodemon restarts can't keep stacking
// duplicate indexes on unique columns (which hits MySQL's 64-key limit).
// When you've actually changed a model and need columns/indexes updated,
// run once with:  SYNC_ALTER=true npm run dev
const syncOptions = process.env.SYNC_ALTER === 'true' ? { alter: true } : {};

sequelize.sync(syncOptions)
  .then(() => {
    console.log('✅ MySQL connected & tables synced');
    return sessionMiddleware.sessionStore.sync();
  })
  .then(() => {
    console.log('✅ Session store ready');
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      startAlertScheduler(io);
      console.log('🔔 Alert scheduler started');
    });
  })
  .catch((err) => {
    console.error('❌ DB connection failed:', err.message);
    process.exit(1);
  });