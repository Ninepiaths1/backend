import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = 3000;

// ================= HELPER RESPONSE =================
function sendResponse(req: Request, res: Response, data: any) {
  const userAgent = req.headers['user-agent'] || '';
  const isIOS = /iphone|ipad|ios/i.test(userAgent);

  if (isIOS) {
    res.setHeader('Content-Type', 'application/json');
    return res.json(data);
  } else {
    // FIX: Tambah Content-Type text/plain agar GT client bisa parse
    res.setHeader('Content-Type', 'text/plain');
    return res.send(JSON.stringify(data));
  }
}

app.set('trust proxy', 1);
app.disable('x-powered-by');

// ================= MIDDLEWARE =================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// FIX: Naikkan rate limit, GT butuh beberapa request saat login
const limiter = rateLimit({
  windowMs: 60_000,
  max: 200,
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
  console.log(`[REQ] ${req.method} ${req.path} → ${clientIp}`);
  next();
});

// ================= ROOT =================
app.get('/', (_req: Request, res: Response) => {
  res.send('Login Server Running');
});

// ================= FIX: PTUNNEL ENDPOINT =================
// GT versi terbaru butuh ini untuk ptunnel support
app.get('/raw/ptunnel.txt', (_req: Request, res: Response) => {
  const ptunnelPath = path.join(process.cwd(), 'public', 'ptunnel.txt');

  if (fs.existsSync(ptunnelPath)) {
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res.sendFile(ptunnelPath);
  }

  // Kalau file tidak ada, return format default ptunnel
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.send('add|0\n');
});

// ================= DASHBOARD =================
app.all('/player/login/dashboard', async (req: Request, res: Response) => {
  const body = req.body;
  let clientData = '';

  if (body && typeof body === 'object' && Object.keys(body).length > 0) {
    clientData = Object.keys(body)[0];
  }

  const encodedClientData = Buffer.from(clientData).toString('base64');
  const templatePath = path.join(process.cwd(), 'template', 'dashboard.html');
  const templateContent = fs.readFileSync(templatePath, 'utf-8');
  const htmlContent = templateContent.replace('{{ data }}', encodedClientData);

  res.setHeader('Content-Type', 'text/html');
  res.send(htmlContent);
});

// ================= LOGIN VALIDATE =================
app.all('/player/growid/login/validate', async (req: Request, res: Response) => {
  try {
    let _token: string | null, growId: string | null, password: string | null, email: string | null;

    if (typeof req.body === 'object' && Object.keys(req.body).length === 1) {
      const raw = Object.keys(req.body)[0];
      const params = new URLSearchParams(raw);
      _token    = params.get('_token');
      growId    = params.get('growId');
      password  = params.get('password');
      email     = params.get('email');
    } else {
      _token    = req.body._token;
      growId    = req.body.growId;
      password  = req.body.password;
      email     = req.body.email;
    }

    // Register button (empty)
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

    if (!growId || !password) {
      return res.json({
        status: 'error',
        message: 'growId and password required',
      });
    }

    let raw = `_token=${_token}&growId=${growId}&password=${password}`;
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
    console.log(`[ERROR]: ${error}`);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
});

// ================= FIX: HAPUS REDIRECT 307, LANGSUNG HANDLE =================
// Redirect 307 bisa bikin GT client tidak follow → RGT/terpental
app.all('/player/growid/checktoken', async (req: Request, res: Response) => {
  return handleCheckToken(req, res);
});

app.all('/player/growid/validate/checktoken', async (req: Request, res: Response) => {
  return handleCheckToken(req, res);
});

async function handleCheckToken(req: Request, res: Response) {
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
      return res.json({ status: 'error', message: 'Missing refreshToken' });
    }

    const decoded = Buffer.from(refreshToken, 'base64').toString('utf-8');
    const token   = Buffer.from(decoded).toString('base64');

    return sendResponse(req, res, {
      status: 'success',
      message: 'Account Validated.',
      token,
      url: '',
      accountType: 'growtopia',
      accountAge: 2,
    });
  } catch (error) {
    console.log(`[ERROR]: ${error}`);
    res.json({ status: 'error', message: 'Internal Server Error' });
  }
}

// ================= START =================
app.listen(PORT, () => {
  console.log(`[SERVER] Running on http://localhost:${PORT}`);
});

export default app;
```

---

**Sekarang buat file `public/ptunnel.txt`** di root project kamu:
```
add|0
```

Format ini artinya "tidak ada ptunnel aktif". Kalau kamu punya ptunnel server sendiri, isinya seperti ini:
```
add|IP_PTUNNEL:PORT
