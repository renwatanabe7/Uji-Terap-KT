import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // EPPO API Proxy
  app.get("/api/eppo/search", async (req, res) => {
    const { q } = req.query;
    const token = process.env.EPPO_API_TOKEN;

    if (!token) {
      return res.status(401).json({ error: "EPPO_API_TOKEN not configured" });
    }

    try {
      const response = await axios.get(`https://api.eppo.int/rest/1.0/taxons/search?autocompletion=${q}&token=${token}`);
      res.json(response.data);
    } catch (error: any) {
      res.status(error.response?.status || 500).json({ error: error.message });
    }
  });

  app.get("/api/eppo/taxon/:code", async (req, res) => {
    const { code } = req.params;
    const token = process.env.EPPO_API_TOKEN;

    if (!token) {
      return res.status(401).json({ error: "EPPO_API_TOKEN not configured" });
    }

    try {
      const response = await axios.get(`https://api.eppo.int/rest/1.0/taxon/${code}?token=${token}`);
      res.json(response.data);
    } catch (error: any) {
      res.status(error.response?.status || 500).json({ error: error.message });
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
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
