// const mysql = require("mysql2");
require("dotenv").config();
const mysql = require("mysql2/promise");

// const pool = mysql.createPool({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
// });

// console.log("DB_HOST ", process.env.DB_HOST);
// console.log("DB_USER ", process.env.DB_USER);

// เชื่อมต่อฐานข้อมูล MySQL
const pool = mysql.createPool({
  host: process.env.host,
  user: process.env.user,
  password: process.env.password,
  // database: "PETIVERSE",
  database: process.env.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
module.exports = pool;
