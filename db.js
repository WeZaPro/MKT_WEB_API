// const mysql = require("mysql2");
require("dotenv").config();
var mysql = require("mysql");

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

const pool = mysql.createPool({
  connectionLimit: 10, // จำนวน connection สูงสุด
  host: process.env.host,
  user: process.env.user,
  password: process.env.password,
  // database: "PETIVERSE",
  database: process.env.database,
});

module.exports = pool;
