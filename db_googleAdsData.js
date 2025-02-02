// const mysql = require("mysql2");
require("dotenv").config();
const mysql = require("mysql2/promise");

// เชื่อมต่อฐานข้อมูล MySQL
const db = mysql.createConnection({
  host: process.env.host,
  user: process.env.user,
  password: process.env.password,
  // database: "PETIVERSE",
  database: process.env.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
module.exports = db;
