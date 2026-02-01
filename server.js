import express from "express";
import fetch from "node-fetch";
import archiver from "archiver";

const app = express();
const PORT = process.env.PORT || 3000;

/* ================= BASIC MIDDLEWARE ================= */
app.use(express.json({ limit: "10mb" }));

// Simple CORS (fine for now; lock later)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

/* ================= ZIP DOWNLOAD ENDPOINT ================= */
/*
POST /download-zip
Body:
{
  "images": ["https://site/img1.jpg", "https://site/img2.png"]
}
*/
app.post("/download-zip", async (req, res) => {
  const { images } = req.body;

  if (!Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ error: "No images provided" });
  }

  res.setHeader("Content-Type", "application/zip");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=saved_images.zip"
  );

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.pipe(res);

  let index = 1;

  for (const url of images) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;

      const contentType = response.headers.get("content-type") || "";
      const ext = contentType.split("/")[1] || "jpg";

      archive.append(response.body, {
        name: `image_${index}.${ext}`
      });

      index++;
    } catch (err) {
      console.error("Failed to fetch:", url);
    }
  }

  archive.finalize();
});

/* ================= HEALTH CHECK ================= */
app.get("/", (req, res) => {
  res.send("ImageAde ZIP server running");
});

/* ================= START SERVER ================= */
app.listen(PORT, () => {
  console.log(`ImageAde server running on port ${PORT}`);
});
