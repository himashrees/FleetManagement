const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Document = sequelize.define('Document', {
  id:                { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  vehicle_id:        { type: DataTypes.INTEGER },
  driver_id:         { type: DataTypes.INTEGER },
  type:              { type: DataTypes.ENUM('insurance','registration','permit','license','pollution','other') },
  title:             { type: DataTypes.STRING(150), allowNull: false },
  document_no:       { type: DataTypes.STRING(100) },
  file_path:         { type: DataTypes.STRING(300) },
  expiry_date:       { type: DataTypes.DATEONLY },
  issued_date:       { type: DataTypes.DATEONLY },
  issuing_authority: { type: DataTypes.STRING(100) },
  notes:             { type: DataTypes.TEXT },
}, { tableName: 'documents', timestamps: true });

module.exports = Document;