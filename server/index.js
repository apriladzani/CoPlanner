import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import authRoutes from './routes/auth.js';
import workspaceRoutes from './routes/workspaces.js';
import adminRoutes from './routes/admin.js';
import plannerRoutes from './routes/planner.js';
import repositoryRoutes from './routes/repository.js';
import debtRoutes from './routes/debt.js';
import { initDb } from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api/uploads', express.static(uploadsDir));

// CDN Proxy and URL Rewriter Middleware
const rewriteUrls = (obj) => {
  if (typeof obj === 'string') {
    if (obj.startsWith('https://api-cdn.kroombox.com/api/bridge/view/')) {
      return obj.replace('https://api-cdn.kroombox.com/api/bridge/view/', '/api/cdn/view/');
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(rewriteUrls);
  }
  if (obj !== null && typeof obj === 'object') {
    const newObj = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[key] = rewriteUrls(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
};

app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function (obj) {
    return originalJson.call(this, rewriteUrls(obj));
  };
  next();
});

// CDN View Proxy Route
app.get('/api/cdn/view/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const baseUrl = (process.env.CDN_BASE_URL || 'https://api-cdn.kroombox.com').replace(/\/$/, '');
    const cdnUrl = `${baseUrl}/api/bridge/view/${fileId}`;
    
    const response = await fetch(cdnUrl, {
      headers: {
        'x-api-key': process.env.CDN_API_KEY
      }
    });

    if (!response.ok) {
      return res.status(response.status).send('Failed to fetch from CDN');
    }

    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('content-type', contentType);
    }
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      res.setHeader('content-length', contentLength);
    }

    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error('Error proxying CDN view:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Initialize MySQL DB
initDb();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/planner', plannerRoutes);
app.use('/api/repository', repositoryRoutes);
app.use('/api/debt', debtRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
