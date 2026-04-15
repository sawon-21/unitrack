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
  app.post("/api/upload", (req, res, next) => {
    console.log("Received POST request to /api/upload");
    upload.single("file")(req, res, (err) => {
      if (err) {
        console.error("Multer error:", err);
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  }, async (req: any, res: any) => {
    console.log("Processing upload request, file present:", !!req.file);
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const b64 = Buffer.from(req.file.buffer).toString("base64");
      let dataURI = "data:" + req.file.mimetype + ";base64," + b64;

      // If Cloudinary is not configured, just return the base64 data URI
      if (!apiKey || !apiSecret) {
        console.warn("Cloudinary not configured. Returning base64 data URI.");
        return res.json({ secure_url: dataURI });
      }

      // Upload to Cloudinary
      try {
        const result = await cloudinary.uploader.upload(dataURI, {
          folder: "unitrack/posts",
          resource_type: "auto",
        });
        res.json({ secure_url: result.secure_url });
      } catch (cloudinaryError: any) {
        console.error("Cloudinary upload failed, falling back to base64. Error:", cloudinaryError);
        // Fallback to base64 if Cloudinary fails
        res.json({ secure_url: dataURI });
      }
    } catch (error: any) {
      console.error("Upload error details:", error);
      res.status(500).json({ 
        error: "Failed to process image upload",
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

  // Global error handler to ensure JSON responses for API errors
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Express error:", err);
    if (req.path.startsWith('/api/')) {
      res.status(500).json({ error: err.message || "Internal Server Error" });
    } else {
      next(err);
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
