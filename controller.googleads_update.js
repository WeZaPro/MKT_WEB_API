const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
// var dbs = require("./db");
var dbs_googleAds = require("./db_googleAds");
var db_abTest = require("./db_abTest");
var db_googleAdsData = require("./db_googleAdsData");
const axios = require("axios");
require("dotenv").config();
const line = require("@line/bot-sdk");
const csv = require("csv-parser");
const moment = require("moment"); // เพิ่ม moment สำหรับจัดการวันที่
const { format } = require("date-fns");

const bodyParser = require("body-parser");
require("dotenv").config();
// const mysql = require("mysql2/promise");

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true })); // Allow handling FormData
app.use(bodyParser.json());

// sql
const mysql = require("mysql2/promise"); // ✅ ใช้ mysql2/promise

exports.googleAdsDataCompany = async (req, res) => {
  const company = req.query.company || "Unknown";
  console.log("company ", company);

  // สร้างการเชื่อมต่อกับฐานข้อมูล MySQL
  const db_googleAdsData_two = await mysql.createConnection({
    host: process.env.host,
    user: process.env.user,
    password: process.env.password,
    database: process.env.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  // รับข้อมูลจาก body ของคำขอ
  const {
    CampaignName = [],
    AdGroupId = [],
    AdGroupName = [],
    AdId = [],
    Date = [],
    AdStrength = [],
    Clicks = [],
    Ctr = [],
    ConvRate = [],
    Impressions = [],
    Conversions = [],
    Cost = [],
    CostPerConv = [],
    Keywords = [],
  } = req.body;

  // ตรวจสอบความยาวของอาร์เรย์ทั้งหมดว่าตรงกันหรือไม่
  const arrayLengths = [
    CampaignName.length,
    AdGroupId.length,
    AdGroupName.length,
    AdId.length,
    Date.length,
    AdStrength.length,
    Clicks.length,
    Ctr.length,
    ConvRate.length,
    Impressions.length,
    Conversions.length,
    Cost.length,
    CostPerConv.length,
    Keywords.length,
  ];

  const allEqualLength = arrayLengths.every((len) => len === arrayLengths[0]);

  if (!allEqualLength) {
    return res.status(400).send("Arrays must have the same length");
  }

  // ตรวจสอบว่า Keywords เป็นอาร์เรย์สองมิติ และแปลงเป็นอาร์เรย์หนึ่งมิติ
  const keywordsModified = Keywords.map((keywordArray) =>
    keywordArray.join(" | ")
  );
  console.log("Modified Keywords:", keywordsModified);

  const seq_table = "googleAds_data_company";
  const sql = `INSERT INTO ${seq_table}
    (CampaignName, AdGroupId, AdGroupName, AdId, Date, AdStrength, Clicks, Ctr, ConvRate, Impressions,
    Conversions, Cost, CostPerConv, Keywords, company)
    VALUES ?`;

  const values = [];
  for (let i = 0; i < CampaignName.length; i++) {
    values.push([
      CampaignName[i],
      AdGroupId[i],
      AdGroupName[i],
      AdId[i],
      Date[i],
      AdStrength[i],
      Clicks[i],
      Ctr[i],
      ConvRate[i],
      Impressions[i],
      Conversions[i],
      Cost[i],
      CostPerConv[i],
      keywordsModified[i], // ใช้ keywordsModified
      company,
    ]);
  }

  try {
    // ทำการ query เพื่อ insert ข้อมูลใหม่ลงในฐานข้อมูล
    await db_googleAdsData_two.query(sql, [values]);
    res.send("Old data deleted and new data inserted successfully");
  } catch (err) {
    console.error("Error processing the data:", err);
    res.status(500).send("Error processing the data");
  }
};

exports.getgoogleAdsDataCompany = async (req, res) => {
  const company = req.query.company;

  const db_googleAdsData_two = await mysql.createConnection({
    host: process.env.host,
    user: process.env.user,
    password: process.env.password,
    database: process.env.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  if (!company) {
    return res
      .status(400)
      .json({ error: "Missing required parameter: company" });
  }

  try {
    // ✅ กำหนดชื่อ Table
    const seq_table = "googleAds_data_company";

    // ✅ Query ข้อมูลจากฐานข้อมูลโดยแปลง `Date` เป็น `YYYY-MM-DD`
    const query = `
      SELECT 
        id, 
        CampaignName, 
        AdGroupId, 
        AdGroupName, 
        AdId, 
        DATE_FORMAT(Date, '%Y-%m-%d') AS Date,  
        AdStrength, 
        Clicks, 
        Ctr, 
        ConvRate, 
        Impressions, 
        Conversions, 
        Cost, 
        CostPerConv, 
        Keywords, 
        Company
      FROM ${seq_table} 
      WHERE company = ?
    `;

    const [rows] = await db_googleAdsData_two.query(query, [company]);

    // ✅ ปิดการเชื่อมต่อฐานข้อมูล
    await db_googleAdsData_two.end();

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ message: "No data found for the given company" });
    }

    res.json(rows);
  } catch (err) {
    console.error("Database query error:", err);
    res.status(500).json({ error: "Error retrieving data from the database" });
  }
};

exports.getGoogleAdsDataCompanyFilterCam = async (req, res) => {
  const { company } = req.query;
  const { CampaignName, startDate, endDate } = req.body;

  const db_googleAdsData_two = await mysql.createConnection({
    host: process.env.host,
    user: process.env.user,
    password: process.env.password,
    database: process.env.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  if (!company) {
    return res
      .status(400)
      .json({ error: "Missing required parameter: company" });
  }

  try {
    // ✅ ตั้งค่า Table
    const seq_table = "googleAds_data_company";

    // ✅ สร้าง SQL Query โดยเพิ่มเงื่อนไข filter
    let query = `
      SELECT 
        id, 
        CampaignName, 
        AdGroupId, 
        AdGroupName, 
        AdId, 
        DATE_FORMAT(Date, '%Y-%m-%d') AS Date,  
        AdStrength, 
        Clicks, 
        Ctr, 
        ConvRate, 
        Impressions, 
        Conversions, 
        Cost, 
        CostPerConv, 
        Keywords, 
        Company
      FROM ${seq_table} 
      WHERE company = ?
    `;

    const params = [company];

    // ✅ Filter CampaignName (ถ้ามี)
    if (CampaignName) {
      query += ` AND CampaignName LIKE ?`;
      params.push(`%${CampaignName}%`);
    }

    // ✅ Filter StartDate & EndDate (ถ้ามี)
    if (startDate && endDate) {
      query += ` AND Date BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    } else if (startDate) {
      query += ` AND Date >= ?`;
      params.push(startDate);
    } else if (endDate) {
      query += ` AND Date <= ?`;
      params.push(endDate);
    }

    // ✅ Query ข้อมูล
    const [rows] = await db_googleAdsData_two.query(query, params);

    // ✅ ปิดการเชื่อมต่อฐานข้อมูล
    await db_googleAdsData_two.end();

    // format output
    const formattedData = formatOutput(rows);

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ message: "No data found with the given filters" });
    }

    res.json(formattedData);
  } catch (err) {
    console.error("Database query error:", err);
    res.status(500).json({ error: "Error retrieving data from the database" });
  }
};

exports.googleAdsKeywordValue = async (req, res) => {
  const company = req.query.company || "Unknown";
  const seq_table = "google_ads_kw_value"; // ชื่อตารางที่จะใช้เก็บข้อมูล

  // สร้างการเชื่อมต่อกับฐานข้อมูล MySQL
  const db_googleAdsData_two = await mysql.createConnection({
    host: process.env.host,
    user: process.env.user,
    password: process.env.password,
    database: process.env.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  // รับข้อมูลจาก body ของคำขอ
  const { data } = req.body; // data เป็นอาร์เรย์ที่มาจาก Google Ads Script

  // หากไม่มีข้อมูลใน body
  if (!data || data.length === 0) {
    return res.status(400).json({ message: "No data received" });
  }

  try {
    // เริ่มต้นคำสั่ง SQL
    const query = `
      INSERT INTO ${seq_table} (company, campaign_name, ad_group_name, keyword_text, match_type, impressions, clicks, ctr, conversions, cost, cost_per_conversion)
      VALUES ?`;

    // เพิ่มข้อมูลวันที่ (ใช้วันที่ปัจจุบันหรือวันที่ที่ได้รับจากฟอร์แมตที่ต้องการ)
    // const currentDate = new Date().toISOString().split("T")[0]; // เช่น 2025-02-02
    const currentDate =
      new Date().getFullYear() +
      "-" +
      ("0" + (new Date().getMonth() + 1)).slice(-2) +
      "-" +
      ("0" + new Date().getDate()).slice(-2);

    // แปลงข้อมูลในรูปแบบที่ MySQL สามารถใช้ได้
    const values = data.map((item) => [
      company,
      item.campaignName,
      item.adGroupName,
      item.keywordText,
      item.matchType || "PHRASE", // ถ้าไม่มี matchType ให้ใช้ 'PHRASE' เป็นค่าเริ่มต้น
      item.impressions,
      item.clicks,
      item.ctr,
      item.conversions,
      item.cost,
      item.costPerConversion,
      // currentDate, // เพิ่มวันที่ปัจจุบันในข้อมูล
    ]);

    // บันทึกข้อมูลลงฐานข้อมูล
    await db_googleAdsData_two.query(query, [values]);

    // ส่งการตอบกลับว่าเสร็จสิ้น
    res.status(200).json({ message: "Data saved successfully" });
  } catch (err) {
    // หากเกิดข้อผิดพลาด
    console.error("Error saving data: ", err);
    res.status(500).json({ message: "Error saving data", error: err });
  } finally {
    // ปิดการเชื่อมต่อฐานข้อมูล
    db_googleAdsData_two.end();
  }
};

exports.getGoogleAdsKeywordValue = async (req, res) => {
  const company = req.query.company || "Unknown";
  console.log("company ", company);
  if (!company) {
    return res
      .status(400)
      .json({ error: "Missing required parameter: company" });
  }
  const seq_table = "google_ads_kw_value"; // ชื่อตารางที่จะใช้เก็บข้อมูล

  // สร้างการเชื่อมต่อกับฐานข้อมูล MySQL
  const db_googleAdsData_two = await mysql.createConnection({
    host: process.env.host,
    user: process.env.user,
    password: process.env.password,
    database: process.env.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  // สร้าง query SQL เพื่อดึงข้อมูลที่ตรงกับ company
  // const query = `SELECT * FROM ${seq_table} WHERE company = ?`;

  try {
    // ดำเนินการ query
    const [rows] = await db_googleAdsData_two.query(
      `SELECT * FROM ${seq_table} WHERE company = ?`,
      [company]
    );

    // ✅ ปิดการเชื่อมต่อฐานข้อมูล
    await db_googleAdsData_two.end();

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ message: "No data found for the given company" });
    }

    // Format created_at field
    rows.forEach((rows) => {
      rows.created_at = format(new Date(rows.created_at), "yyyy-MM-dd");
    });

    res.json(rows);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "An error occurred" });
  }
};

exports.getGoogleAdsKeywordValueFilterCam = async (req, res) => {
  const company = req.query.company || "Unknown";
  const { campaign_name, startDate, endDate } = req.body;

  console.log("company ", company);
  console.log("campaign_name ", campaign_name);
  console.log("startDate ", startDate);
  console.log("endDate ", endDate);

  if (!company) {
    return res
      .status(400)
      .json({ error: "Missing required parameter: company" });
  }

  const seq_table = "google_ads_kw_value"; // ชื่อตารางที่จะใช้เก็บข้อมูล

  // สร้างการเชื่อมต่อกับฐานข้อมูล MySQL
  const db_googleAdsData_two = await mysql.createConnection({
    host: process.env.host,
    user: process.env.user,
    password: process.env.password,
    database: process.env.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  let query = `SELECT * FROM ${seq_table} WHERE company = ?`;
  let queryParams = [company];

  // การเพิ่มเงื่อนไข filter campaign_name, startDate, endDate
  if (campaign_name) {
    query += ` AND campaign_name LIKE ?`;
    queryParams.push(`%${campaign_name}%`);
  }

  if (startDate) {
    query += ` AND created_at >= ?`;
    queryParams.push(startDate);
  }

  if (endDate) {
    query += ` AND created_at <= ?`;
    queryParams.push(endDate);
  }
  console.log("query ", query);
  console.log("queryParams ", queryParams);
  try {
    // ดำเนินการ query
    const [rows] = await db_googleAdsData_two.query(query, queryParams);
    console.log("rows ", rows);

    // ✅ ปิดการเชื่อมต่อฐานข้อมูล
    await db_googleAdsData_two.end();

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ message: "No data found for the given filters" });
    }

    // Format created_at field
    rows.forEach((row) => {
      row.created_at = format(new Date(row.created_at), "yyyy-MM-dd");
    });

    res.json(rows);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "An error occurred" });
  }
};

exports.listCampaignsUpdate = async (req, res) => {
  // const tableName = "googleAds_data_company";
  const company = req.query.company || "Unknown";

  const db_googleAdsData_two = await mysql.createConnection({
    host: process.env.host,
    user: process.env.user,
    password: process.env.password,
    database: process.env.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  if (!company) {
    return res
      .status(400)
      .json({ error: "Missing required parameter: company" });
  }

  try {
    const seq_table = "googleAds_data_company";

    const query = `
      SELECT AdGroupName, 
             campaignName, 
             SUM(impressions) AS totalImpressions,
             SUM(clicks) AS totalClicks,
             SUM(conversions) AS totalConversions,
             AVG(ctr) AS avgCTR,
             SUM(cost) AS totalCost
             
      FROM ${seq_table} 
      WHERE company = ? 
      GROUP BY AdGroupName, campaignName
    `;

    console.log("Executing SQL Query:", query);
    console.log("Company Parameter:", company);

    const [rows] = await db_googleAdsData_two.query(query, [company]);

    await db_googleAdsData_two.end();

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ message: "No data found for the given company" });
    }
    res.send({ message: "Campaigns retrieved successfully", data: rows });
    // res.json(rows);
  } catch (err) {
    console.error("Database query error:", err);
    res.status(500).json({
      error: err.message || "Error retrieving data from the database",
    });
  }
};

//function******

const formatOutput = (rows) => {
  const groupedData = {};

  rows.forEach((row) => {
    const key = `${row.CampaignName}-${row.AdGroupName}-${row.AdGroupId}-${row.AdId}`;

    if (!groupedData[key]) {
      groupedData[key] = {
        AdGroupName: row.AdGroupName,
        CampaignName: row.CampaignName,
        AdGroupId: row.AdGroupId,
        AdId: row.AdId,
        date_list: [],
        Clicks: [],
        impressions: [],
        Conversions: [],
        Keywords: new Set(),

        AdStrength: [],
        Ctr: [],
        ConvRate: [],
        Cost: [],
        CostPerConv: [],
      };
      //AdStrength
      //Ctr
      //ConvRate
      //Cost
      //CostPerConv
    }

    groupedData[key].date_list.push(row.Date);
    groupedData[key].Clicks.push(row.Clicks);
    groupedData[key].impressions.push(row.Impressions);
    groupedData[key].Conversions.push(row.Conversions);

    groupedData[key].AdStrength.push(row.AdStrength);
    groupedData[key].Ctr.push(row.Ctr);
    groupedData[key].ConvRate.push(row.ConvRate);
    groupedData[key].Cost.push(row.Cost);
    groupedData[key].CostPerConv.push(row.CostPerConv);

    // แยก keyword และเพิ่มลงใน Set เพื่อลบค่าที่ซ้ำกัน
    row.Keywords.split(" | ").forEach((keyword) =>
      groupedData[key].Keywords.add(keyword)
    );
  });

  // แปลง Set เป็น Array ก่อนคืนค่า
  return {
    data: Object.values(groupedData).map((item) => ({
      ...item,
      Keywords: Array.from(item.Keywords),
    })),
  };
};
