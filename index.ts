import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = 3000;

// ================= HELPER: Response Handler =================
/**
 * Menggabungkan logika deteksi OS kamu agar iOS tetap mendapatkan JSON proper,
 * sementara platform lain mendapatkan stringified JSON (raw).
 */
function sendResponse(req: Request, res: Response, data: any) {
  const userAgent = req.headers['user-agent'] || '';
  const isIOS = /iphone|ipad|ios/i.test(userAgent);

  if (isIOS) {
    res.setHeader('Content-Type', 'application/json');
    return res.json(data);
  } else {
    // Platform lain (Windows/Android) terkadang butuh raw string tanpa karakter tambahan
    return res.send(JSON.stringify(data));
  }
}

// ================= CONFIG & MIDDLEWARE =================
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const limiter = rateLimit({
  windowMs: 60_000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use(express.static(path.join(process.cwd(), 'public')));

// Logger dengan IP detection yang lebih akurat (mengambil log temanmu)
app.use((req: Request, res: Response, next: NextFunction) => {
  const clientIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket.remoteAddress ||
    'unknown';

  console.log(`[REQ] ${req.method} ${req.path} → ${clientIp}`);
  next();
});

// ================= ROUTES =================

app.get('/', (_req: Request, res: Response) => {
  res.send('Login Server Running');
});

// DASHBOARD: Menggunakan logika parsing "Single Key" dari temanmu
app.all('/player/login/dashboard', async (req: Request, res: Response) => {
  let clientData = '';
  const body = req.body;

  if (body && typeof body === 'object' && Object.keys(body).length > 0) {
    // Client game sering mengirim data dalam bentuk key pertama di object body
    clientData = Object.keys(body)[0];
  }

  const encodedClientData = Buffer.from(clientData).toString('base64');
  const templatePath = path.join(process.cwd(), 'template', 'dashboard.html');

  if (fs.existsSync(templatePath)) {
    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    const htmlContent = templateContent.replace('{{ data }}', encodedClientData);
    res.setHeader('Content-Type', 'text/html');
    res.send(htmlContent);
  } else {
    res.status(404).send('Dashboard template not found');
  }
});

// LOGIN VALIDATE: Penanganan login dan registrasi
app.all('/player/growid/login/validate', async (req: Request, res: Response) => {
  try {
    let _token, growId, password, email;

    // Parsing fleksibel (mendukung JSON object maupun URLSearchParams di dalam body)
    if (typeof req.body === 'object' && Object.keys(req.body).length === 1) {
      const raw = Object.keys(req.body)[0];
      const params = new URLSearchParams(raw);
      _token = params.get('_token');
      growId = params.get('growId');
      password = params.get('password');
      email = params.get('email');
    } else {
      ({ _token, growId, password, email } = req.body);
    }

    // Jika growId kosong, anggap sebagai proses registrasi awal (Handle C++)
    if (!growId && !password) {
      const raw = `_token=${_token || ''}&growId=&password=`;
      const token = Buffer.from(raw).toString('base64');
      return sendResponse(req, res, {
        status: 'success',
        message: 'Account Validated.',
        token,
        url: '',
        accountType: 'growtopia',
      });
    }

    // Normal Login
    let raw = `_token=${_token}&growId=${growId}&password=${password}`;
    if (email) raw += `&email=${email}&reg=1`; // Tambahkan flag reg dari temanmu
    else raw += `&reg=0`;

    const token = Buffer.from(raw).toString('base64');

    sendResponse(req, res, {
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

app.all('/player/growid/checktoken', async (_req: Request, res: Response) => {
  return res.redirect(307, '/player/growid/validate/checktoken');
});

// CHECKTOKEN: Mengambil logika parsing "Raw Stream" temanmu untuk keamanan data
app.all('/player/growid/validate/checktoken', async (req: Request, res: Response) => {
  try {
    let refreshToken: string | undefined;
    let clientData: string | undefined;

    // 1. Coba ambil dari body parser biasa
    if (typeof req.body === 'object' && req.body !== null) {
      const formData = req.body as Record<string, string>;
      if ('refreshToken' in formData) {
        refreshToken = formData.refreshToken;
        clientData = formData.clientData;
      } else if (Object.keys(formData).length === 1) {
        const params = new URLSearchParams(Object.keys(formData)[0]);
        refreshToken = params.get('refreshToken') || undefined;
        clientData = params.get('clientData') || undefined;
      }
    }

    // 2. Jika gagal, baca langsung dari stream (Logika temanmu)
    if (!refreshToken && req.readable) {
      const rawBody = await new Promise<string>((resolve) => {
        let payload = '';
        req.on('data', (chunk) => { payload += chunk.toString(); });
        req.on('end', () => resolve(payload));
      });
      const params = new URLSearchParams(rawBody);
      refreshToken = params.get('refreshToken') || undefined;
      clientData = params.get('clientData') || undefined;
    }

    if (!refreshToken) {
      return res.json({ status: 'error', message: 'Missing refreshToken' });
    }

    // Decode dan bersihkan token (Logika filter &reg=0/1 temanmu)
    let decoded = Buffer.from(refreshToken, 'base64').toString('utf-8');
    decoded = decoded.replace(/&reg=[01]/g, '');

    // Jika ada clientData, update _token di dalam payload (Logika pembaruan token temanmu)
    if (clientData) {
      const b64ClientData = Buffer.from(clientData).toString('base64');
      decoded = decoded.replace(/(_token=)[^&]*/, `$1${b64ClientData}`);
    }

    const token = Buffer.from(decoded).toString('base64');

    sendResponse(req, res, {
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

app.listen(PORT, () => {
  console.log(`[SERVER] Running on http://localhost:${PORT}`);
});

export default app;
