var dbs = require("./db");
var db_promise = require("./db_promise");
require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const app = express();
app.use(express.json());
// const mysql = require("mysql2");
const folderImgAll = process.env.folder_AddProduct;
const sourceImageFolder = process.env.folder_image_all;
const uploadSourceFolder = path.join(__dirname, sourceImageFolder);
const uploadTargetFolder = path.join(__dirname, folderImgAll);

const baseUrl = process.env.API_URL; // เปลี่ยน URL นี้ตามการตั้งค่าของคุณ

exports.uploadProductAll = async (req, res) => {
  // console.log("uploadProductAll");
  const tableName = "products";
  try {
    const filePath = path.join(__dirname, "./data_json/buckdata.json"); // กำหนดตำแหน่งไฟล์ JSON
    const fileContent = fs.readFileSync(filePath, "utf8");
    const jsonData = JSON.parse(fileContent);

    const { data } = jsonData;
    // console.log("data ", data);

    for (const product of data) {
      const {
        product_code,
        product_group,
        name,
        product_image,
        price,
        sale,
        description,
      } = product;

      // ตรวจสอบว่ารูปภาพมีอยู่ในโฟลเดอร์ต้นทาง
      const sourceImagePath = path.join(uploadSourceFolder, product_image);
      if (!fs.existsSync(sourceImagePath)) {
        console.error(`Image not found: ${sourceImagePath}`);
        continue;
      }

      // ย้ายรูปภาพไปยังโฟลเดอร์เป้าหมาย
      const targetImagePath = path.join(uploadTargetFolder, product_image);
      fs.copyFileSync(sourceImagePath, targetImagePath);

      // console.log(`Image copied: ${sourceImagePath} -> ${targetImagePath}`);

      // แปลง path รูปภาพให้เป็น URL
      // const imageUrl = `${baseUrl}/${product_image.replace("./", "")}`;
      const imageUrl = `${baseUrl}/${folderImgAll}/${path.basename(
        product_image
      )}`;

      // console.log("imageUrl ", imageUrl);

      // ตรวจสอบและแปลงค่าราคาและจำนวนขาย
      // const price = parseInt(price, 10);

      // บันทึกข้อมูลลงใน MySQL
      await dbs.query(
        `INSERT INTO ${tableName} (product_code, product_group, name, image, price,sale,description, created_by,company_id,company_name) VALUES (?, ?, ?, ?, ?, ?,?, ?, ?,?)`,
        [
          product_code, // 1
          product_group, // 2
          name, // 3
          imageUrl, // 4
          price, // 5
          sale, // 5
          description, // 7
          req.user.id,
          req.user.company_id,
          req.user.company_name,
          // ค่านี้เป็นส่วนเกิน
        ]
      );
    }
    res.send({
      message: "File uploaded successfully to Google Drive and MySQL!",
      // dataCustomer: req.body,
      // file: {
      //   name: imageUrl.filename,
      //   url: imageUrl,
      //   mimetype: imageUrl.mimetype,
      //   size: imageUrl.size,
      // },
    });

    // res.status(201).json({ message: "Products uploaded successfully" });
  } catch (error) {
    console.error("Error uploading products:", error);
    res.status(500).json({ message: "Error uploading products", error });
  }
};

exports.ProductList = async (req, res) => {
  const tableName = "products";
  // รับพารามิเตอร์ adsId จาก request (ถ้ามี)
  const { adsId } = req.query;

  // สร้างคำสั่ง SQL เริ่มต้น
  let sql = `
    SELECT 
        name,
        COUNT(*) AS count
    FROM 
        ${tableName}
    WHERE 
        1 = 1
  `;

  // กำหนดพารามิเตอร์สำหรับ Query
  const params = [];

  // เพิ่มเงื่อนไขสำหรับ adsId ถ้ามี
  if (adsId) {
    sql += ` AND id = ?`;
    params.push(adsId);
  }

  // เพิ่ม GROUP BY
  sql += ` GROUP BY name`;

  try {
    // ดึงข้อมูลจากฐานข้อมูล
    const [rows] = await db_promise.execute(sql, params);

    // ส่งข้อมูลกลับในรูปแบบ JSON
    res.status(200).json({
      message: "Products retrieved successfully",
      data: rows,
    });
  } catch (error) {
    // จัดการข้อผิดพลาด
    console.error("Error fetching products:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

exports.getAllProducts = async (req, res) => {
  // console.log("req.user ", req.user);
  const tableName = "products";

  try {
    if (!req.user || !req.user.id) {
      return res.status(400).json({ message: "User ID not found in request" });
    }

    const rows = await new Promise((resolve, reject) => {
      dbs.query(
        `SELECT * FROM ${tableName} WHERE created_by = ?`,
        [req.user.id],
        (err, results) => {
          // console.log("results ", results);
          if (err) return reject(err);
          resolve(results);
        }
      );
    });

    // console.log("rows:", rows);
    res.json(rows); // ส่งข้อมูลกลับเป็น JSON
  } catch (error) {
    console.error("Error retrieving products:", error);
    res.status(500).json({ message: "Error retrieving products", error });
  }
};

exports.editProductId = async (req, res) => {
  // console.log("req.user ", req.user);
  const tableName = "products";
  try {
    const { id } = req.params;
    // console.log("id params ", req.params);

    const {
      name,
      description,
      price,
      product_code,
      product_group,
      sale,
      imageUrl,
      image_name,
    } = req.body;

    console.log("body ", req.body);
    console.log("req.file >>>>>> ", req.file);
    // console.log("file ", req.file);

    // console.log("file name nodejs----> ", req.file.filename);
    console.log("image_name----> ", req.body.image_name);
    // get image name

    const url = image_name;
    const filename = path.basename(url); // "1734913124249.jpg"
    const value_image_name = path.parse(filename).name; // "1734913124249"
    const extension = path.extname(filename); // ".jpg"

    // console.log("value_image_name ", value_image_name); // 1734913124249
    // console.log("extension ", extension); // 1734913124249

    let imagePath;

    if (req.file) {
      // หากมีไฟล์ใหม่ ใช้ path ของไฟล์นั้น
      imagePath = req.file
        ? `${baseUrl}/${folderImgAll}/${req.file.filename}`
        : null; // หรือปรับตามระบบการเก็บไฟล์ของคุณ
      console.log("imagePath Have File >>>>>> ", imagePath);
    } else {
      // หากไม่มีไฟล์ใหม่ ใช้ URL เดิมจาก body
      imagePath = req.body.image_name;
      console.log("imagePath No File >>>>>> ", imagePath);
    }

    // อัปเดตข้อมูลในฐานข้อมูล
    await dbs.query(
      `UPDATE ${tableName} SET name = ?, description = ?,price = ?,product_code = ?,product_group = ?,sale = ?, image = ? WHERE id = ? AND created_by = ?`,
      [
        name,
        description,
        price,
        product_code,
        product_group,
        sale,
        imagePath,
        id,
        req.user.id,
      ]
    );

    const fileName = `${value_image_name}${extension}`; // ชื่อไฟล์
    const directory = `./${folderImgAll}`; // โฟลเดอร์ที่เก็บไฟล์
    deleteImageFile(fileName, directory);
    // console.log("fileName ", fileName);
    // console.log("directory ", directory);

    res.json({ message: "Product updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error updating product", error });
  }
};

exports.addTransactions = async (req, res) => {
  const { product_id, type, quantity } = req.body;
  console.log("req.body ==> ", req.body);

  if (!product_id || !type || !quantity)
    return res.status(400).json({ message: "All fields are required" });

  try {
    // ตรวจสอบว่า type เป็น "IN" หรือ "OUT"
    if (type === "out") {
      console.log("type === out ==> ");
      // ตรวจสอบว่ามีสินค้าใน Stock เพียงพอหรือไม่
      const [stock] = await db_promise.query(
        "SELECT quantity FROM stock WHERE product_id = ? AND company_id = ?",
        [product_id, req.user.company_id]
      );

      if (stock.length === 0)
        return res.status(404).json({ message: "Stock not found" });

      if (stock[0].quantity < quantity)
        return res.status(400).json({ message: "Insufficient stock" });

      // หักจำนวนใน Stock
      await db_promise.query(
        "UPDATE stock SET quantity = quantity - ? WHERE product_id = ? AND company_id = ?",
        [quantity, product_id, req.user.company_id]
      );
    } else if (type === "in") {
      // เพิ่มจำนวนใน Stock สำหรับการเพิ่มสินค้า
      console.log("type === in ==> ");
      const [stock] = await db_promise.query(
        "SELECT quantity FROM stock WHERE product_id = ? AND company_id = ?",
        [product_id, req.user.company_id]
      );
      console.log("stock>>>> ", stock.length);
      if (stock.length === 0) {
        // ถ้ายังไม่มีข้อมูลสินค้าใน Stock ให้ทำการเพิ่ม
        await db_promise.query(
          "INSERT INTO stock (product_id, quantity, company_id, company_name) VALUES (?, ?, ?, ?)",
          [product_id, quantity, req.user.company_id, req.user.company_name]
        );
      } else {
        // ถ้ามีสินค้าใน Stock แล้ว เพิ่มจำนวน
        await db_promise.query(
          "UPDATE stock SET quantity = quantity + ? WHERE product_id = ? AND company_id = ?",
          [quantity, product_id, req.user.company_id]
        );
      }
    }

    // console.log(" req.user.id ", req.user.id);
    // const [user] = await db_promise.query("SELECT id FROM users WHERE id = ?", [
    //   req.user.id,
    // ]);
    // const [product] = await db_promise.query(
    //   "SELECT id FROM products WHERE id = ?",
    //   [product_id]
    // );

    // console.log("[user] ", [user]);
    // console.log("[product] ", [product]);

    // เพิ่มข้อมูลลงใน Transactions
    await db_promise.query(
      "INSERT INTO transactions (product_id, user_id, company_id, company_name, type, quantity, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())",

      [
        product_id,
        req.user.id,
        req.user.company_id,
        req.user.company_name,
        type,
        quantity,
      ]
    );

    res.status(201).json({ message: "Transaction added successfully" });
  } catch (error) {
    console.error("Error adding transaction: ", error);
    res.status(500).json({ message: "Error adding transaction", error });
  }
};

// exports.addTransactions = async (req, res) => {
//   const { product_id, type, quantity } = req.body;
//   console.log("req.body ==> ", req.body);

//   if (!product_id || !type || !quantity)
//     return res.status(400).json({ message: "All fields are required" });

//   try {
//     // ตรวจสอบว่า type เป็น "IN" หรือ "OUT"
//     if (type === "out") {
//       console.log("type === out ==> ");
//       // ตรวจสอบว่ามีสินค้าใน Stock เพียงพอหรือไม่
//       const [stock] = await db_promise.query(
//         "SELECT quantity FROM stock WHERE product_id = ? AND company_id = ?",
//         [product_id, req.user.company_id]
//       );

//       if (stock.length === 0)
//         return res.status(404).json({ message: "Stock not found" });

//       if (stock[0].quantity < quantity)
//         return res.status(400).json({ message: "Insufficient stock" });

//       // หักจำนวนใน Stock
//       await db_promise.query(
//         "UPDATE stock SET quantity = quantity - ? WHERE product_id = ? AND company_id = ?",
//         [quantity, product_id, req.user.company_id]
//       );
//     } else if (type === "in") {
//       // เพิ่มจำนวนใน Stock สำหรับการเพิ่มสินค้า
//       console.log("type === in ==> ");
//       const [stock] = await db_promise.query(
//         "SELECT quantity FROM stock WHERE product_id = ? AND company_id = ?",
//         [product_id, req.user.company_id]
//       );

//       if (stock.length === 0) {
//         // ถ้ายังไม่มีข้อมูลสินค้าใน Stock ให้ทำการเพิ่ม
//         await db_promise.query(
//           "INSERT INTO stock (product_id, quantity, company_id, company_name) VALUES (?, ?, ?, ?)",
//           [product_id, quantity, req.user.company_id, req.user.company_name]
//         );
//       } else {
//         // ถ้ามีสินค้าใน Stock แล้ว เพิ่มจำนวน
//         await db_promise.query(
//           "UPDATE stock SET quantity = quantity + ? WHERE product_id = ? AND company_id = ?",
//           [quantity, product_id, req.user.company_id]
//         );
//       }

//       // เพิ่มข้อมูลลงใน Transactions
//       await dbs.query(
//         "INSERT INTO transactions (product_id, user_id, company_id, company_name, type, quantity, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())",
//         [
//           product_id,
//           req.user.id,
//           req.user.company_id,
//           req.user.company_name,
//           type,
//           quantity,
//         ]
//       );
//     }

//     res.status(201).json({ message: "Transaction added successfully" });
//   } catch (error) {
//     console.error("Error adding transaction: ", error);
//     res.status(500).json({ message: "Error adding transaction", error });
//   }
// };
exports.getTransactions = async (req, res) => {
  try {
    const [rows] = await db_promise.query(
      `SELECT t.id, p.name AS product_name, t.type, t.quantity, t.created_at,t.user_id
         FROM transactions t
         JOIN products p ON t.product_id = p.id
         WHERE t.user_id = ?
         ORDER BY t.created_at ASC`,
      [req.user.id]
    );

    res.json(rows);
  } catch (error) {
    console.error("Error retrieving transactions: ", error);
    res.status(500).json({ message: "Error retrieving transactions", error });
  }
};

exports.getAllStock = async (req, res) => {
  try {
    // Validate user and company_name
    if (!req.user || !req.user.company_name) {
      return res.status(400).json({ message: "Invalid user data" });
    }

    // SQL query to join and calculate values
    const [rows] = await db_promise.query(
      `SELECT 
        p.id AS product_id, 
        p.name,
        p.product_code, 
        p.product_group,
        p.image, 
        p.description, 
        p.company_name, 
        p.company_id, 
        s.quantity, 
        p.price,
        (p.price * s.quantity) AS total_value,  -- Total price value
        p.sale,
        (p.sale * s.quantity) AS total_value_price  -- Total sale value
      FROM stock s
      JOIN products p ON s.product_id = p.id
      WHERE s.company_name = ?`,
      [req.user.company_name] // Filter by user's company name
    );

    res.json(rows); // Return the rows as JSON
  } catch (error) {
    console.error("Error retrieving stock: ", error); // Debugging information
    res.status(500).json({ message: "Error retrieving stock", error });
  }
};

exports.deleteProductId = async (req, res) => {
  // const { imageUrl, id } = req.body;
  const tableProsucts = "products";
  const tableStock = "stock";
  const tableTransactions = "transactions";
  console.log("req.body ", req.body);
  const { imageUrl, id } = req.body;

  const url = imageUrl;
  console.log("url ", url);

  const filename = path.basename(url);
  const value_image_name = path.parse(filename).name;
  const extension = path.extname(filename); // ".jpg"

  const fileName = `${value_image_name}${extension}`; // ชื่อไฟล์
  const directory = `./${folderImgAll}`; // โฟลเดอร์ที่เก็บไฟล์

  try {
    // ตรวจสอบว่าผลิตภัณฑ์มีอยู่ในฐานข้อมูลหรือไม่ และตรวจสอบสิทธิ์ผู้ใช้
    // const [product] = await dbs.query(
    //   `SELECT * FROM ${tableProsucts} WHERE id = ? AND created_by = ?`,
    //   [id, req.user.id]
    // );

    const product = await dbs.query(
      `SELECT * FROM ${tableProsucts} WHERE id = ? AND created_by = ?`,
      [id, req.user.id]
    );

    if (!product || product.length === 0) {
      return res
        .status(404)
        .json({ message: "Product not found or not authorized" });
    }

    //Todo รอก่อน
    // ลบข้อมูลในตาราง stock และ transactions ตาม product_id
    await dbs.query(`DELETE FROM ${tableStock} WHERE product_id = ?`, [id]);
    await dbs.query(`DELETE FROM ${tableTransactions} WHERE product_id = ?`, [
      id,
    ]);

    // ลบข้อมูลในตาราง products
    await dbs.query("DELETE FROM products WHERE id = ? AND created_by = ?", [
      id,
      req.user.id,
    ]);

    // ลบไฟล์ภาพ
    deleteImageFile(fileName, directory);

    res.json({ message: "Product and related data deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ message: "Error deleting product", error });
  }
  // res.send("delete product id");
};

//getProductId
exports.getProductId = async (req, res) => {
  const tableName = "products";
  console.log("req.user ", req.user);
  const { id } = req.params; // ดึงค่า id จาก URL
  console.log("id ", id);
  console.log("created_by ", req.user.id);
  try {
    const rows = await new Promise((resolve, reject) => {
      dbs.query(
        "SELECT * FROM products WHERE id = ? AND created_by = ?",
        [id, req.user.id],
        (err, results) => {
          console.log("results ", results);
          if (err) return reject(err);
          resolve(results);
        }
      );
    });
    console.log("rows:", rows);
    if (rows == "") {
      return res.status(404).json({ message: "Product not found" });
    } else {
      return res.json(rows);
    }
  } catch (error) {
    res.status(500).json({ message: "Error fetching product", error });
  }
};

exports.getStockId = async (req, res) => {
  const tableName = "stock";
  console.log("req.user ", req.user);
  // const { product_id } = req.params; // ดึงค่า id จาก URL
  const { id } = req.params; // ดึงค่า id จาก URL
  console.log("id ", id);
  console.log("created_by ", req.user.id);
  try {
    const rows = await new Promise((resolve, reject) => {
      dbs.query(
        `SELECT * FROM ${tableName} WHERE product_id = ? AND company_id = ?`,
        [id, req.user.company_id],
        (err, results) => {
          console.log("results ", results);
          if (err) return reject(err);
          resolve(results);
        }
      );
    });
    console.log("rows:", rows);
    if (rows == "") {
      return res.status(404).json({ message: "Product not found" });
    } else {
      return res.json(rows);
    }
  } catch (error) {
    res.status(500).json({ message: "Error fetching product", error });
  }
};

exports.addProduct = async (req, res) => {
  console.log("req.user ", req.user);
  const tableName = "products";
  // const file = req.file;
  // const create_fileName = "12345678";

  const imageUrl = req.file
    ? `${baseUrl}/${folderImgAll}/${req.file.filename}`
    : null;

  const { name, description, price, sale, product_code, product_group } =
    req.body;

  // ตรวจสอบว่าไฟล์ถูกอัปโหลดมาหรือไม่
  if (!imageUrl) {
    return res.status(400).send({ message: "No file uploaded!" });
  }

  // ตรวจสอบว่าข้อมูลที่ต้องการถูกกรอกครบถ้วน
  if (
    !name ||
    !description ||
    !price ||
    !sale ||
    !product_code ||
    !product_group
  ) {
    return res.status(400).send({ message: "All fields are required!" });
  }

  try {
    // สร้างข้อมูลที่ต้องบันทึกลงในฐานข้อมูล
    const data_register = [
      [
        name,
        description,
        price,
        sale,
        req.user.id,
        req.user.company_id,
        req.user.company_name,
        imageUrl,
        product_code,
        product_group,
      ],
    ];

    // บันทึกข้อมูลลงใน MySQL
    await appendDataSaveFileToMySql(data_register, tableName);

    // ส่งคำตอบกลับว่าไฟล์ถูกอัปโหลดสำเร็จ
    res.send({
      message: "File uploaded successfully to Google Drive and MySQL!",
      dataCustomer: req.body,
      file: {
        name: imageUrl.filename,
        url: imageUrl,
        mimetype: imageUrl.mimetype,
        size: imageUrl.size,
      },
    });
  } catch (err) {
    console.error("Error processing the request:", err);
    res
      .status(500)
      .send({ message: "Error processing the request", error: err.message });
  }
};
// const generateFileUrl = (fileName) => {
//   return `${process.env.API_URL}/${folderImgAll}/${fileName}`;
// };
async function appendDataSaveFileToMySql(data, tableName) {
  const query = `
    INSERT INTO ${tableName} (name, description,price,sale, created_by,company_id,company_name,image,product_code,product_group) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?,?);
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

function deleteImageFile(fileName, directory) {
  // กำหนด path ของไฟล์
  const filePath = path.join(directory, fileName);
  try {
    // ตรวจสอบว่าไฟล์มีอยู่หรือไม่ก่อนลบ
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        console.error(`File not found: ${filePath}`);
        return;
      }

      // ลบไฟล์
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error(`Error deleting file: ${err}`);
          return;
        }
        console.log(`File deleted successfully: ${filePath}`);
      });
    });
  } catch (err) {
    console.log(err);
  }
}
