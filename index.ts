import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = 3000;

app.set('trust proxy', 1);
app.disable('x-powered-by');

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// rate limiter
const limiter = rateLimit({
  windowMs: 60_000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// static
app.use(express.static(path.join(process.cwd(), 'public')));

// logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  const clientIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown';

  console.log(`[REQ] ${req.method} ${req.path} → ${clientIp}`);
  next();
});

// root
app.get('/', (_req: Request, res: Response) => {
  res.send('Hello, world!');
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
    const { _token, growId, password, email } = req.body;

    const isGuest = !growId && !password;

    let raw: string;

    if (isGuest) {
      const guestId = `guest_${Date.now()}`;

      raw = `_token=guest&growId=${guestId}&password=guest&guest=1`;

      console.log('[GUEST MODE]');
    } else {
      raw = `_token=${_token}&growId=${growId}&password=${password}`;
      if (email) raw += `&email=${email}`;
    }

    const token = Buffer.from(raw).toString('base64');

    res.json({
      status: 'success',
      message: 'Account Validated.',
      token,
      url: '',
      accountType: 'growtopia',
    });
  } catch (error) {
    console.log(`[ERROR]: ${error}`);
    res.status(500).json({
      status: 'error',
      message: 'Internal Server Error',
    });
  }
});

// ================= CHECKTOKEN REDIRECT =================
app.all('/player/growid/checktoken', async (_req: Request, res: Response) => {
  return res.redirect(307, '/player/growid/validate/checktoken');
});

// ================= CHECKTOKEN VALIDATE (FINAL FIX) =================
app.all('/player/growid/validate/checktoken', async (req: Request, res: Response) => {
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
      return res.json({
        status: 'error',
        message: 'Missing refreshToken',
      });
    }

    const decoded = Buffer.from(refreshToken, 'base64').toString('utf-8');

    // 🔥 GUEST FLOW FIX
    const isGuest =
  decoded.includes('guest=1') ||
  decoded.includes('growId=guest_');

if (isGuest) {
  console.log('[FORCE DASHBOARD] Guest detected:', decoded);

  return res.json({
    status: 'success',
    message: 'Please login again.',
    token: 'invalid_token',
    url: 'https://backend-beta-pied-79.vercel.app/player/login/dashboard',
    accountType: 'growtopia'
  });
}

    // normal user
    const token = Buffer.from(decoded).toString('base64');

    res.json({
      status: 'success',
      message: 'Account Validated.',
      token,
      url: '',
      accountType: 'growtopia',
      accountAge: 2,
    });

  } catch (error) {
    console.log(`[ERROR]: ${error}`);
    res.json({
      status: 'error',
      message: 'Internal Server Error',
    });
  }
});

// ================= START SERVER =================
app.listen(PORT, () => {
  console.log(`[SERVER] Running on http://localhost:${PORT}`);
});

export default app;
