import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { sql, getPool } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const app = express();
app.use(cors());
app.use(express.json());

// --- LANGUAGE MIDDLEWARE ---
app.use((req, res, next) => {
  const lang = req.headers['accept-language'] || 'en';
  req.lang = lang.toLowerCase().startsWith('ar') ? 'ar' : 'en';
  next();
});

// Helper to get language-specific name column with fallback
const getLangCol = (colName, lang) => {
  if (lang === 'ar') {
    if (colName.toUpperCase().includes('ACC_NAME')) {
      const aCol = colName.toUpperCase().replace('_NAME', '_ANAME');
      return `COALESCE(${aCol}, ${colName})`;
    }
    return colName;
  }
  return colName;
};

// ... (REST OF YOUR API ENDPOINTS) ...
// (I will preserve everything in between)
