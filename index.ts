import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = 3000;

app.set('trust proxy', 1);
app.disable('x-powered-by');

// ================= MIDDLEWARE =================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text({ type: '*/*' })); // Penting untuk menangkap raw data dari iOS
app.use(cors());

const limiter = rateLimit({
  windowMs: 60_000,
  max: 100, // Dinaikkan sedikit agar tidak kena limit saat spam login
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Helper untuk parsing body yang berantakan dari client iOS/Android
const parseBody = (body: any) => {
  if (typeof body === 'object' && Object.keys(body).length > 0) {
    const firstKey = Object.keys(body)[0];
    if (firstKey.includes('growId=') || firstKey.includes('refreshToken=')) {
      return Object.fromEntries(new URLSearchParams(firstKey));
    }
    return body;
  }
  if (typeof body === 'string') {
    return Object.fromEntries(new URLSearchParams(body));
  }
  return {};
};

// ================= LOGGER =================
app.use((req: Request, res: Response, next: NextFunction) => {
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  console.log(`[REQ] ${req.method} ${req.path} → ${clientIp}`);
  next();
});

// ================= ROOT =================
app.get('/', (_req: Request, res: Response) => {
  res.send('Login Server Running');
});

// ================= DASHBOARD =================
app.all('/player/login/dashboard', async (req: Request, res: Response) => {
  const data = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body;
  const encodedClientData = Buffer.from(data || '').toString('base64');

  try {
    const templatePath = path.join(process.cwd(), 'template', 'dashboard.html');
    let htmlContent = fs.readFileSync(templatePath, 'utf-8');
    htmlContent = htmlContent.replace('{{ data }}', encodedClientData);
    res.setHeader('Content-Type', 'text/html');
    res.send(htmlContent);
  } catch (err) {
    res.status(500).send("Dashboard template missing.");
  }
});

// ================= LOGIN VALIDATE =================
app.all('/player/growid/login/validate', async (req: Request, res: Response) => {
  try {
    const data = parseBody(req.body);
    const { _token, growId, password, email } = data;

    // Mode Register (Jika growId/password kosong)
    if (!growId && !password) {
      const raw = `_token=${_token || ''}&growId=&password=`;
      const token = Buffer.from(raw).toString('base64');

      return res.json({
        status: 'success',
        message: 'Register Mode',
        token,
        url: '',
        accountType: 'growtopia',
      });
    }

    // Validasi Login normal
    if (!growId || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'GrowID and password required',
      });
    }

    let raw = `_token=${_token || ''}&growId=${growId}&password=${password}`;
    if (email) raw += `&email=${email}`;

    const token = Buffer.from(raw).toString('base64');

    // MENGGUNAKAN res.json() agar iOS tidak bingung dengan tipe data
    return res.json({
      status: 'success',
      message: 'Account Validated.',
      token,
      url: '',
      accountType: 'growtopia',
    });

  } catch (error) {
    console.error(`[ERROR]: ${error}`);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
});

// ================= CHECKTOKEN REDIRECT =================
app.all('/player/growid/checktoken', async (_req: Request, res: Response) => {
  return res.redirect(307, '/player/growid/validate/checktoken');
});

// ================= CHECKTOKEN VALIDATE =================
app.all('/player/growid/validate/checktoken', async (req: Request, res: Response) => {
  try {
    const data = parseBody(req.body);
    const refreshToken = data.refreshToken;

    if (!refreshToken) {
      return res.json({
        status: 'error',
        message: 'Missing refreshToken',
      });
    }

    // Decode & Encode ulang untuk memastikan validitas
    const decoded = Buffer.from(refreshToken, 'base64').toString('utf-8');
    const token = Buffer.from(decoded).toString('base64');

    return res.json({
      status: 'success',
      message: 'Account Validated.',
      token,
      url: '',
      accountType: 'growtopia',
      accountAge: 2,
    });
  } catch (error) {
    console.error(`[ERROR]: ${error}`);
    res.json({ status: 'error', message: 'Internal Server Error' });
  }
});

// ================= START =================
app.listen(PORT, () => {
  console.log(`[SERVER] Running on http://localhost:${PORT}`);
});

export default app;
