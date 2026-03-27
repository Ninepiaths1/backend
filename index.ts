import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import bodyParser from 'body-parser';

const app = express();
const PORT = 3000;

// ================= HELPER: SEND RESPONSE =================
// Menangani perbedaan format JSON antara iOS (Proper JSON) 
// dan Android/Windows (Raw String)
function sendResponse(req: Request, res: Response, data: any) {
  const userAgent = req.headers['user-agent'] || '';
  const isIOS = /iphone|ipad|ios/i.test(userAgent);

  if (isIOS) {
    // iOS tetap pakai JSON
    res.setHeader('Content-Type', 'application/json');
    return res.json(data);
  } else {
    // Windows & Android HARUS pakai format string baris per baris
    // agar dibaca sebagai instruksi login, bukan teks mentah.
    res.setHeader('Content-Type', 'text/html');
    
    let responseString = "";
    responseString += `status|${data.status}\n`;
    responseString += `message|${data.message}\n`;
    responseString += `token|${data.token}\n`;
    responseString += `url|${data.url || ''}\n`;
    responseString += `accountType|${data.accountType}\n`;
    
    if (data.accountAge) {
      responseString += `accountAge|${data.accountAge}\n`;
    }

    return res.send(responseString);
  }
}

// ================= MIDDLEWARE =================
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(cors());

// Menggunakan limit yang lebih longgar untuk development agar tidak terkena blokir sendiri
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100, 
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Menggunakan bodyParser raw untuk menangani format aneh dari client GT
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Logger sederhana
app.use((req: Request, res: Response, next: NextFunction) => {
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress;
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} from ${clientIp}`);
  next();
});

// ================= STATIC =================
app.use(express.static(path.join(process.cwd(), 'public')));

// ================= ROUTES =================

app.get('/', (_req, res) => {
  res.send('GTPS Login Server is Online');
});

// DASHBOARD
app.all('/player/login/dashboard', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    let clientData = '';

    if (body && typeof body === 'object' && Object.keys(body).length > 0) {
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
  } catch (err) {
    res.status(500).send('Error loading dashboard');
  }
});

// LOGIN VALIDATE
app.post('/player/growid/login/validate', async (req: Request, res: Response) => {
  try {
    let _token, growId, password, email;

    // Menangani format x-www-form-urlencoded yang sering "berantakan" dari client GT
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

    // Jika user klik register (biasanya growId & password kosong)
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

    // Validasi input
    if (!growId || !password) {
      return res.status(400).json({ status: 'error', message: 'GrowID and password are required' });
    }

    // Normal Login Token Construction
    let raw = `_token=${_token || ''}&growId=${growId}&password=${password}`;
    if (email) raw += `&email=${email}`;

    const token = Buffer.from(raw).toString('base64');

    return sendResponse(req, res, {
      status: 'success',
      message: 'Account Validated.',
      token,
      url: '',
      accountType: 'growtopia',
    });

  } catch (error) {
    console.error(`[LOGIN ERROR]:`, error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
});

// CHECKTOKEN REDIRECT & VALIDATE
app.all('/player/growid/checktoken', (_req, res) => {
  return res.redirect(307, '/player/growid/validate/checktoken');
});

app.post('/player/growid/validate/checktoken', async (req: Request, res: Response) => {
  try {
    let refreshToken: string | undefined;

    if (typeof req.body === 'object' && req.body !== null) {
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

    // Decode & Re-encode (Validation logic can be added here)
    const decoded = Buffer.from(refreshToken, 'base64').toString('utf-8');
    const token = Buffer.from(decoded).toString('base64');

    return sendResponse(req, res, {
      status: 'success',
      message: 'Account Validated.',
      token,
      url: '',
      accountType: 'growtopia',
      accountAge: 2,
    });
  } catch (error) {
    console.error(`[CHECKTOKEN ERROR]:`, error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
});

// ================= START SERVER =================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  =======================================
  GTPS LOGIN SERVER RUNNING
  Port: ${PORT}
  URL: http://localhost:${PORT}
  =======================================
  `);
});

export default app;
