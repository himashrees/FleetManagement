const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const sequelize = require('./database');

const sessionStore = new SequelizeStore({
  db: sequelize,
  tableName: 'user_sessions',
});

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    maxAge: parseInt(process.env.SESSION_MAX_AGE),
  },
});

sessionStore.sync();

module.exports = sessionMiddleware;