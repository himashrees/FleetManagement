require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const path       = require('path');

const sessionMiddleware = require('./src/config/session');
const { sequelize }     = require('./src/models');
const setupSocket       = require('./src/utils/socket');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: process.env.CLIENT_URL, credentials: true },
});

app.set('io', io);
app.use(helmet());
app.use(morgan('dev'));
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);
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
sequelize.sync({ alter: true })
  .then(() => {
    console.log('✅ PostgreSQL connected & tables synced');
    server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('❌ DB connection failed:', err.message);
    process.exit(1);
  });