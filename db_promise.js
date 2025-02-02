const mysql = require("mysql2");
require("dotenv").config();

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

// console.log("DB_HOST ", process.env.DB_HOST);
// console.log("DB_USER ", process.env.DB_USER);

module.exports = pool.promise();
