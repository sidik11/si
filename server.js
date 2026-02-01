import express from "express";
import fetch from "node-fetch";
import archiver from "archiver";
import sharp from "sharp";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10mb" }));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

/*
POST /download-zip
{
  "images": ["https://site/img1.png", "https://site/img2.webp"]
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

      const buffer = Buffer.from(await response.arrayBuffer());

      // 🔥 FORCE JPG CONVERSION
      const jpgBuffer = await sharp(buffer)
        .flatten({ background: "#ffffff" }) // remove transparency
        .jpeg({ quality: 90 })
        .toBuffer();

      archive.append(jpgBuffer, {
        name: `image_${index}.jpg`
      });

      index++;
    } catch (err) {
      console.error("Failed to process:", url);
    }
  }

  archive.finalize();
});

app.get("/", (_, res) => {
  res.send("ImageAde ZIP server running (JPG enforced)");
});

app.listen(PORT, () => {
  console.log("ImageAde server running on port", PORT);
});
