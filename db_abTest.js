const mysql = require("mysql2");
require("dotenv").config();

// สร้าง pool connection
const pool = mysql.createPool({
  host: process.env.host,
  user: process.env.user,
  password: process.env.password,
  database: process.env.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool; // ไม่ต้องใส่ `.promise()` เพราะใช้ callback ใน queryPromise
