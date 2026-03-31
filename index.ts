import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3000;

// ================= HELPER: SEND RESPONSE =================
// Menangani perbedaan format respons antara iOS dan Android/Windows
function sendResponse(req: Request, res: Response, data: any) {
  const userAgent = req.headers['user-agent'] || '';
  const isIOS = /iphone|ipad|ios/i.test(userAgent);

  if (isIOS) {
    // iOS membutuhkan JSON proper
    res.setHeader('Content-Type', 'application/json');
    return res.json(data);
  } else {
    // Android/Windows (Growtopia SDK) lebih stabil dengan raw string JSON
    res.setHeader('Content-Type', 'application/json');
    return res.send(JSON.stringify(data));
  }
}

// ================= SETTINGS & MIDDLEWARE =================
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// FIXED: Rate Limit ditingkatkan ke 1000 agar tidak menyebabkan Error 403 saat traffic ramai
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 Menit
  max: 1000, 
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many requests, please slow down.' }
});
app.use(limiter);

// ================= LOGGER =================
app.use((req: Request, res: Response, next: NextFunction) => {
  const clientIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown';

  res.on('finish', () => {
    console.log(`[${res.statusCode}] ${req.method} ${req.path} ← ${clientIp}`);
  });
  next();
});

// ================= STATIC ASSETS =================
app.use(express.static(path.join(process.cwd(), 'public')));

// ================= ROUTES =================

app.get('/', (_req: Request, res: Response) => {
  res.send('Login Server for NovaGT is Running');
});

// DASHBOARD (FIXED: Added Try-Catch & File Check)
app.all('/player/login/dashboard', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    let clientData = '';

    if (body && typeof body === 'object' && Object.keys(body).length > 0) {
      clientData = Object.keys(body)[0];
    }

    const encodedClientData = Buffer.from(clientData).toString('base64');
    const templatePath = path.join(process.cwd(), 'template', 'dashboard.html');

    if (!fs.existsSync(templatePath)) {
      return res.status(404).send("Dashboard template not found in server.");
    }

    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    const htmlContent = templateContent.replace('{{ data }}', encodedClientData);

    res.setHeader('Content-Type', 'text/html');
    res.send(htmlContent);
  } catch (error) {
    console.error(`[DASHBOARD ERROR]: ${error}`);
    res.status(500).send("Internal Server Error");
  }
});

// LOGIN VALIDATE (FIXED: Improved Payload Parsing)
app.all('/player/growid/login/validate', async (req: Request, res: Response) => {
  try {
    let _token, growId, password, email;

    // Parsing data dari Android (x-www-form-urlencoded raw)
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length === 1) {
      const raw = Object.keys(req.body)[0];
      if (raw.includes('=')) {
        const params = new URLSearchParams(raw);
        _token = params.get('_token');
        growId = params.get('growId');
        password = params.get('password');
        email = params.get('email');
      }
    } else {
      _token = req.body?._token;
      growId = req.body?.growId;
      password = req.body?.password;
      email = req.body?.email;
    }

    // Handle Register Button (Jika data kosong)
    if (!growId && !password) {
      const rawPayload = `_token=${_token || ''}&growId=&password=`;
      const token = Buffer.from(rawPayload).toString('base64');

      return sendResponse(req, res, {
        status: 'success',
        message: 'Account Validated.',
        token,
        url: '',
        accountType: 'growtopia',
      });
    }

    // Validasi input
    if (!growId || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'GrowID and password are required',
      });
    }

    // Normal Login Token Generation
    let rawStr = `_token=${_token}&growId=${growId}&password=${password}`;
    if (email) rawStr += `&email=${email}`;

    const token = Buffer.from(rawStr).toString('base64');

    sendResponse(req, res, {
      status: 'success',
      message: 'Account Validated.',
      token,
      url: '',
      accountType: 'growtopia',
    });
  } catch (error) {
    console.error(`[VALIDATE ERROR]: ${error}`);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
});

// CHECKTOKEN REDIRECT
app.all('/player/growid/checktoken', async (_req: Request, res: Response) => {
  return res.redirect(307, '/player/growid/validate/checktoken');
});

// CHECKTOKEN VALIDATE (FIXED: Improved Base64 Handling)
app.all('/player/growid/validate/checktoken', async (req: Request, res: Response) => {
  try {
    let refreshToken: string | undefined;

    if (req.body && typeof req.body === 'object') {
      const formData = req.body as Record<string, string>;
      if ('refreshToken' in formData) {
        refreshToken = formData.refreshToken;
      } else if (Object.keys(formData).length === 1) {
        const rawPayload = Object.keys(formData)[0];
        const params = new URLSearchParams(rawPayload);
        refreshToken = params.get('refreshToken') || undefined;
      }
    }

    if (!refreshToken) {
      return res.status(400).json({ status: 'error', message: 'Missing refreshToken' });
    }

    // Decode & Re-encode untuk memastikan token valid
    const decoded = Buffer.from(refreshToken, 'base64').toString('utf-8');
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
    console.error(`[CHECKTOKEN ERROR]: ${error}`);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
});

// ================= SERVER START =================
app.listen(PORT, () => {
  console.log(`[SERVER] NovaGT Login System running on port ${PORT}`);
});

export default app;
