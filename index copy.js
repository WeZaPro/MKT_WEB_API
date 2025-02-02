const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
// const bcrypt = require("bcrypt");
// const mysql = require("mysql2");

// app.use(express.json());

var mysql = require("mysql");
// const axios = require("axios");
require("dotenv").config();
// const line = require("@line/bot-sdk");
const jwt = require("jsonwebtoken");

const controllerUser = require("./controller.user");
const controllerReport = require("./controller.reports");
const controllerGoogleAds = require("./controller.googleads");
const controllerChart = require("./controller.chart");
const controllerManagement = require("./controller.management");
const controllerFacebook = require("./controller.fb");

const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true })); // Allow handling FormData
app.use(bodyParser.json());

// Init folder *****************START
//******************** */
const uploadFolder = path.join(__dirname, "uploads_fileRegisterForm");

// สร้างโฟลเดอร์ถ้ายังไม่มี
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder);
}

// กำหนดการตั้งค่า multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadFolder); // เก็บไฟล์ในโฟลเดอร์
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname); // ตั้งชื่อไฟล์ใหม่ให้ไม่ซ้ำ
  },
});
const use_uploads_fileRegisterForm = multer({ storage });

//******************** */
const uploadFolder_AddImage = path.join(__dirname, "uploadsProducts");
if (!fs.existsSync(uploadFolder_AddImage)) {
  fs.mkdirSync(uploadFolder_AddImage);
}

const storage_AddImage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadFolder_AddImage); // Ensure the folder exists
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    console.log(`File received: ${file.originalname}`); // Log the file to debug
    cb(null, uniqueSuffix + "-" + file.originalname); // Set the filename
  },
});

const uploadData_AddProduct = multer({ storage: storage_AddImage });

//******************** */
const uploadFolder_googleAds = path.join(__dirname, "uploadsGoogleAds");
if (!fs.existsSync(uploadFolder_googleAds)) {
  fs.mkdirSync(uploadFolder_googleAds);
}

const storage_googleAds = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadFolder_googleAds); // Ensure the folder exists
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    console.log(`File received: ${file.originalname}`); // Log the file to debug
    cb(null, uniqueSuffix + "-" + file.originalname); // Set the filename
  },
});

const uploadData_google = multer({ storage: storage_googleAds });

// Init folder *****************End

//**********ENABLE FOLDER */ start

app.use(
  "/uploads_fileRegisterForm",
  express.static(path.join(__dirname, "uploads_fileRegisterForm"))
);
app.use(
  "/uploadsGoogleAds",
  express.static(path.join(__dirname, "uploadsGoogleAds"))
);

app.use(
  "/upload_buckProductsImage",
  express.static(path.join(__dirname, "upload_buckProductsImage"))
);

app.use(
  "/uploadsProducts",
  express.static(path.join(__dirname, "uploadsProducts"))
);

//**********ENABLE FOLDER */ end

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    return res.status(200).json({});
  }
  next();
});

//TODO security

const checkStatus = async (req, res, next) => {
  // console.log("checkStatus ", req.user.status);
  try {
    if (req.user.status == 0) {
      return res.status(401).json({ message: "Not Approve Account" });
    } else {
      next();
    }
    // res.json(rows);
  } catch (error) {
    // Handle error
    res.status(500).json({ message: "Error retrieving user data", error });
  }
  // req.user = user;
  // next();
};

const checkAuthenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    req.user = user; // แนบข้อมูล user ไว้ใน req.user
    // console.log("req.user ", req.user);
    next();
  });
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ message: "No token provided" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid token" });

    req.user = user; // แนบข้อมูล user ไว้ใน req.user

    next();
  });
};
//TODO End Secu

// app.get("/test-image", (req, res) => {
//   res.sendFile(path.join(__dirname, "productsImage", "buck_A1.jpg"));
// });

//TODO -USE -start
//-------User************** start
app.post("/register", controllerUser.register);
app.post("/login", controllerUser.login);
app.get("/user", authenticateToken, controllerUser.user);
app.post("/submitformNotFile", controllerUser.submitFreeCourse);
app.post(
  "/submitformFile",
  use_uploads_fileRegisterForm.single("file"),
  controllerUser.submit
);
app.get(
  "/getRegisterData",
  [authenticateToken, checkStatus],
  controllerReport.getRegisterData
);
//-------User************** end
//
//-------Facebook ------start
app.get("/fbPost", controllerFacebook.fbGetPost);
//-------Facebook ------end
//
//-------Google ads************** start
app.post(
  "/saveABtest",
  (req, res, next) => {
    next();
  },
  controllerGoogleAds.saveABtest
);

// app.get(
//   "/getABtest",
//   [authenticateToken, checkStatus],
//   controllerManagement.getABtest
// );

app.get(
  "/getABtest",
  (req, res, next) => {
    next();
  },
  controllerGoogleAds.getABtest
);

app.post(
  "/googleAdsUploadAdsIdWeek",
  (req, res, next) => {
    next();
  },
  uploadData_google.single("file"),
  controllerGoogleAds.googleAdsUploadAdsIdWeek
);

app.post(
  "/googleAdsUploadAdsIdDay",
  (req, res, next) => {
    next();
  },
  uploadData_google.single("file"),
  controllerGoogleAds.googleAdsUploadAdsIdDay
);
app.post("/chartEngageAdsQryAdId", controllerChart.chartEngageAdsQryAdId);
//-----
app.get("/listCampaigns", controllerGoogleAds.listCampaigns);
app.get("/listAllAdsId", controllerGoogleAds.listAdsId);
//-------Google ads ************** end
//
// Management ************** start
app.get("/getPublic", [checkAuthenticateToken], controllerReport.public);
app.post(
  "/upload-json",
  [authenticateToken],
  controllerManagement.uploadProductAll
);
// ----Products
app.get(
  "/Product",
  [authenticateToken, checkStatus],
  controllerManagement.getAllProducts
);
app.post(
  "/Product",
  uploadData_AddProduct.single("file"),
  [authenticateToken, checkStatus],
  controllerManagement.addProduct
);
app.get(
  "/Product/:id",
  [authenticateToken, checkStatus],
  controllerManagement.getProductId
);
app.put(
  "/Product/:id",
  uploadData_AddProduct.single("file"),
  [authenticateToken, checkStatus],
  controllerManagement.editProductId
);

app.delete(
  "/DeleteProductId",
  [authenticateToken, checkStatus],
  controllerManagement.deleteProductId
);
//

app.post(
  "/transactions",
  [authenticateToken, checkStatus],
  controllerManagement.addTransactions
);

app.get(
  "/allTransactions",
  [authenticateToken, checkStatus],
  controllerManagement.getTransactions
);

app.get(
  "/Stock/:id",
  [authenticateToken, checkStatus],
  controllerManagement.getStockId
);

app.get(
  "/allStock",
  [authenticateToken, checkStatus],
  controllerManagement.getAllStock
);
// post productall -OK
// get productall -OK
// add product -OK

// get product by product Id / by createby_id -OK
// edit product by product Id / by createby_id -OK
// delete product byId by product Id / by createby_id -OK
// delete product shopId

// stock - getStock -OK
// transaction - getTransaction -OK
// transaction IN/OUT , IN=AddStock -OK
// order

// app.get("/test-image", (req, res) => {
//   res.sendFile(path.join(__dirname, "productsImage", "image1.jpg"));
// });
// Management ************** end

//
//TODO -USE -end
//------HOLD-----

//---AB TEST
// app.put(
//   "/abTesting",
//   [authenticateToken, checkStatus],
//   controllerGoogleAds.updateAbTesting
// );
// app.post(
//   "/abTesting",
//   [authenticateToken, checkStatus],
//   controllerGoogleAds.addAbTesting
// );

// app.get(
//   "/abTesting",
//   [authenticateToken, checkStatus],
//   controllerGoogleAds.getAbTesting
// );
//---AB TEST END

app.get("/GetDataAdsGroupDate", controllerGoogleAds.GetDataAdsGroupDate);
app.get(
  "/GetDataAdsGroupWeekByCampaign",
  controllerGoogleAds.GetDataAdsGroupWeek_fromCampaign
);
app.get(
  "/GetDataAdsGroupWeekByCampaignAndFilterAdGroup",
  controllerGoogleAds.GetDataAdsGroupWeekByCampaignAndFilterAdGroup
);
//---OK
app.get(
  "/GetDataAdsGroupWeekByCampaignAndFilter",
  controllerGoogleAds.GetDataAdsGroupWeekByCampaignAndFilter
);

app.get("/GetDataAdsIdDate", controllerGoogleAds.GetDataAdsIdDate);
app.get(
  "/GetDataAdsIdDateGroupAdsId",
  controllerGoogleAds.GetDataAdsIdDateGroupAdsId
);
app.get(
  "/GetDataAdsIdDateFilterAdsId",
  controllerGoogleAds.GetDataAdsIdDateFilterAdsId
);

app.get(
  "/getReport",
  [authenticateToken, checkStatus],
  controllerReport.getReport
);

// simple route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to Register API application." });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});
