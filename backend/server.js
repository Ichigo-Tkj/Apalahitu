const express = require("express");
const { Pool } = require("pg");
const multer = require("multer");
const Minio = require("minio");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

/* ================= DATABASE ================= */

const pool = new Pool({
  user: "appuser",
  host: "postgres",
  database: "appdb",
  password: "apppass",
  port: 5432,
});

/* ================= MINIO ================= */

const minioClient = new Minio.Client({
  endPoint: "minio",
  port: 9000,
  useSSL: false,
  accessKey: "minioadmin",
  secretKey: "minioadmin",
});

const BUCKET = "uploads";

// async function initBucket() {
//   const exists = await minioClient.bucketExists(BUCKET).catch(() => false);
//   if (!exists) await minioClient.makeBucket(BUCKET);
// }
// initBucket();

async function initBucket() {
  let connected = false;

  while (!connected) {
    try {
      const exists = await minioClient.bucketExists(BUCKET).catch(() => false);
      if (!exists) await minioClient.makeBucket(BUCKET);

      connected = true;
      console.log("✅ MinIO connected");
    } catch (err) {
      console.log("⏳ Waiting MinIO...");
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

initBucket();

/* ================= MULTER ================= */

const upload = multer({ storage: multer.memoryStorage() });

/* ================= CRUD ================= */

// CREATE + upload file
app.post("/items", upload.single("file"), async (req, res) => {
  try {
    let filename = null;

    if (req.file) {
      filename = Date.now() + "-" + req.file.originalname;

      await minioClient.putObject(
        BUCKET,
        filename,
        req.file.buffer
      );
    }

    const result = await pool.query(
      "INSERT INTO items(name, email, file) VALUES($1,$2, $3) RETURNING *",
      [req.body.name, req.body.email, filename]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "error create" });
  }
});

// READ
app.get("/items", async (req, res) => {
  const result = await pool.query("SELECT * FROM items ORDER BY id DESC");
  res.json(result.rows);
});

//Read item tertentu
app.get("/items/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM items WHERE id = $1",
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "error get item" });
  }
});

// DELETE
// app.delete("/items/:id", async (req, res) => {
//   await pool.query("DELETE FROM items WHERE id=$1", [req.params.id]);
//   res.json({ message: "deleted" });
// });

app.delete("/items/:id", async (req, res) => {
  try {
    // 🔥 ambil dulu nama file
    const find = await pool.query(
      "SELECT file FROM items WHERE id=$1",
      [req.params.id]
    );

    if (find.rows.length === 0) {
      return res.status(404).json({ error: "not found" });
    }

    const filename = find.rows[0].file;

    // 🔥 hapus dari MinIO jika ada file
    if (filename) {
      await minioClient.removeObject(BUCKET, filename);
    }

    // 🔥 baru hapus dari DB
    await pool.query(
      "DELETE FROM items WHERE id=$1",
      [req.params.id]
    );

    res.json({ message: "deleted + file removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "delete failed" });
  }
});

app.put("/items/:id", upload.single("file"), async (req, res) => {
  try {
    const { name, email } = req.body;
    const file = req.file;
    const id = req.params.id;

    let filename = null;

    // jika upload file baru
    if (file) {
      filename = Date.now() + "-" + file.originalname;

      await minioClient.putObject(
        BUCKET,
        filename,
        file.buffer
      );
    }

    await pool.query(
      `UPDATE items 
       SET name = $1,
           email = $2,
           file = COALESCE($3, file)
       WHERE id = $4`,
      [name, email, filename, id]
    );

    res.json({ message: "Item updated" });
  } catch (err) {
    console.error("UPDATE ERROR:", err);
    res.status(500).json({ error: "Update gagal" });
  }
});

app.listen(3000, () => console.log("Backend running"));