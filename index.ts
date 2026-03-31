import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = 3000;

/**
 * FIX: RGT & Proxy seringkali gagal baca JSON jika ada header charset 
 * atau format yang tidak sesuai ekspektasi client C++.
 */
function sendResponse(req: Request, res: Response, data: any) {
  const userAgent = req.headers['user-agent'] || '';
  const isIOS = /iphone|ipad|ios/i.test(userAgent);

  // Set header dasar agar tidak diblokir proxy/vhost
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (isIOS) {
    res.setHeader('Content-Type', 'application/json');
    return res.json(data);
  } else {
    // FIX: RGT & Windows Client lebih stabil dengan text/html atau application/json tanpa charset
    res.setHeader('Content-Type', 'application/json'); 
    return res.send(JSON.stringify(data));
  }
}

app.set('trust proxy', 1);
app.disable('x-powered-by');

// ================= MIDDLEWARE =================
// FIX: Menambahkan limit body lebih besar jika rgt mengirim payload panjang
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cors());

// Handle payload dari RGT yang terkadang dikirim sebagai 'text/plain' tapi isinya JSON/Query
app.use((req, res, next) => {
  if (req.headers['content-type'] === 'text/plain') {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      req.body = data;
      next();
    });
  } else {
    next();
  }
});

const limiter = rateLimit({
  windowMs: 60_000,
  max: 100, // Dinaikkan agar user tidak gampang terkena rate limit saat login-logout
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// ================= STATIC =================
app.use(express.static(path.join(process.cwd(), 'public')));

// ================= LOGGER =================
app.use((req: Request, res: Response, next: NextFunction) => {
  const clientIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown';

  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path} ← ${clientIp}`);
  next();
});

// ================= ROOT =================
app.get('/', (_req: Request, res: Response) => {
  res.status(200).send('Login Server Online');
});

// ================= DASHBOARD =================
app.all('/player/login/dashboard', async (req: Request, res: Response) => {
  try {
    let clientData = '';
    // Handle berbagai jenis body input
    if (typeof req.body === 'object') {
      clientData = Object.keys(req.body)[0] || '';
    } else if (typeof req.body === 'string') {
      clientData = req.body;
    }

    const encodedClientData = Buffer.from(clientData).toString('base64');
    const templatePath = path.join(process.cwd(), 'template', 'dashboard.html');
    
    if (!fs.existsSync(templatePath)) return res.status(404).send('Template not found');
    
    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    const htmlContent = templateContent.replace('{{ data }}', encodedClientData);

    res.setHeader('Content-Type', 'text/html');
    res.send(htmlContent);
  } catch (e) {
    res.status(500).send('Dashboard Error');
  }
});

// ================= LOGIN VALIDATE =================
app.all('/player/growid/login/validate', async (req: Request, res: Response) => {
  try {
    let _token = '', growId = '', password = '';

    // Deteksi body dari berbagai tipe input (RGT sering kirim raw string)
    const body = req.body;
    if (typeof body === 'object' && Object.keys(body).length > 0) {
      // Jika body berupa objek JSON atau URL Encoded standar
      const firstKey = Object.keys(body)[0];
      if (firstKey.includes('growId=')) {
        const params = new URLSearchParams(firstKey);
        _token = params.get('_token') || '';
        growId = params.get('growId') || '';
        password = params.get('password') || '';
      } else {
        _token = body._token || '';
        growId = body.growId || '';
        password = body.password || '';
      }
    }

    // Jika benar-benar kosong (biasanya klik Create Account tanpa isi apapun)
    if (!growId || growId.trim() === "") {
       const token = Buffer.from(`_token=${_token}&growId=&password=`).toString('base64');
       return sendResponse(req, res, {
         status: "success",
         message: "Account Validated.",
         token,
         url: "",
         accountType: "growtopia"
       });
    }

    // Login Normal
    const raw = `_token=${_token}&growId=${growId}&password=${password}`;
    const token = Buffer.from(raw).toString('base64');

    sendResponse(req, res, {
      status: 'success',
      message: 'Account Validated.',
      token,
      url: '',
      accountType: 'growtopia',
    });
  } catch (error) {
    res.status(200).json({ status: 'error', message: 'Login failed' });
  }
});

// ================= CHECKTOKEN REDIRECT =================
app.all('/player/growid/checktoken', (req: Request, res: Response) => {
  // Gunakan 307 agar Method (POST) tetap terjaga saat redirect
  return res.redirect(307, '/player/growid/validate/checktoken');
});

// ================= CHECKTOKEN VALIDATE =================
app.all('/player/growid/validate/checktoken', async (req: Request, res: Response) => {
  try {
    let refreshToken: string | undefined;

    if (typeof req.body === 'object' && req.body !== null) {
      const formData = req.body as Record<string, string>;
      if ('refreshToken' in formData) {
        refreshToken = formData.refreshToken;
      } else {
        const rawPayload = Object.keys(formData)[0];
        const params = new URLSearchParams(rawPayload);
        refreshToken = params.get('refreshToken') || undefined;
      }
    }

    if (!refreshToken) {
      return res.json({ status: 'error', message: 'Missing token' });
    }

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
    res.json({ status: 'error', message: 'Validation failed' });
  }
});

// ================= START =================
app.listen(PORT, () => {
  console.log(`[SERVER] vhost/RGT Optimized running on port ${PORT}`);
});

export default app;
