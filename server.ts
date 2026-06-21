import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import ytdl from "ytdl-core";
import { Server } from "socket.io";
import { createServer } from "http";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Exponential Backoff Retry Utility for Gemini API calls to ensure extreme stability
async function callGeminiWithRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1500
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimit = error?.message?.includes('429') || error?.status === 429 || error?.statusCode === 429;
    const isServerErr = error?.status >= 500 || error?.message?.includes('500') || error?.message?.includes('503');
    
    if ((isRateLimit || isServerErr) && retries > 0) {
      console.warn(`[GEMINI API SERVER] Lỗi tạm thời: ${error?.message || error}. Đang thử lại sau ${delay}ms... (Còn lại ${retries} lần thử)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callGeminiWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}



async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  app.use(cors());
  app.use((req, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    next();
  });
  app.use(express.json({ limit: '500mb' }));
  app.use(express.urlencoded({ limit: '500mb', extended: true }));

  // Socket.io logic
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-room", (room) => {
      socket.join(room);
    });

    socket.on("send-message", (data) => {
      // data: { room, msg, sender, timestamp }
      io.to(data.room).emit("receive-message", data);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });

  // API route for YouTube download
  app.get("/api/download", async (req, res) => {
    const videoUrl = req.query.url as string;
    if (!videoUrl) {
      return res.status(400).send("Missing URL");
    }

    try {
      const info = await ytdl.getInfo(videoUrl);
      const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');
      
      res.header('Content-Disposition', `attachment; filename="${title}.mp4"`);
      ytdl(videoUrl, {
        quality: 'highest',
        filter: 'audioandvideo'
      }).pipe(res);
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).send("Failed to download video.");
    }
  });

  // API route for Gemini video analysis
  app.post("/api/gemini/video-analysis", async (req, res) => {
    try {
      const { prompt, fileData, mimeType, frames, config } = req.body;

      let contentsParts: any[] = [];

      if (frames && Array.isArray(frames)) {
        frames.forEach((f: any) => {
          contentsParts.push({ text: `[Khung hình gốc tại mốc thời gian: ${f.timestamp}]` });
          contentsParts.push({
            inlineData: {
              data: f.base64,
              mimeType: f.mimeType || "image/jpeg"
            }
          });
        });
        contentsParts.push({ text: prompt });
      } else {
        if (!prompt || !fileData || !mimeType) {
          return res.status(400).json({ error: "Missing prompt, fileData, or mimeType" });
        }
        contentsParts = [
          {
            inlineData: {
              data: fileData,
              mimeType: mimeType
            }
          },
          { text: prompt }
        ];
      }

      const headerApiKey = req.headers['x-user-api-key'];
      const apiKey = (headerApiKey && typeof headerApiKey === 'string' && headerApiKey.trim() !== '') ? headerApiKey.trim() : process.env.GEMINI_API_KEY;
      if (!apiKey) {
         return res.status(500).json({ error: "Missing API Key" });
      }
      const ai = new GoogleGenAI({ apiKey });

      console.log("Analyzing file using Gemini API...");
      const response = await callGeminiWithRetry(() => ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: [
          {
            role: 'user',
            parts: contentsParts
          }
        ],
        config: config ? {
           ...config,
           responseMimeType: config.responseMimeType || "application/json"
        } : {
           responseMimeType: "application/json"
        }
      }));
      
      res.json({ text: response.text });
      } catch (error: any) {
        console.error("Gemini analysis error:", error);
        const errorMessage = error?.status === 400 || error?.message?.includes('API key not valid') 
          ? "API Key không hợp lệ hoặc chưa được thiết lập. Vui lòng kiểm tra lại cấu hình." 
          : "Failed to analyze video. " + (error?.message || "");
        res.status(500).json({ error: errorMessage });
      }
  });

  // General secure proxy for GoogleGenAI to ensure server-side API execution
  app.post("/api/gemini/generate", async (req, res) => {
    try {
      const { model, contents, config } = req.body;
      const headerApiKey = req.headers['x-user-api-key'];
      const apiKey = (headerApiKey && typeof headerApiKey === 'string' && headerApiKey.trim() !== '') ? headerApiKey.trim() : process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Missing API Key" });
      }
      const ai = new GoogleGenAI({ apiKey });
      const response = await callGeminiWithRetry(() => ai.models.generateContent({
        model: model || "gemini-flash-latest",
        contents,
        config
      }));
      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini general proxy error:", error);
      res.status(500).json({ error: error?.message || "Failed to generate content via server-side proxy." });
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

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
