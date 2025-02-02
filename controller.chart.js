const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
// var dbs = require("./db");
var dbs_googleAds = require("./db_googleAds");
const axios = require("axios");
require("dotenv").config();
const line = require("@line/bot-sdk");
const csv = require("csv-parser");
const moment = require("moment"); // เพิ่ม moment สำหรับจัดการวันที่

const bodyParser = require("body-parser");
require("dotenv").config();
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true })); // Allow handling FormData
app.use(bodyParser.json());
//
// exports.chartEngageAdsQryAdId = async (req, res) => {
//   const tableName = "sql_table_week_adsId";
//   const { startDate, endDate, campaign, impressions } = req.body;
//   // ตรวจสอบว่ามีการส่งค่าช่วงวันที่เข้ามาหรือไม่
//   if (!startDate || !endDate) {
//     return res
//       .status(400)
//       .json({ message: "Please provide startDate and endDate" });
//   }

//   // ตรวจสอบว่ามีการส่งค่าของ impressions หรือไม่
//   if (impressions === undefined) {
//     return res
//       .status(400)
//       .json({ message: "Please provide impressions value" });
//   }

//   // สร้างคำสั่ง SQL
//   const sql = `
//   SELECT
//     week,
//     ad_group,
//     ad_id,
//     clicks,
//     impressions,
//     conversions,
//     ROUND(conv_rate, 2) AS conv_rate,
//     ROUND(ctr, 2) AS ctr
//   FROM
//     ${tableName}
//   WHERE
//     week BETWEEN ? AND ?
//     AND campaign = ?
//     AND impressions >= ?
//   ORDER BY
//     ad_group ASC,
//     ad_id ASC,
//     week ASC;

// `;
//   const params = [startDate, endDate, campaign, impressions];
//   try {
//     const [rows] = await dbs_googleAds.execute(sql, params);

//     console.log("row.campaign ", rows);

//     if (rows.length === 0) {
//       return res
//         .status(404)
//         .json({ message: "No data found for the given query parameters." });
//     }

//     res.status(200).json({
//       campaign,
//       date: `${startDate} & ${endDate}`,
//       data: rows,
//     });
//   } catch (error) {
//     console.error("Database query error:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// exports.chartEngageAdsQryAdId = async (req, res) => {
//   const tableName = "sql_table_week_adsId";
//   const { startDate, endDate, campaign, impressions } = req.body;

//   if (!startDate || !endDate) {
//     return res
//       .status(400)
//       .json({ message: "Please provide startDate and endDate" });
//   }

//   if (impressions === undefined) {
//     return res
//       .status(400)
//       .json({ message: "Please provide impressions value" });
//   }

//   const sql = `
//       SELECT
//         week,
//         ad_group,
//         ad_id,
//         clicks,
//         impressions,
//         conversions,
//         ROUND(conv_rate, 2) AS conv_rate,
//         ROUND(ctr, 2) AS ctr
//       FROM
//         ${tableName}
//       WHERE
//         week BETWEEN ? AND ?
//         AND campaign = ?
//         AND impressions >= ?
//       ORDER BY
//         ad_group ASC,
//         ad_id ASC,
//         week ASC;
//     `;
//   const params = [startDate, endDate, campaign, impressions];

//   try {
//     const [rows] = await dbs_googleAds.execute(sql, params);

//     if (rows.length === 0) {
//       return res
//         .status(404)
//         .json({ message: "No data found for the given query parameters." });
//     }

//     // จัดกลุ่มข้อมูล
//     const groupedData = rows.reduce((acc, row) => {
//       const { ad_group, ad_id, week, ...chartData } = row;

//       // ค้นหากลุ่มที่ตรงกันใน acc
//       let group = acc.find((g) => g.ad_group === ad_group && g.ad_id === ad_id);

//       if (!group) {
//         // ถ้ายังไม่มี ให้สร้างกลุ่มใหม่
//         group = {
//           week_list: [],
//           ad_group,
//           ad_id,
//           chartData: [],
//         };
//         acc.push(group);
//       }

//       // เพิ่มข้อมูลสัปดาห์และ chartData
//       group.week_list.push(week);
//       group.chartData.push(chartData);

//       return acc;
//     }, []);

//     // ส่งข้อมูลกลับ
//     res.status(200).json({
//       campaign,
//       date: `${startDate} & ${endDate}`,
//       data: groupedData,
//     });
//   } catch (error) {
//     console.error("Database query error:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

exports.chartEngageAdsQryAdId = async (req, res) => {
  console.log("chartEngageAdsQryAdId req.body.startDate ", req.body.startDate);
  console.log("chartEngageAdsQryAdId req.body.endDate ", req.body.endDate);
  const tableName = "sql_table_week_adsId";
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
      week,
      ad_group,
      ad_id,
      clicks,
      impressions,
      conversions,
      cost
    FROM 
      ${tableName}
    WHERE 
      week BETWEEN ? AND ? 
      AND campaign = ?
      AND impressions >= ?
    ORDER BY 
      ad_group ASC, 
      ad_id ASC,
      week ASC;
  `;
  const params = [startDate, endDate, campaign, impressions];

  try {
    const [rows] = await dbs_googleAds.execute(sql, params);

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ message: "No data found for the given query parameters." });
    }

    // จัดกลุ่มข้อมูล
    const groupedData = rows.reduce((acc, row) => {
      const { ad_group, ad_id, week, clicks, impressions, conversions, cost } =
        row;

      let group = acc.find(
        (item) => item.ad_group === ad_group && item.ad_id === ad_id
      );

      if (!group) {
        group = {
          ad_group,
          ad_id,
          week_list: [],
          click: [],
          impressions: [],
          conversions: [],
          cost: [],
        };
        acc.push(group);
      }

      group.week_list.push(week);
      group.click.push(clicks);
      group.impressions.push(impressions);
      group.conversions.push(conversions);
      group.cost.push(cost);

      return acc;
    }, []);

    // ส่งข้อมูลที่จัดกลุ่มแล้ว
    res.status(200).json({
      campaign,
      date: `${startDate} & ${endDate}`,
      data: groupedData,
    });
  } catch (error) {
    console.error("Database query error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
