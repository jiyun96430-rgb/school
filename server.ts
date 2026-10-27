import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchAllSeoulHighSchools, fetchSchoolDetail } from './server/schoolinfo';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// API: Get all high schools in Seoul across 25 districts
app.get('/api/schools', async (req, res) => {
  const apiKey = process.env.SCHOOLINFO_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    // 6절 ③: Return HTTP 503 with error when key is missing
    return res.status(503).json({
      error: 'SCHOOLINFO_API_KEY_MISSING',
      message: '학교알리미 인증키(SCHOOLINFO_API_KEY)가 설정되지 않았습니다.'
    });
  }

  try {
    const result = await fetchAllSeoulHighSchools(apiKey.trim());
    return res.json(result);
  } catch (error: any) {
    console.error('[Server] /api/schools error:', error?.message);
    return res.status(500).json({
      error: 'API_FETCH_FAILED',
      message: '학교알리미 API 호출 중 오류가 발생했습니다.'
    });
  }
});

// API: Get school disclosure detail
app.get('/api/schools/:schoolCode', async (req, res) => {
  const apiKey = process.env.SCHOOLINFO_API_KEY;
  const { schoolCode } = req.params;

  if (!apiKey || apiKey.trim() === '') {
    return res.status(503).json({
      error: 'SCHOOLINFO_API_KEY_MISSING',
      message: '학교알리미 인증키(SCHOOLINFO_API_KEY)가 설정되지 않았습니다.'
    });
  }

  try {
    const detail = await fetchSchoolDetail(schoolCode, apiKey.trim());
    return res.json(detail);
  } catch (error: any) {
    console.error(`[Server] /api/schools/${schoolCode} detail error:`, error?.message);
    return res.status(500).json({
      error: 'DETAIL_FETCH_FAILED',
      message: '학교 상세정보를 불러오지 못했습니다.'
    });
  }
});

// API: Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.SCHOOLINFO_API_KEY && process.env.SCHOOLINFO_API_KEY.trim() !== '')
  });
});

async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Failed to start server:', err);
  process.exit(1);
});
