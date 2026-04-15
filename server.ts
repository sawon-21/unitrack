import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

// Cloudinary config
const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'dvhsit2uy';
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!apiKey || !apiSecret) {
  console.warn("WARNING: Cloudinary API Key or Secret is missing from environment variables.");
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for secure image upload
  app.post("/api/upload", upload.single("file"), async (req: any, res: any) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Upload to Cloudinary using the secure server-side preset or direct upload
      // Since we are server-side, we can use the API key/secret directly
      const b64 = Buffer.from(req.file.buffer).toString("base64");
      let dataURI = "data:" + req.file.mimetype + ";base64," + b64;
      
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: "unitrack/posts",
        resource_type: "auto",
      });

      res.json({ secure_url: result.secure_url });
    } catch (error: any) {
      console.error("Upload error details:", error);
      res.status(500).json({ 
        error: "Failed to upload image to Cloudinary",
        details: error.message || String(error)
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
