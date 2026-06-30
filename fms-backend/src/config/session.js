const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const sequelize = require('./database');

const sessionStore = new SequelizeStore({
  db: sequelize,
  tableName: 'user_sessions',
  checkExpirationInterval: 15 * 60 * 1000, // clean expired sessions every 15 min
  expiration: parseInt(process.env.SESSION_MAX_AGE) || 86400000,
});

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    maxAge: parseInt(process.env.SESSION_MAX_AGE) || 86400000,
  },
});

module.exports = sessionMiddleware;
module.exports.sessionStore = sessionStore;