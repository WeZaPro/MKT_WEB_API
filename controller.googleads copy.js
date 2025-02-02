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

const bodyParser = require("body-parser");
require("dotenv").config();
// const mysql = require("mysql2/promise");

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true })); // Allow handling FormData
app.use(bodyParser.json());
// getdata

// ab test --start
// exports.getAbTesting = async (req, res) => {
//   const tableName = "abtest";
//   const createdBy = req.user.id; // ข้อมูล created_by จาก user ที่ล็อกอินแล้ว

//   try {
//     // ดึงข้อมูลจากตารางโดยใช้ created_by
//     const [rows] = await dbs_googleAds.query(
//       `SELECT * FROM ${tableName} WHERE created_by = ?`,
//       [createdBy]
//     );

//     // ถ้าพบข้อมูล
//     if (rows.length > 0) {
//       res.status(200).json({ data: rows });
//     } else {
//       // ถ้าไม่พบข้อมูล
//       res.status(404).json({ message: "ไม่พบข้อมูล" });
//     }
//   } catch (err) {
//     // ถ้ามีข้อผิดพลาดในการ query
//     console.error(err);
//     res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
//   }
// };
// exports.addAbTesting = async (req, res) => {
//   const tableName = "abtest";
//   const { switch_page, mainA } = req.body; // รับค่าจาก body
//   const createdBy = req.user.id; // ข้อมูล created_by จาก user ที่ล็อกอินแล้ว

//   try {
//     // ตรวจสอบว่ามีข้อมูลที่ created_by นี้อยู่ในฐานข้อมูลหรือไม่
//     const [rows] = await dbs_googleAds.query(
//       `SELECT * FROM ${tableName} WHERE created_by = ?`,
//       [createdBy]
//     );

//     // ถ้ามีข้อมูลที่ created_by นี้แล้ว
//     if (rows.length > 0) {
//       return res
//         .status(400)
//         .json({ message: "ข้อมูลซ้ำ: ข้อมูลที่มี created_by นี้แล้ว" });
//     }

//     // ถ้าไม่มีข้อมูลซ้ำ ทำการ INSERT INTO
//     await dbs_googleAds.query(
//       `INSERT INTO ${tableName} (switch_page, mainA, created_by) VALUES (?, ?, ?)`,
//       [switch_page, mainA, createdBy]
//     );

//     // ส่งผลลัพธ์กลับไปที่ client
//     res.status(200).json({ message: "บันทึกข้อมูลสำเร็จ" });
//   } catch (err) {
//     // ถ้ามีข้อผิดพลาด
//     console.error(err);
//     res.status(500).json({ message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" });
//   }
// };

// exports.updateAbTesting = async (req, res) => {
//   console.log("req.user ", req.user);
//   const tableName = "abtest";

//   const { switch_page, mainA, id } = req.body; // รับค่าจาก body รวมถึง id
//   const createdBy = req.user.id; // ข้อมูล created_by จาก user ที่ล็อกอินแล้ว

//   // ตรวจสอบว่า id ถูกส่งมาหรือไม่
//   if (!id) {
//     return res.status(400).json({ message: "ID is required." });
//   }

//   try {
//     // อัปเดตข้อมูลในฐานข้อมูล
//     await dbs_googleAds.query(
//       `UPDATE ${tableName} SET switch_page = ?, mainA = ? WHERE id = ? AND created_by = ?`,
//       [switch_page, mainA, id, createdBy]
//     );

//     // ส่งผลลัพธ์กลับไปที่ client
//     res.status(200).json({ message: "Record updated successfully" });
//   } catch (err) {
//     // ถ้ามีข้อผิดพลาด
//     console.error(err);
//     res
//       .status(500)
//       .json({ message: "An error occurred while updating the record" });
//   }
// };
// ab test --end

exports.listCampaigns = async (req, res) => {
  const tableName = "sql_table_day_adsId";
  // รับพารามิเตอร์ adsId จาก request (ถ้ามี)
  const { adsId } = req.query;

  // สร้างคำสั่ง SQL เริ่มต้น
  let sql = `
    SELECT 
        campaign,
        COUNT(*) AS total_ads,
        SUM(impressions) AS total_impressions,
        SUM(clicks) AS total_clicks
    FROM 
        ${tableName}
    WHERE 
        1 = 1
  `;

  // กำหนดพารามิเตอร์สำหรับ Query
  const params = [];

  // เพิ่มเงื่อนไขสำหรับ adsId ถ้ามี
  if (adsId) {
    sql += ` AND ad_id = ?`;
    params.push(adsId);
  }

  // เพิ่ม GROUP BY
  sql += ` GROUP BY campaign`;

  try {
    // ดึงข้อมูลจากฐานข้อมูล
    const [rows] = await dbs_googleAds.execute(sql, params);

    // ส่งข้อมูลกลับในรูปแบบ JSON
    res.status(200).json({
      message: "Campaigns retrieved successfully",
      data: rows,
    });
  } catch (error) {
    // จัดการข้อผิดพลาด
    console.error("Error fetching campaigns:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

exports.googleAdsDataTable = async (req, res) => {
  const mysql = require("mysql2/promise"); // ✅ ใช้ mysql2/promise
  const db_googleAdsData_two = await mysql.createConnection({
    host: process.env.host,
    user: process.env.user,
    password: process.env.password,
    // database: "PETIVERSE",
    database: process.env.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  const {
    CampaignName = [],
    AdGroupId = [],
    AdGroupName = [],
    AdId = [],
    Date = [],
    // weekRange = [],
    AdStrength = [],
    Clicks = [],
    Ctr = [],
    ConvRate = [],
    Impressions = [],
    Conversions = [],
    Cost = [],
    CostPerConv = [],
    // ClickConversionRate = [],
    // CrossDeviceConv = [],
  } = req.body;

  console.log("Received Data:", {
    CampaignName: CampaignName.length,
    AdGroupId: AdGroupId.length,
    AdGroupName: AdGroupName.length,
    AdId: AdId.length,
    Date: Date.length,
    // weekRange: weekRange.length,
    AdStrength: AdStrength.length,
    Clicks: Clicks.length,
    Ctr: Ctr.length,
    ConvRate: ConvRate.length,
    Impressions: Impressions.length,
    Conversions: Conversions.length,
    Cost: Cost.length,
    CostPerConv: CostPerConv.length,
    // ClickConversionRate: ClickConversionRate.length,
    // CrossDeviceConv: CrossDeviceConv.length,
  });

  const seq_table = "googleAds_data_table";

  const arrayLengths = [
    CampaignName?.length || 0,
    AdGroupId?.length || 0,
    AdGroupName?.length || 0,
    AdId?.length || 0,
    Date?.length || 0,
    // weekRange?.length || 0,
    AdStrength?.length || 0,
    Clicks?.length || 0,
    Ctr?.length || 0,
    ConvRate?.length || 0,
    Impressions?.length || 0,
    Conversions?.length || 0,
    Cost?.length || 0,
    CostPerConv?.length || 0,
    // ClickConversionRate?.length || 0,
    // CrossDeviceConv?.length || 0,
  ];

  // เปรียบเทียบความยาวของอาร์เรย์ทั้งหมด
  const allEqualLength = arrayLengths.every((len) => len === arrayLengths[0]);

  if (!allEqualLength) {
    return res.status(400).send("Arrays must have the same length");
  }

  try {
    // ลบข้อมูลเก่าในตารางก่อน
    // await db_googleAdsData_two.query(`DELETE FROM ${seq_table}`);
    // console.log("Old data deleted, inserting new data...");

    // คำสั่ง SQL สำหรับการ insert ข้อมูลใหม่
    const sql = `INSERT INTO ${seq_table} 
      (CampaignName, AdGroupId, AdGroupName, AdId, Date, AdStrength, Clicks, Ctr, ConvRate, Impressions, 
       Conversions, Cost, CostPerConv)
      VALUES ?`;

    // จัดเตรียมค่าที่จะ insert
    const values = [];
    for (let i = 0; i < CampaignName.length; i++) {
      values.push([
        CampaignName[i],
        AdGroupId[i],
        AdGroupName[i],
        AdId[i],
        Date[i],
        // weekRange[i],
        AdStrength[i],
        Clicks[i],
        Ctr[i],
        ConvRate[i],
        Impressions[i],
        Conversions[i],
        Cost[i],
        CostPerConv[i],
        // ClickConversionRate[i],
        //CrossDeviceConv[i],
      ]);
    }

    // ทำการ query เพื่อ insert ข้อมูลใหม่ลงในฐานข้อมูล
    await db_googleAdsData_two.query(sql, [values]);

    res.send("Old data deleted and new data inserted successfully");
  } catch (err) {
    console.error("Error processing the data:", err);
    res.status(500).send("Error processing the data");
  }
};

exports.googleAdsDataReport = async (req, res) => {
  const { CampaignName, Clicks, Impressions, Cost } = req.body;

  if (
    CampaignName.length !== Clicks.length ||
    CampaignName.length !== Impressions.length ||
    CampaignName.length !== Cost.length
  ) {
    return res.status(400).send("Arrays must have the same length");
  }

  db_googleAdsData.query("DELETE FROM campaign_data", (err, result) => {
    if (err) {
      console.error("Error deleting old data:", err);
      return res.status(500).send("Error deleting old data");
    }

    console.log("Old data deleted, inserting new data...");

    // ทำการ insert ข้อมูลใหม่ทีละแถว
    var sql =
      "INSERT INTO campaign_data (CampaignName, Clicks, Impressions, Cost) VALUES ?";
    var values = [];

    for (let i = 0; i < CampaignName.length; i++) {
      values.push([CampaignName[i], Clicks[i], Impressions[i], Cost[i]]);
    }

    db_googleAdsData.query(sql, [values], (err, result) => {
      if (err) {
        console.error("Error inserting data:", err);
        return res.status(500).send("Error inserting data");
      }
      res.send("Old data deleted and new data inserted");
    });
  });
};

// exports.googleAdsDataReport = async (req, res) => {
//   const { CampaignName, Clicks, Impressions, Cost } = req.body;

//   // ตรวจสอบว่า array ของ CampaignName, Clicks, Impressions, Cost มีจำนวนเท่ากันหรือไม่
//   if (
//     CampaignName.length !== Clicks.length ||
//     CampaignName.length !== Impressions.length ||
//     CampaignName.length !== Cost.length
//   ) {
//     return res.status(400).send("Arrays must have the same length");
//   }

//   // ลบข้อมูลเก่า
//   db_googleAdsData.query("DELETE FROM campaign_data", (err, result) => {
//     if (err) {
//       console.error("Error deleting old data:", err);
//       return res.status(500).send("Error deleting old data");
//     }

//     console.log("Old data deleted, inserting new data...");

//     // วนลูปและทำการ insert ข้อมูลใหม่
//     for (let i = 0; i < CampaignName.length; i++) {
//       const sql =
//         "INSERT INTO campaign_data (CampaignName, Clicks, Impressions, Cost) VALUES (?, ?, ?, ?)";
//       db_googleAdsData.query(
//         sql,
//         [CampaignName[i], Clicks[i], Impressions[i], Cost[i]],
//         (err, result) => {
//           if (err) {
//             console.error("Error inserting data:", err);
//             return res.status(500).send("Error inserting data");
//           }
//         }
//       );
//     }

//     res.send("Old data deleted and new data inserted");
//   });
// };

exports.listAdsId = async (req, res) => {
  const tableName = "sql_table_day_adsId";
  // รับพารามิเตอร์ adsId จาก request (ถ้ามี)
  const { adsId } = req.query;

  // สร้างคำสั่ง SQL เริ่มต้น
  let sql = `
    SELECT 
        campaign, 
        ad_id,
        COUNT(*) AS total_ads
    FROM 
        ${tableName}
    WHERE 
        1 = 1
  `;

  // กำหนดพารามิเตอร์สำหรับ Query
  const params = [];

  // เพิ่มเงื่อนไขสำหรับ adsId ถ้ามี
  if (adsId) {
    sql += ` AND ad_id = ?`;
    params.push(adsId);
  }

  // เพิ่ม GROUP BY
  sql += ` GROUP BY campaign, ad_id`;

  try {
    // ดึงข้อมูลจากฐานข้อมูล
    const [rows] = await dbs_googleAds.execute(sql, params);

    // ส่งข้อมูลกลับในรูปแบบ JSON
    res.status(200).json({
      message: "Campaigns retrieved successfully",
      data: rows,
    });
  } catch (error) {
    // จัดการข้อผิดพลาด
    console.error("Error fetching campaigns:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

exports.GetDataAdsIdDateGroupAdsId = async (req, res) => {
  const tableName = "sql_table_day_adsId";
  const { startDate, endDate, campaign, impressions } = req.body;

  // ตรวจสอบว่ามีการส่งค่าช่วงวันที่เข้ามาหรือไม่
  if (!startDate || !endDate) {
    return res
      .status(400)
      .json({ message: "Please provide startDate and endDate" });
  }

  // ตรวจสอบว่ามีการส่งค่าของ impressions หรือไม่
  if (impressions === undefined) {
    return res
      .status(400)
      .json({ message: "Please provide impressions value" });
  }

  // สร้างคำสั่ง SQL
  const sql = `
  SELECT 
      ad_id,
      COUNT(DISTINCT ad_group) AS ad_group_count,
      ROUND(SUM(impressions), 2) AS total_impressions,
      ROUND(SUM(clicks), 2) AS total_clicks,
      ROUND(AVG(ctr), 2) AS avg_ctr,
      ROUND(SUM(conversions), 2) AS total_conversions,
      ROUND(SUM(cost), 2) AS total_cost,
      ROUND(AVG(conv_rate), 2) AS avg_conv_rate,
      ROUND(AVG(cost_per_conv), 2) AS avg_cost_per_conv,
      ROUND(AVG(impression_top_percent), 2) AS avg_impression_top_percent,
      ROUND(AVG(impression_absolute_top_percent), 2) AS avg_impression_absolute_top_percent
  FROM 
      ${tableName}
  WHERE 
      Day BETWEEN ? AND ? 
      AND campaign = ?
      AND impressions >= ?
  GROUP BY 
      ad_id
  ORDER BY 
      ad_id ASC;
`;
  const params = [startDate, endDate, campaign, impressions];

  // ดึงข้อมูลจากฐานข้อมูล
  const [rows] = await dbs_googleAds.execute(sql, params);
  res.status(200).json({
    campaign: campaign,
    date: `${startDate} & ${endDate}`,
    data: rows,
  });
};

exports.GetDataAdsIdDateFilterAdsId = async (req, res) => {
  const tableName = "sql_table_day_adsId";
  // ดึงค่าที่ส่งมาจาก request body
  const { startDate, endDate, campaign, impressions, adsId } = req.body;

  // ตรวจสอบว่ามีการส่งค่าช่วงวันที่เข้ามาหรือไม่
  if (!startDate || !endDate) {
    return res
      .status(400)
      .json({ message: "Please provide startDate and endDate" });
  }

  // ตรวจสอบว่ามีการส่งค่าของ impressions หรือไม่
  if (impressions === undefined) {
    return res
      .status(400)
      .json({ message: "Please provide impressions value" });
  }

  // สร้างคำสั่ง SQL
  let sql = `
  SELECT 
      ad_group,
      ad_id,
      DAY,
      clicks,
      ROUND(ctr, 2) AS ctr,
      impressions,
      conversions,
      cost,
      ROUND(conv_rate, 2) AS conv_rate,
      ROUND(cost_per_conv, 2) AS cost_per_conv,
      ROUND(impression_top_percent, 2) AS impression_top_percent,
      ROUND(impression_absolute_top_percent, 2) AS impression_absolute_top_percent
  FROM 
      ${tableName}
  WHERE 
      Day BETWEEN ? AND ? 
      AND campaign = ?
      AND impressions >= ?
  `;

  // กำหนดพารามิเตอร์เริ่มต้น
  const params = [startDate, endDate, campaign, impressions];

  // ตรวจสอบว่ามี adsId หรือไม่
  if (adsId) {
    sql += ` AND ad_id = ?`;
    params.push(adsId);
  }

  // เพิ่มเงื่อนไขการเรียงลำดับ
  sql += `
  ORDER BY 
      ad_group ASC,
      ad_id ASC,
      DAY ASC;
  `;

  try {
    // ดึงข้อมูลจากฐานข้อมูล
    const [rows] = await dbs_googleAds.execute(sql, params);

    // ส่งข้อมูลกลับในรูปแบบ JSON
    res.status(200).json({
      campaign: campaign,
      date: `${startDate} & ${endDate}`,
      data: rows,
    });
  } catch (error) {
    // จัดการข้อผิดพลาด
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

exports.GetDataAdsIdDate = async (req, res) => {
  const tableName = "sql_table_day_adsId";
  //TODO
  const { startDate, endDate, campaign, impressions } = req.body;

  // ตรวจสอบว่ามีการส่งค่าช่วงวันที่เข้ามาหรือไม่
  if (!startDate || !endDate) {
    return res
      .status(400)
      .json({ message: "Please provide startDate and endDate" });
  }

  // ตรวจสอบว่ามีการส่งค่าของ impressions หรือไม่
  if (impressions === undefined) {
    return res
      .status(400)
      .json({ message: "Please provide impressions value" });
  }

  // สร้างคำสั่ง SQL
  const sql = `
  SELECT 
      ad_group,
      ad_id,
      DAY,
      clicks,
      ROUND(ctr, 2) AS ctr,
      impressions,
      conversions,
      cost,
      ROUND(conv_rate, 2) AS conv_rate,
      ROUND(cost_per_conv, 2) AS cost_per_conv,
      ROUND(impression_top_percent, 2) AS impression_top_percent,
      ROUND(impression_absolute_top_percent, 2) AS impression_absolute_top_percent

  FROM 
      ${tableName}
  WHERE 
      Day BETWEEN ? AND ? 
      AND campaign = ?
      AND impressions >= ?
  
  ORDER BY 
      ad_group ASC,
      ad_id ASC,
      DAY ASC;
`;
  const params = [startDate, endDate, campaign, impressions];

  // ดึงข้อมูลจากฐานข้อมูล
  const [rows] = await dbs_googleAds.execute(sql, params);
  res.status(200).json({
    campaign: campaign,
    date: `${startDate} & ${endDate}`,
    data: rows,
  });
};

exports.GetDataAdsGroupDate = async (req, res) => {
  const tableName = "sql_table_day_adsId";
  try {
    // const { startDate, endDate } = req.query;

    const { startDate, endDate } = req.body;
    console.log("startDate ", startDate);
    console.log("endDate ", endDate);

    // ตรวจสอบว่ามีการส่งค่าช่วงวันที่เข้ามาหรือไม่
    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "Please provide startDate and endDate" });
    }

    const sql = `
            SELECT *
            FROM ${tableName}
            WHERE day BETWEEN ? AND ?
            ORDER BY day ASC
        `;

    // ดึงข้อมูลจากฐานข้อมูล
    const [rows] = await dbs_googleAds.execute(sql, [startDate, endDate]);
    res.status(200).json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

exports.GetDataAdsGroupWeek_fromCampaign = async (req, res) => {
  const tableName = "sql_table_week_adsId";
  try {
    const { startDate, endDate, campaign } = req.body;

    // ตรวจสอบว่ามีค่าช่วงวันที่หรือไม่
    if (!startDate || !endDate || !campaign) {
      return res.status(400).json({
        message: "Please provide startDate, endDate, and campaign",
      });
    }

    // สร้างคำสั่ง SQL
    const sql = `
      SELECT 
          ad_group,
          SUM(clicks) AS total_clicks,
          FORMAT(AVG(ctr) , 2) AS avg_ctr,
          FORMAT(AVG(conv_rate) , 2) AS avg_conv_rate,
          SUM(impressions) AS total_impressions,
          SUM(conversions) AS total_conversions,
          FORMAT(AVG(impression_absolute_top_percent) , 2) AS impression_absolute_top_percent,
          FORMAT(AVG(impression_top_percent) , 2) AS impression_top_percent,
          FORMAT(AVG(cost_per_conv) , 2) AS cost_per_conv,
          FORMAT(AVG(click_conversion_rate) , 2) AS click_conversion_rate,
          SUM(cross_device_conv) AS total_cross_device_conv,
          SUM(engagements) AS total_engagements
      FROM 
          ${tableName}
      WHERE 
          week BETWEEN ? AND ? 
          AND campaign = ?
      GROUP BY 
          ad_group
      ORDER BY 
          ad_group ASC;
    `;

    const params = [startDate, endDate, campaign];

    // ดึงข้อมูลจากฐานข้อมูล
    const [rows] = await dbs_googleAds.execute(sql, params);
    res.status(200).json({
      campaign: campaign,
      date: `${startDate} & ${endDate}`,
      data: rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

exports.GetDataAdsGroupWeekByCampaignAndFilterAdGroup = async (req, res) => {
  const tableName = "sql_table_week_adsId";
  try {
    const { startDate, endDate, campaign, adGroup } = req.body;

    // ตรวจสอบว่ามีค่าช่วงวันที่หรือไม่
    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "Please provide startDate and endDate" });
    }

    // Ctr เป็น %
    let sql = `
          SELECT Campaign, Ad_group, Week,
          CONCAT(FORMAT(Ctr , 2), '%') AS Ctr,
          CONCAT(FORMAT(conv_rate , 2), '%') AS conv_rate,
          CONCAT(FORMAT(impression_absolute_top_percent , 2), '%') AS impression_absolute_top_percent,
          CONCAT(FORMAT(impression_top_percent , 2), '%') AS impression_top_percent,
          clicks,impressions,conversions,cost_per_conv
          FROM ${tableName}
          WHERE Week BETWEEN ? AND ?
      `;

    const params = [startDate, endDate];

    // เพิ่มเงื่อนไขสำหรับ Campaign
    if (campaign) {
      sql += " AND Campaign = ?";
      params.push(campaign);
    }

    // เพิ่มเงื่อนไขสำหรับ Ad_group
    if (adGroup) {
      sql += " AND Ad_group = ?";
      params.push(adGroup);
    }

    // เพิ่มการเรียงลำดับข้อมูล
    sql += " ORDER BY Week ASC";

    // ดึงข้อมูลจากฐานข้อมูล
    const [rows] = await dbs_googleAds.execute(sql, params);
    // res.status(200).json({ data: rows });
    res.status(200).json({
      campaign: campaign,
      adGroup: adGroup,
      date: `${startDate} & ${endDate}`,
      data: rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

exports.GetDataAdsGroupWeekByCampaignAndFilter = async (req, res) => {
  const tableName = "sql_table_week_adsId";
  try {
    const { startDate, endDate, campaign } = req.body;

    // ตรวจสอบว่ามีค่าช่วงวันที่หรือไม่
    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "Please provide startDate and endDate" });
    }

    // Ctr เป็น %
    let sql = `
          SELECT Campaign, Ad_group, Week,
          CONCAT(FORMAT(Ctr , 2), '%') AS Ctr,
          CONCAT(FORMAT(conv_rate , 2), '%') AS conv_rate,
          CONCAT(FORMAT(impression_absolute_top_percent , 2), '%') AS impression_absolute_top_percent,
          CONCAT(FORMAT(impression_top_percent , 2), '%') AS impression_top_percent,
          clicks,impressions,conversions,cost_per_conv
          FROM ${tableName}
          WHERE Week BETWEEN ? AND ?
      `;

    const params = [startDate, endDate];

    // เพิ่มเงื่อนไขสำหรับ Campaign
    if (campaign) {
      sql += " AND Campaign = ?";
      params.push(campaign);
    }

    // เพิ่มการเรียงลำดับข้อมูล
    sql += " ORDER BY Week ASC";

    // ดึงข้อมูลจากฐานข้อมูล
    const [rows] = await dbs_googleAds.execute(sql, params);
    res.status(200).json({
      campaign: campaign,
      date: `${startDate} & ${endDate}`,
      data: rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};
//
// uploads data

//sql_table_week_adid
exports.getABtest = async (req, res) => {
  const tableName = "UserActions";
  try {
    const rows = await new Promise((resolve, reject) => {
      db_abTest.query(
        `SELECT * FROM ${tableName} `,

        (err, results) => {
          // console.log("results ", results);
          if (err) return reject(err);
          resolve(results);
        }
      );
    });

    // กรองข้อมูลที่ UI เท่ากับ 'MainA' หรือ 'MainB'
    // const filteredData = rows.filter(
    //   (row) => row.UI === "MainA" || row.UI === "MainB"
    // );
    const MainA = [];
    const MainB = [];
    rows.forEach((e, i) => {
      // console.log("e ", e);
      if (e.UI === "MainA") {
        MainA.push({
          IP: e.IP,
          Click: e.CLICK,
        });
      }

      if (e.UI === "MainB") {
        MainB.push({
          IP: e.IP,
          Click: e.CLICK,
        });
      }
    });
    // console.log("MainA ", MainA);
    // console.log("MainB ", MainB);

    const groupMainA = separate_conv(MainA, "MainA_Button1", "MainA_Button2");
    // console.log("groupMainA.conv1 : ", groupMainA.conv1);
    // console.log("groupMainA.conv2 : ", groupMainA.conv2);
    // console.log("groupMainA.convBoth : ", groupMainA.convBoth);
    // console.log("groupMainA.convAll : ", groupMainA.convAll);
    // console.log("groupMainA.NoneConv : ", groupMainA.NoneConv);
    // console.log("groupMainA.allEvent : ", groupMainA.allEvent);

    // console.log("------------------------------");

    const groupMainB = separate_conv(MainB, "MainB_Button1", "MainB_Button2");
    // console.log("groupMainB.conv1 : ", groupMainB.conv1);
    // console.log("groupMainB.conv2 : ", groupMainB.conv2);
    // console.log("groupMainB.convBoth : ", groupMainB.convBoth);
    // console.log("groupMainB.convAll : ", groupMainB.convAll);
    // console.log("groupMainB.NoneConv : ", groupMainB.NoneConv);
    // console.log("groupMainB.allEvent : ", groupMainB.allEvent);

    const packMainA = {
      conv1: groupMainA.conv1,
      conv2: groupMainA.conv2,
      convBoth: groupMainA.convBoth,
      convAll: groupMainA.convAll,
      NoneConv: groupMainA.NoneConv,
      allEvent: groupMainA.allEvent,
    };

    const packMainB = {
      conv1: groupMainB.conv1,
      conv2: groupMainB.conv2,
      convBoth: groupMainB.convBoth,
      convAll: groupMainB.convAll,
      NoneConv: groupMainB.NoneConv,
      allEvent: groupMainB.allEvent,
    };

    res.send({ packMainA: packMainA, packMainB: packMainB });
  } catch (err) {
    console.log("err", err);
  }
};

function separate_conv(Main, Main_Button1, Main_Button2) {
  // console.log("MAIN ", Main);
  // จัดกลุ่มตาม IP
  const groupedByIP = Main.reduce((acc, item) => {
    acc[item.IP] = acc[item.IP] || [];
    acc[item.IP].push(item.Click);
    return acc;
  }, {});

  // แยกข้อมูลตามเงื่อนไข
  const result = {
    CONV_A1: [],
    CONV_A2: [],
    NONE_CONV: [],
    CONV_BOTH: [],
  };

  for (const [IP, clicks] of Object.entries(groupedByIP)) {
    // console.log(`IP: ${IP}, Clicks: ${clicks}`);

    if (
      clicks.includes("NONE") &&
      clicks.includes(Main_Button1) &&
      clicks.includes(Main_Button2) &&
      clicks.length > 2
    ) {
      // console.log(`Check if:===>>>3`);
      // console.log(`Adding to CONV_BOTH: ${IP}, Clicks: ${clicks}`);
      result.CONV_BOTH.push({ IP, Clicks: clicks });
    } else if (
      clicks.includes("NONE") &&
      clicks.includes(Main_Button1) &&
      clicks.length > 1
    ) {
      // console.log(`Check if:===>>>1`);
      result.CONV_A1.push({ IP, Clicks: clicks });
    } else if (
      clicks.includes("NONE") &&
      clicks.includes(Main_Button2) &&
      clicks.length > 1
    ) {
      // console.log(`Check if:===>>>2`);
      result.CONV_A2.push({ IP, Clicks: clicks });
    } else if (clicks.length >= 1 && clicks.includes("NONE")) {
      // console.log(`Check if:===>>>4`);
      result.NONE_CONV.push({ IP, Clicks: clicks });
    }
  }

  // console.log("result.CONV_A2 ", result.CONV_A2);
  // console.log("result.CONV_BOTH ", result.CONV_BOTH);
  // เพิ่มจำนวน count ในแต่ละกลุ่ม
  const counts = Object.fromEntries(
    Object.entries(result).map(([key, value]) => [key, value.length])
  );

  // แสดงผลลัพธ์พร้อม count
  // console.log({ result, counts });
  const _conv1 = counts.CONV_A1;
  const _conv2 = counts.CONV_A2;
  const _convBoth = counts.CONV_BOTH;
  const _convAll = counts.CONV_A1 + counts.CONV_A2 + counts.CONV_BOTH;
  const _allEvent =
    counts.CONV_A1 + counts.CONV_A2 + counts.CONV_BOTH + counts.NONE_CONV;
  const _NoneConv = counts.NONE_CONV;

  return {
    conv1: _conv1,
    conv2: _conv2,
    convBoth: _convBoth,
    convAll: _convAll,
    NoneConv: _NoneConv,
    allEvent: _allEvent,
  };
}

// exports.getABtest_hold = async (req, res) => {
//   const tableName = "UserActions";

//   try {
//     const rows = await new Promise((resolve, reject) => {
//       db_abTest.query(
//         `SELECT * FROM ${tableName} `,

//         (err, results) => {
//           // console.log("results ", results);
//           if (err) return reject(err);
//           resolve(results);
//         }
//       );
//     });

//     console.log("rows>>>", rows);

//     //TODO --------HOLD
//     // ฟังก์ชันนับจำนวนรายการที่ count > 2
//     const getCountGreaterThanTwo = (data) => {
//       return data.filter((item) => item.count > 2).length;
//     };

//     const output = rows.reduce((acc, { UI, CLICK, IP }) => {
//       const key = `UI${UI}`;
//       if (!acc[key]) acc[key] = {};

//       if (!acc[key][CLICK]) acc[key][CLICK] = new Set();
//       acc[key][CLICK].add(IP);

//       return acc;
//     }, {});

//     console.log("output>>>", output);

//     const finalOutput = Object.entries(output).reduce((acc, [ui, clicks]) => {
//       acc[ui] = Object.entries(clicks).map(([click, ips]) => ({
//         Click: click,
//         Count: ips.size,
//       }));

//       // คำนวณจำนวน buttonBothClick_MainA และ buttonBothClick_MainB
//       const filteredUI_MainA = rows.filter((item) => item.UI === "MainA");
//       const filteredUI_MainB = rows.filter((item) => item.UI === "MainB");

//       // จัดกลุ่มข้อมูลตามค่า CLICK *****************
//       // นับจำนวน `CLICK` ที่ไม่ซ้ำกัน
//       // const clickCounts = filteredUI_MainB.reduce((acc, item) => {
//       //   const { CLICK } = item;
//       //   acc[CLICK] = (acc[CLICK] || 0) + 1;
//       //   return acc;
//       // }, {});

//       // จัดกลุ่มข้อมูลตามค่า CLICK *****************

//       const groupedByIP_MainA = filteredUI_MainA.reduce((acc, curr) => {
//         acc[curr.IP] = (acc[curr.IP] || 0) + 1;
//         return acc;
//       }, {});

//       const groupedByIP_MainB = filteredUI_MainB.reduce((acc, curr) => {
//         acc[curr.IP] = (acc[curr.IP] || 0) + 1;
//         return acc;
//       }, {});

//       const result_groupedByIP_MainA = Object.entries(groupedByIP_MainA)
//         .filter(([ip, count]) => count > 2)
//         .map(([ip, count]) => ({ IP: ip, count }));

//       const result_groupedByIP_MainB = Object.entries(groupedByIP_MainB)
//         .filter(([ip, count]) => count > 2)
//         .map(([ip, count]) => ({ IP: ip, count }));

//       const result_MainA_bothClick = getCountGreaterThanTwo(
//         result_groupedByIP_MainA
//       );
//       const result_MainB_bothClick = getCountGreaterThanTwo(
//         result_groupedByIP_MainB
//       );
//       // console.log("-------------->>>>> ");
//       // console.log("result_MainA_bothClick ", result_MainA_bothClick);
//       // console.log("result_MainB_bothClick ", result_MainB_bothClick);
//       // console.log("-------------->>>>> ");

//       // Update the final output with the new counts
//       const button1Count =
//         acc[ui].find((item) => item.Click.includes("Button1"))?.Count || 0;
//       const button2Count =
//         acc[ui].find((item) => item.Click.includes("Button2"))?.Count || 0;
//       const noneCount =
//         acc[ui].find((item) => item.Click === "NONE")?.Count || 0;

//       // console.log("button1Count ", button1Count);
//       // console.log("button2Count ", button2Count);

//       const bothButtonsCount = Math.min(button1Count, button2Count);
//       const noneOnlyCount =
//         noneCount - (button1Count + button2Count - bothButtonsCount);

//       acc[ui].push({
//         Click: "Bt1Bt2",
//         Count:
//           ui === "UIMainA"
//             ? result_MainA_bothClick
//             : ui === "UIMainB"
//             ? result_MainB_bothClick
//             : 0,
//       });

//       acc[ui].push({
//         Click: "NONEONLY",
//         Count: noneOnlyCount - 1,
//       });

//       return acc;
//     }, {});

//     // console.log(finalOutput);

//     const ui_A = getData_UIMainA(finalOutput, "UIMainA");
//     const ui_B = getData_UIMainB(finalOutput, "UIMainB");

//     const Event_UIMainA = checkEvent_UIMainA(finalOutput, "UIMainA");
//     const Event_UIMainB = checkEvent_UIMainB(finalOutput, "UIMainB");

//     // console.log("ui_A ", ui_A);
//     // console.log("ui_B ", ui_B);
//     // console.log("Event_UIMainA ", Event_UIMainA);
//     // console.log("Event_UIMainB ", Event_UIMainB);

//     //--------

//     // res.send(finalOutput);
//     // res.send({ finalOutput, ui_A, ui_B, Event_UIMainA, Event_UIMainB });
//     res.send({ ui_A, ui_B, Event_UIMainA, Event_UIMainB });
//   } catch (error) {
//     console.error("Error retrieving products:", error);
//     res.status(500).json({ message: "Error retrieving products", error });
//   }
// };

// function checkEvent_UIMainA(data, ui) {
//   const result = {};

//   // Filter to process only "UIMainB"
//   const keysToProcess = [ui];

//   keysToProcess.forEach((key) => {
//     if (data[key]) {
//       // Initialize the array for the key (e.g., UIMainB)
//       result[key] = [];

//       // Handle the 'NONE - NONEONLY' calculation
//       const noneCount =
//         data[key].find((item) => item.Click === "NONE")?.Count || 0;
//       const noneOnlyCount =
//         data[key].find((item) => item.Click === "NONEONLY")?.Count || 0;
//       result[key].push({
//         range: "All_Event",
//         connections: noneCount - noneOnlyCount,
//       });

//       // Add Bt1Bt2 with a connection of 1
//       result[key].push({
//         range: "NONE_Event",
//         connections: noneCount - (noneCount - noneOnlyCount),
//       });
//     }
//   });

//   // console.log(JSON.stringify(result, null, 2));
//   return result;
// }

// function checkEvent_UIMainB(data, ui) {
//   const result = {};

//   // Filter to process only "UIMainB"
//   const keysToProcess = [ui];

//   keysToProcess.forEach((key) => {
//     if (data[key]) {
//       // Initialize the array for the key (e.g., UIMainB)
//       result[key] = [];

//       // Handle the 'NONE - NONEONLY' calculation
//       const noneCount =
//         data[key].find((item) => item.Click === "NONE")?.Count || 0;
//       const noneOnlyCount =
//         data[key].find((item) => item.Click === "NONEONLY")?.Count || 0;
//       result[key].push({
//         range: "All_Event",
//         connections: noneCount - noneOnlyCount,
//       });

//       // Add Bt1Bt2 with a connection of 1
//       result[key].push({
//         range: "NONE_Event",
//         connections: noneCount - (noneCount - noneOnlyCount),
//       });
//     }
//   });

//   // console.log(JSON.stringify(result, null, 2));
//   return result;
// }

// function getData_UIMainA(data, ui) {
//   const result = {};

//   // Filter to process only "UIMainB"
//   const keysToProcess = [ui];

//   keysToProcess.forEach((key) => {
//     if (data[key]) {
//       // Initialize the array for the key (e.g., UIMainB)
//       result[key] = [];

//       // Handle the 'NONE - NONEONLY' calculation
//       const noneCount =
//         data[key].find((item) => item.Click === "NONE")?.Count || 0;
//       const noneOnlyCount =
//         data[key].find((item) => item.Click === "NONEONLY")?.Count || 0;
//       result[key].push({
//         range: "All_Event",
//         connections: noneCount - noneOnlyCount,
//       });

//       // Handle the rest of the buttons and connections
//       const bt1Bt2Count =
//         data[key].find((item) => item.Click === "Bt1Bt2")?.Count || 0;
//       data[key].forEach((item) => {
//         if (
//           item.Click !== "NONE" &&
//           item.Click !== "NONEONLY" &&
//           item.Click !== "Bt1Bt2"
//         ) {
//           let connections = item.Count;

//           // Subtract Bt1Bt2 count from MainA_Button1 and MainA_Button2
//           if (item.Click === "MainA_Button1") {
//             connections -= bt1Bt2Count;
//           } else if (item.Click === "MainA_Button2") {
//             connections -= bt1Bt2Count;
//           }

//           result[key].push({
//             range: item.Click,
//             connections: connections,
//           });
//         }
//       });

//       // Add Bt1Bt2 with a connection of 1
//       result[key].push({
//         range: "Bt1Bt2",
//         connections: bt1Bt2Count,
//       });
//     }
//   });

//   // console.log(JSON.stringify(result, null, 2));
//   return result;
// }

// function getData_UIMainB(data, ui) {
//   const result = {};

//   // Filter to process only "UIMainB"
//   const keysToProcess = [ui];

//   keysToProcess.forEach((key) => {
//     if (data[key]) {
//       // Initialize the array for the key (e.g., UIMainB)
//       result[key] = [];

//       // Handle the 'NONE - NONEONLY' calculation
//       const noneCount =
//         data[key].find((item) => item.Click === "NONE")?.Count || 0;
//       const noneOnlyCount =
//         data[key].find((item) => item.Click === "NONEONLY")?.Count || 0;
//       result[key].push({
//         range: "All_Event",
//         connections: noneCount - noneOnlyCount,
//       });

//       // Handle the rest of the buttons and connections
//       const bt1Bt2Count =
//         data[key].find((item) => item.Click === "Bt1Bt2")?.Count || 0;
//       data[key].forEach((item) => {
//         if (
//           item.Click !== "NONE" &&
//           item.Click !== "NONEONLY" &&
//           item.Click !== "Bt1Bt2"
//         ) {
//           let connections = item.Count;

//           // Subtract Bt1Bt2 count from MainA_Button1 and MainA_Button2
//           // if (item.Click === "MainA_Button1") {
//           //   connections -= bt1Bt2Count;
//           // } else if (item.Click === "MainA_Button2") {
//           //   connections -= bt1Bt2Count;
//           // }

//           if (item.Click === "MainA_Button1") {
//             connections -= bt1Bt2Count;
//           } else if (item.Click === "MainA_Button2") {
//             connections -= bt1Bt2Count;
//           }

//           result[key].push({
//             range: item.Click,
//             connections: connections,
//           });
//         }
//       });

//       // Add Bt1Bt2 with a connection of 1
//       result[key].push({
//         range: "Bt1Bt2",
//         connections: bt1Bt2Count,
//       });
//     }
//   });

//   return result;
//   // console.log(JSON.stringify(result, null, 2));
// }

exports.saveABtest = async (req, res) => {
  // console.log("saveABtest");

  const tableName = "UserActions"; // Ensure this is the correct table name
  const { IP, UI, CLICK } = req.body; // Get the values from the request body

  // Validate if required fields are present
  if (!IP || !UI || !CLICK) {
    return res
      .status(400)
      .json({ message: "Missing required fields: IP, UI, or CLICK" });
  }

  // Insert the data into the database
  const query = `INSERT INTO ${tableName} (IP, UI, CLICK) VALUES (?, ?, ?)`;

  try {
    console.log("Executing query:", query, [IP, UI, CLICK]);
    const result = await queryPromise(query, [IP, UI, CLICK]);
    console.log("Database insert result: ", result);

    // Ensure a response is sent
    return res.status(200).json({ message: "Data saved successfully", result });
  } catch (error) {
    console.error("Database error: ", error);

    // Send error response
    return res.status(500).json({ message: "Database error", error });
  }
};

// Helper function for executing database queries
const queryPromise = (sql, values) => {
  return new Promise((resolve, reject) => {
    db_abTest.query(sql, values, (error, results) => {
      if (error) {
        console.error("QueryPromise Error:", error); // แสดงข้อผิดพลาด
        return reject(error); // หากเกิดข้อผิดพลาด reject ทันที
      }
      console.log("QueryPromise Results:", results); // แสดงผลลัพธ์
      resolve(results); // หากสำเร็จ resolve ผลลัพธ์
    });
  });
};

// ฟังก์ชันอัพโหลดและบันทึกข้อมูล ***** OK
exports.googleAdsUploadAdsIdWeek = async (req, res) => {
  const tableName = "sql_table_week_adsId";

  // ลบข้อมูลทั้งหมดในตาราง
  const deleteSql = `DELETE FROM ${tableName}`;
  try {
    await dbs_googleAds.query(deleteSql);
    console.log(`ลบข้อมูลทั้งหมดในตาราง "${tableName}" สำเร็จ!`);
  } catch (err) {
    console.error("เกิดข้อผิดพลาดในการลบข้อมูล:", err);
    return res.status(500).send("Error deleting data from the table.");
  }

  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  const filePath = req.file.path;

  if (!filePath) {
    return res.status(500).send("File path is missing.");
  }

  const results = [];
  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", (data) => results.push(data))
    .on("end", async () => {
      const query = `
        INSERT INTO ${tableName} (  -- เปลี่ยนชื่อตารางให้ตรง
          campaign, ad_group, ad_id, week, ad_strength, clicks, ctr, conv_rate, impressions, conversions,cost,
          impression_absolute_top_percent, impression_top_percent, cost_per_conv,
          click_conversion_rate, cross_device_conv, engagements
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const insertPromises = results.map((row) => {
        try {
          const week = moment(row.Week.split(" to ")[0], "MMM DD, YYYY").format(
            "YY-MM-DD"
          );

          const values = [
            row.Campaign || null,
            row["Ad group"] || null,
            row["Ad ID"] || null,
            week || null,
            row["Ad strength"] || null,
            parseInt(row.Clicks) || 0,
            parseFloat(row.CTR.replace("%", "")) || 0,
            parseFloat(row["Conv. rate"].replace("%", "")) || 0,
            parseInt(row.Impressions) || 0,
            parseInt(row.Conversions) || 0,
            parseFloat(row.Cost.replace("฿", "").replace(",", "")) || 0, // แก้ไขตรงนี้
            parseFloat(row["Impression (Absolute Top) %"].replace("%", "")) ||
              0,
            parseFloat(row["Impression (Top) %"].replace("%", "")) || 0,
            parseFloat(row["Cost / conv."].replace("฿", "").replace(",", "")) ||
              0,
            parseFloat(row["Click conversion rate"].replace("%", "")) || 0,
            parseInt(row["Cross-device conv."]) || 0,
            parseInt(row.Engagements) || 0,
          ];

          return dbs_googleAds.query(query, values);
        } catch (error) {
          console.error("Error processing row:", error);
        }
      });

      try {
        await Promise.all(insertPromises);
        fs.unlinkSync(filePath); // ลบไฟล์หลังจากประมวลผลเสร็จ
        res.send("File uploaded and data inserted into the database.");
      } catch (error) {
        console.error("Error inserting data:", error);
        res.status(500).send("An error occurred while inserting data.");
      }
    });
};

//sql_table_day_adid
// ฟังก์ชันอัพโหลดและบันทึกข้อมูล ***** OK
exports.googleAdsUploadAdsIdDay = async (req, res) => {
  const tableName = "sql_table_day_adsId";

  // ลบข้อมูลทั้งหมดในตาราง
  const deleteSql = `DELETE FROM ${tableName}`;
  try {
    await dbs_googleAds.query(deleteSql);
    console.log(`ลบข้อมูลทั้งหมดในตาราง "${tableName}" สำเร็จ!`);
  } catch (err) {
    console.error("เกิดข้อผิดพลาดในการลบข้อมูล:", err);
    return res.status(500).send("Error deleting data from the table.");
  }

  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  const filePath = req.file.path;

  if (!filePath) {
    return res.status(500).send("File path is missing.");
  }

  const results = [];
  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", (data) => results.push(data))
    .on("end", async () => {
      const query = `
        INSERT INTO ${tableName} (  -- เปลี่ยนชื่อตารางให้ตรง
          campaign, ad_group, ad_id, day, ad_strength, clicks, ctr, conv_rate, impressions, conversions,cost,
          impression_absolute_top_percent, impression_top_percent, cost_per_conv,
          click_conversion_rate, cross_device_conv, engagements
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const insertPromises = results.map((row) => {
        try {
          const day = moment(row.Day.split(" to ")[0], "MMM DD, YYYY").format(
            "YY-MM-DD"
          );

          const values = [
            row.Campaign || null,
            row["Ad group"] || null,
            row["Ad ID"] || null,
            day || null,
            row["Ad strength"] || null,
            parseInt(row.Clicks) || 0,
            parseFloat(row.CTR.replace("%", "")) || 0,
            parseFloat(row["Conv. rate"].replace("%", "")) || 0,
            parseInt(row.Impressions) || 0,
            parseInt(row.Conversions) || 0,
            parseFloat(row.Cost.replace("฿", "").replace(",", "")) || 0, // แก้ไขตรงนี้
            parseFloat(row["Impression (Absolute Top) %"].replace("%", "")) ||
              0,
            parseFloat(row["Impression (Top) %"].replace("%", "")) || 0,
            parseFloat(row["Cost / conv."].replace("฿", "").replace(",", "")) ||
              0,
            parseFloat(row["Click conversion rate"].replace("%", "")) || 0,
            parseInt(row["Cross-device conv."]) || 0,
            parseInt(row.Engagements) || 0,
          ];

          return dbs_googleAds.query(query, values);
        } catch (error) {
          console.error("Error processing row:", error);
        }
      });

      try {
        await Promise.all(insertPromises);
        fs.unlinkSync(filePath); // ลบไฟล์หลังจากประมวลผลเสร็จ
        res.send("File uploaded and data inserted into the database.");
      } catch (error) {
        console.error("Error inserting data:", error);
        res.status(500).send("An error occurred while inserting data.");
      }
    });
};
