import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = 3000;

/**
 * HELPER: sendResponse
 * SANGAT PENTING: Menghindari Ercon di iOS vs Windows.
 * Client Windows/Android butuh raw string, iOS butuh Application/Json.
 */
function sendResponse(req: Request, res: Response, data: any) {
  const userAgent = req.headers['user-agent'] || '';
  const isIOS = /iphone|ipad|ios/i.test(userAgent);

  if (isIOS) {
    res.setHeader('Content-Type', 'application/json');
    return res.json(data);
  } else {
    // Windows/Android: Jangan kirim header application/json jika masih ercon
    // Gunakan text/html atau raw stringified
    res.setHeader('Content-Type', 'text/html'); 
    return res.send(JSON.stringify(data));
  }
}

// ================= CONFIG & MIDDLEWARE =================
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Gunakan limit yang lebih tinggi untuk debugging agar tidak terkena Rate Limit sendiri
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const limiter = rateLimit({
  windowMs: 60_000,
  max: 100, 
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use(express.static(path.join(process.cwd(), 'public')));

// Logger
app.use((req: Request, res: Response, next: NextFunction) => {
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path} ← ${clientIp}`);
  next();
});

// ================= ROUTES =================

app.get('/', (_req: Request, res: Response) => {
  res.send('Login Server Active');
});

/**
 * DASHBOARD SINKRONISASI
 * Memastikan data loginurl dari C++ ter-parse dengan benar
 */
app.all('/player/login/dashboard', async (req: Request, res: Response) => {
  let clientData = '';
  // Di GTPS, data sering dikirim sebagai key pertama dalam x-www-form-urlencoded
  if (req.body && typeof req.body === 'object') {
    clientData = Object.keys(req.body)[0] || '';
  }

  const encodedClientData = Buffer.from(clientData).toString('base64');
  const templatePath = path.join(process.cwd(), 'template', 'dashboard.html');

  if (fs.existsSync(templatePath)) {
    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    const htmlContent = templateContent.replace('{{ data }}', encodedClientData);
    res.send(htmlContent);
  } else {
    res.status(404).send('Dashboard Missing');
  }
});

/**
 * LOGIN VALIDATE SINKRONISASI
 * Menangani login dari dashboard ke Backend C++
 */
app.all('/player/growid/login/validate', async (req: Request, res: Response) => {
  try {
    let _token = '', growId = '', password = '', email = '';

    // Handling data mentah dari game client (Raw string parsing)
    if (typeof req.body === 'object' && Object.keys(req.body).length === 1) {
      const params = new URLSearchParams(Object.keys(req.body)[0]);
      _token = params.get('_token') || '';
      growId = params.get('growId') || '';
      password = params.get('password') || '';
      email = params.get('email') || '';
    } else {
      _token = req.body._token || '';
      growId = req.body.growId || '';
      password = req.body.password || '';
      email = req.body.email || '';
    }

    // Flag reg: 1 untuk register (ada email), 0 untuk login biasa
    const regFlag = email ? '1' : '0';
    let rawPayload = `_token=${_token}&growId=${growId}&password=${password}`;
    if (email) rawPayload += `&email=${email}`;
    rawPayload += `&reg=${regFlag}`;

    const token = Buffer.from(rawPayload).toString('base64');

    return sendResponse(req, res, {
      status: 'success',
      message: 'Account Validated.',
      token: token,
      url: '',
      accountType: 'growtopia',
    });
  } catch (error) {
    console.error(`[LOGIN ERROR]: ${error}`);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
});

app.all('/player/growid/checktoken', async (_req: Request, res: Response) => {
  return res.redirect(307, '/player/growid/validate/checktoken');
});

/**
 * CHECKTOKEN SINKRONISASI
 * Sering menjadi penyebab Ercon jika payload refreshToken tidak bersih
 */
app.all('/player/growid/validate/checktoken', async (req: Request, res: Response) => {
  try {
    let refreshToken = '';
    let clientData = '';

    // 1. Ambil dari body (standard)
    if (req.body && typeof req.body === 'object') {
      const bodyKeys = Object.keys(req.body);
      if (bodyKeys.length === 1) {
        const params = new URLSearchParams(bodyKeys[0]);
        refreshToken = params.get('refreshToken') || '';
        clientData = params.get('clientData') || '';
      } else {
        refreshToken = req.body.refreshToken || '';
        clientData = req.body.clientData || '';
      }
    }

    // 2. Fallback ke Raw Stream (Sangat penting jika middleware gagal baca body)
    if (!refreshToken && req.readable) {
      const rawBody = await new Promise<string>((resolve) => {
        let p = '';
        req.on('data', (c) => p += c.toString());
        req.on('end', () => resolve(p));
      });
      const params = new URLSearchParams(rawBody);
      refreshToken = params.get('refreshToken') || '';
      clientData = params.get('clientData') || '';
    }

    if (!refreshToken) {
      return res.json({ status: 'error', message: 'Missing Token' });
    }

    // SINKRONISASI PAYLOAD:
    // Hapus flag reg lama dan bersihkan spasi agar tidak korup di C++
    let decoded = Buffer.from(refreshToken, 'base64').toString('utf-8').trim();
    decoded = decoded.replace(/&reg=[01]/g, '');

    // Inject clientData baru ke _token (Standard GTPS security)
    if (clientData) {
      const b64Client = Buffer.from(clientData).toString('base64');
      // Ganti _token lama dengan clientData baru hasil handshake
      decoded = decoded.replace(/(_token=)[^&]*/, `$1${b64Client}`);
    }

    // Pastikan reg flag tetap konsisten di akhir (default login 0)
    if (!decoded.includes('&reg=')) {
      decoded += `&reg=0`;
    }

    const finalToken = Buffer.from(decoded).toString('base64');

    return sendResponse(req, res, {
      status: 'success',
      message: 'Account Validated.',
      token: finalToken,
      url: '',
      accountType: 'growtopia',
      accountAge: 2,
    });
  } catch (error) {
    console.error(`[CHECKTOKEN ERROR]: ${error}`);
    res.json({ status: 'error', message: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`[SERVER] NovaGT Login Server running on port ${PORT}`);
});

export default app;
