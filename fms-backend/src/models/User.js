const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id:                   { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name:                 { type: DataTypes.STRING(100), allowNull: false },
  email:                { type: DataTypes.STRING(150), allowNull: false, unique: true },
  password:             { type: DataTypes.STRING(255), allowNull: false },
  role:                 { type: DataTypes.ENUM('admin','manager','driver'), defaultValue: 'driver' },
  phone:                { type: DataTypes.STRING(20) },
  is_active:            { type: DataTypes.BOOLEAN, defaultValue: true },
  reset_password_token: { type: DataTypes.STRING(255), allowNull: true },
  reset_password_expires: { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'users', timestamps: true });

module.exports = User;