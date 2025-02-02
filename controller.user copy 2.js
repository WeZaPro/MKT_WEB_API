const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid"); // Use UUID for unique IDs
// const mysql = require("mysql2");
// var mysql = require("mysql");
var dbs = require("./db");
const axios = require("axios");
require("dotenv").config();
const line = require("@line/bot-sdk");
const jwt = require("jsonwebtoken");

const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true })); // Allow handling FormData
app.use(bodyParser.json());

const folder_name = "uploads_fileRegisterForm";

// app.use(
//   "/uploads_fileRegisterForm",
//   express.static(path.join(__dirname, folder_name))
// );

// ฟังก์ชันสำหรับสร้าง URL ของไฟล์
const generateFileUrl = (fileName) => {
  return `${process.env.API_URL}/${folder_name}/${fileName}`;
};

exports.register = async (req, res) => {
  const { username, password, phone, type_store, company_name } = req.body;
  console.log("req.body ", req.body);

  // Validate input
  if (!username || !password || !phone || !type_store || !company_name) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Check if username, phone, or company_name already exists
    const existingUser = await new Promise((resolve, reject) => {
      dbs.query(
        "SELECT * FROM users WHERE username = ? OR phone = ? OR company_name = ?",
        [username.trim(), phone.trim(), company_name.trim()],
        (error, results) => {
          if (error) reject(error);
          else resolve(results);
        }
      );
    });

    if (existingUser && existingUser.length > 0) {
      return res.status(400).json({
        message: "Username, phone, or company name already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password.trim(), 10);
    const company_id = uuidv4(); // Generate a unique company ID

    // Insert new user into the database
    const insertResult = await new Promise((resolve, reject) => {
      dbs.query(
        "INSERT INTO users (username, password, phone, type_store, company_name, company_id) VALUES (?, ?, ?, ?, ?, ?)",
        [
          username.trim(),
          hashedPassword,
          phone.trim(),
          type_store.trim(),
          company_name.trim(),
          company_id,
        ],
        (error, results) => {
          if (error) reject(error);
          else resolve(results);
        }
      );
    });

    if (insertResult.affectedRows === 1) {
      return res.status(201).json({ message: "User registered successfully" });
    } else {
      throw new Error("Failed to insert user into the database");
    }
  } catch (error) {
    console.error("Error during user registration:", error);
    return res.status(500).json({
      message: "Error registering user",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: "All fields are required" });

  try {
    // ตรวจสอบว่ามี username หรือ phone อยู่ในฐานข้อมูลหรือไม่
    const result = await new Promise((resolve, reject) => {
      dbs.query(
        "SELECT * FROM users WHERE username = ? ",
        [username],
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
    });

    // console.log("result ", result);

    // ตรวจสอบว่า result มีข้อมูลหรือไม่
    if (!result || result.length === 0)
      return res.status(400).json({ message: "Invalid username or password" });

    const user = result[0]; // user คือ user แรกในผลลัพธ์

    // ตรวจสอบว่า user ไม่เป็น undefined และมี password
    if (!user || !user.password) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    // เปรียบเทียบ password
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ message: "Invalid username or password" });

    // console.log("login user ", user);

    const token = jwt.sign(
      {
        id: user.id,
        company_name: user.company_name,
        company_id: user.company_id,
        status: user.status,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN,
      }
    );
    console.log("user >> ", user.username);
    res.json({ message: "Login successful", user: user, token });
  } catch (error) {
    console.error("Error during login:", error);
    res
      .status(500)
      .json({ message: "Error logging in", error: error.message || error });
  }
};

exports.user = async (req, res) => {
  console.log("req.user", req.user);
  const id = req.user.company_id; // รับ userId จาก request

  try {
    // ใช้ promise เพื่อดึงข้อมูลจากฐานข้อมูล
    const result = await new Promise((resolve, reject) => {
      dbs.query(
        "SELECT * FROM users WHERE company_id = ? LIMIT 1", // Query เพื่อหา id, username
        [id],
        (error, result) => {
          if (error) {
            reject(error); // หากเกิดข้อผิดพลาด
          } else {
            resolve(result); // ส่งผลลัพธ์กลับ
            console.log("result ", result);
          }
        }
      );
    });

    // ตรวจสอบผลลัพธ์
    if (result.length > 0) {
      const {
        id,
        username,
        phone,
        status,
        type_store,
        company_name,
        company_id,
      } = result[0]; // ดึง id, username, phone

      // ส่ง response กลับไป
      res.status(200).json({
        success: true,
        id,
        username,
        phone,
        type_store,
        company_name,
        company_id,
        status,
      });
    } else {
      // กรณีไม่พบ user
      res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
  } catch (error) {
    // จัดการ error
    console.error("Error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while retrieving user data",
    });
  }
};

exports.submitFreeCourse = async (req, res) => {
  const { date, name, phone, email, displayName, lineUserId, course, price } =
    req.body;
  // console.log("req.body ", req.body);
  try {
    const data_register_free = {
      fileUrl: "no",
      fileName: "no",
      date: req.body.date,
      name: req.body.name,
      phone: req.body.phone,
      email: req.body.email,
      displayName: req.body.displayName,
      lineUserId: req.body.lineUserId,
      course: req.body.course,
      price: 0,
    };

    const register_data_free = [
      [
        data_register_free.course,
        data_register_free.lineUserId,
        data_register_free.displayName,
        data_register_free.email,
        data_register_free.phone,
        data_register_free.name,
        data_register_free.date,
        data_register_free.fileName,
        data_register_free.fileUrl,
        data_register_free.price,
      ],
    ];

    // บันทึกข้อมูลลง MySQL
    await appendDataToMySql(register_data_free);

    // สร้างข้อความสำหรับส่ง
    const message_noimage = `
    📌 รายละเอียดการลงทะเบียน:
    ชื่อ: ${name}
    อีเมล: ${email}
    เบอร์โทร: ${phone}
    หลักสูตร: ${course}
    วันที่: ${date}
    ราคา: 0
   
  `;

    //line
    await sendToLineOA(line_Oa_uid, message_noimage, "");

    res.send({ message: "Save data successfully!", dataCustomer: req.body });
  } catch (err) {
    console.log("err--> ", err);
    res.status(500).send({ message: "Error saving data to MySQL!" });
  }
};

exports.submit = async (req, res) => {
  const file = req.file;
  const { date, name, phone, email, displayName, lineUserId, course, price } =
    req.body;

  // ตรวจสอบว่าไฟล์ถูกอัปโหลดมาหรือไม่
  if (!file) {
    return res.status(400).send({ message: "No file uploaded!" });
  }

  // ตรวจสอบว่าข้อมูลที่ต้องการถูกกรอกครบถ้วน
  if (
    !date ||
    !name ||
    !phone ||
    !email ||
    !displayName ||
    !lineUserId ||
    !course ||
    !price
  ) {
    return res.status(400).send({ message: "All fields are required!" });
  }

  try {
    const fileName = file.filename;
    // console.log("fileName ", fileName);

    const fileUrl = generateFileUrl(file.filename); // สร้าง URL ของไฟล์
    // console.log("fileUrl ", fileUrl);

    // สร้างข้อมูลที่ต้องบันทึกลงในฐานข้อมูล
    const data_register = [
      [
        course,
        lineUserId,
        displayName,
        email,
        phone,
        name,
        date,
        fileName,
        fileUrl,
        price,
      ],
    ];

    // บันทึกข้อมูลลงใน MySQL
    await appendDataSaveFileToMySql(data_register);

    // สร้างข้อความสำหรับส่งไปยัง LINE OA
    const message = `
      📌 รายละเอียดการลงทะเบียน:
      ชื่อ: ${name}
      อีเมล: ${email}
      เบอร์โทร: ${phone}
      หลักสูตร: ${course}
      วันที่: ${date}
      ราคา: ${price}
      ไฟล์: ${fileUrl}
    `;

    // ส่งข้อความและภาพไปยัง LINE OA
    await sendToLineOA(line_Oa_uid, message, fileUrl);

    // ส่งคำตอบกลับว่าไฟล์ถูกอัปโหลดสำเร็จ
    res.send({
      message: "File uploaded successfully to Google Drive and MySQL!",
      dataCustomer: req.body,
      file: {
        name: file.filename,
        url: fileUrl,
        mimetype: file.mimetype,
        size: file.size,
      },
    });
  } catch (err) {
    console.error("Error processing the request:", err);
    res
      .status(500)
      .send({ message: "Error processing the request", error: err.message });
  }
};

function appendDataToMySql(data) {
  dbs.getConnection((err, connection) => {
    if (err) {
      console.error("Database connection error:", err);
      res.status(500).json({
        status: "error",
        message: "Database connection failed",
        error: err,
      });
      return;
    }
    const query = `
    INSERT INTO register_data (
      course, lineUserId, displayName, email, phone, name, date, fileName, fileUrl, price
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `;

    // ใช้ `Promise` เพื่อทำให้โค้ดรองรับ async/await
    const queryPromise = (sql, values) => {
      return new Promise((resolve, reject) => {
        dbs.query(sql, values, (error, results) => {
          if (error) {
            return reject(error);
          }
          resolve(results);
        });
      });
    };

    try {
      const result = queryPromise(query, data[0]);
      // console.log("Data inserted successfully:", result);
    } catch (error) {
      console.error("Error inserting data into MySQL:", error);
    }
  });
}

async function appendDataSaveFileToMySql(data) {
  const query = `
    INSERT INTO register_data (
      course, lineUserId, displayName, email, phone, name, date, fileName, fileUrl, price
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `;

  const queryPromise = (sql, values) => {
    return new Promise((resolve, reject) => {
      dbs.query(sql, values, (error, results) => {
        if (error) return reject(error);
        resolve(results);
      });
    });
  };

  try {
    for (const row of data) {
      // console.log("data ", data);
      // console.log("row ", row);
      await queryPromise(query, row);
    }
    console.log("Data saved successfully to MySQL!");
  } catch (error) {
    console.error("Error saving data to MySQL:", error);
    throw error; // ส่งต่อ error เพื่อแจ้งให้ endpoint ทราบ
  }
}

//line
const line_Oa_uid = process.env.line_Oa_uid;
const config = {
  channelAccessToken: process.env.channelAccessToken, // แทนที่ด้วย Channel Access Token
  channelSecret: process.env.channelSecret, // แทนที่ด้วย Channel Secret
};
const client = new line.Client(config);
const sendToLineOA = async (userId, message, imageUrl = null) => {
  try {
    const messages = [
      {
        type: "text",
        text: message,
      },
    ];

    // เพิ่มภาพถ้ามี imageUrl
    if (imageUrl) {
      messages.push({
        type: "image",
        // originalContentUrl: imageUrl,
        // previewImageUrl: imageUrl,
        originalContentUrl:
          "https://www.innews.news/images/images_news/54268/images/000_0_0.jpg", // test เพราะค้องใช้ https ส่วนพอใช้ ngrok แล้วใช้ไม่ได้
        previewImageUrl:
          "https://www.innews.news/images/images_news/54268/images/000_0_0.jpg", // test เพราะค้องใช้ https ส่วนพอใช้ ngrok แล้วใช้ไม่ได้
      });
    }

    // ส่งข้อความไปยังผู้ใช้
    await client.pushMessage(userId, messages);
    console.log("Message sent to LINE OA successfully");
  } catch (error) {
    console.error("Error sending message to LINE OA:", error);
  }
};
