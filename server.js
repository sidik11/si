import express from "express";
import fetch from "node-fetch";
import archiver from "archiver";
import sharp from "sharp";

const app = express();
const PORT = process.env.PORT || 3000;

/* ================= MIDDLEWARE ================= */
app.use(express.json({ limit: "10mb" }));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
});

/* ================= ZIP DOWNLOAD ================= */
/*
POST /download-zip
{
  "images": ["https://example.com/a.png", "https://example.com/b.webp"]
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
  archive.on("error", err => {
    console.error("ZIP error:", err);
    res.end();
  });

  archive.pipe(res);

  let index = 1;

  for (const url of images) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;

      const inputBuffer = Buffer.from(await response.arrayBuffer());

      // 🔥 FORCE JPG CONVERSION (no transparency, no metadata)
      const jpgBuffer = await sharp(inputBuffer, { failOnError: false })
        .flatten({ background: "#ffffff" })
        .jpeg({
          quality: 90,
          mozjpeg: true
        })
        .toBuffer();

      // 🔒 ALWAYS end with .jpg
      archive.append(jpgBuffer, {
        name: `image_${index}.jpg`
      });

      index++;
    } catch (err) {
      console.error("Image failed:", url);
    }
  }

  await archive.finalize();
});

/* ================= HEALTH CHECK ================= */
app.get("/", (_req, res) => {
  res.send("ImageAde ZIP server running (JPG enforced)");
});

/* ================= START ================= */
app.listen(PORT, () => {
  console.log(`ImageAde server running on port ${PORT}`);
});
