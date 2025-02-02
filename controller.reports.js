const express = require("express");
const cors = require("cors");
var dbs = require("./db");
const path = require("path");
const fs = require("fs");
// const bcrypt = require("bcrypt");
// const mysql = require("mysql2");
// var mysql = require("mysql");
const axios = require("axios");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
// const PORT = 3000;
// app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true })); // Allow handling FormData
app.use(bodyParser.json());

//My Sql

// const dbs = mysql.createPool({
//   connectionLimit: 10, // จำนวน connection สูงสุด
//   host: process.env.host,
//   user: process.env.user,
//   password: process.env.password,
//   database: process.env.database,
// });
//
exports.getRegisterData = async (req, res) => {
  try {
    // ตรวจสอบว่ามี username หรือ phone อยู่ในฐานข้อมูลหรือไม่
    const result = await new Promise((resolve, reject) => {
      dbs.query(
        "SELECT * FROM register_data", // ดึงข้อมูลทั้งหมดจาก register_data
        (error, results) => {
          if (error) {
            reject(error);
          } else {
            // console.log("results in ", results); // ตรวจสอบผลลัพธ์ที่ได้
            resolve(results);
          }
        }
      );
    });
    // console.log("result out ", result);
    return res.status(200).json({
      message: "Get Report",
      data: result, // ส่งข้อมูลทั้งหมดที่ดึงจากฐานข้อมูล
    });
  } catch (error) {
    console.error("Error during user registration:", error);
    return res.status(500).json({
      message: "Error registering user",
      error: error.message || error,
    });
  }
};

exports.getReport = async (req, res) => {
  try {
    // ตรวจสอบว่ามี username หรือ phone อยู่ในฐานข้อมูลหรือไม่
    const result = await new Promise((resolve, reject) => {
      dbs.query(
        "SELECT * FROM report_sample", // ดึงข้อมูลทั้งหมดจาก report_sample
        (error, results) => {
          if (error) {
            reject(error);
          } else {
            // console.log("results in ", results); // ตรวจสอบผลลัพธ์ที่ได้
            resolve(results);
          }
        }
      );
    });
    // console.log("result out ", result);
    return res.status(200).json({
      message: "Get Report",
      data: result, // ส่งข้อมูลทั้งหมดที่ดึงจากฐานข้อมูล
    });
  } catch (error) {
    console.error("Error during user registration:", error);
    return res.status(500).json({
      message: "Error registering user",
      error: error.message || error,
    });
  }
};

exports.public = async (req, res) => {
  try {
    return res.status(201).json({ message: "Get Public" });
  } catch (error) {
    console.error("Error during user registration:", error);
    return res.status(500).json({
      message: "Error registering user",
      error: error.message || error,
    });
  }
};
