import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

const app = express();
const PORT = 3000;

app.set('trust proxy', 1);
app.disable('x-powered-by');

// ================= MIDDLEWARE =================
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

// ================= LOGGER =================
app.use((req: Request, _res: Response, next: NextFunction) => {
  const clientIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown';

  console.log(`[REQ] ${req.method} ${req.path} → ${clientIp}`);
  next();
});

// ================= ROOT =================
app.get('/', (_req: Request, res: Response) => {
  res.send('GTPS BYPASS RUNNING');
});

// ================= LOGIN VALIDATE =================
app.all('/player/growid/login/validate', async (req: Request, res: Response) => {
  try {
    let requestedName = 'Player';

    // 🔥 HANDLE FORMAT BODY GT (normal / encoded)
    if (typeof req.body === 'object' && req.body !== null) {
      const formData = req.body as Record<string, string>;

      if ('requestedName' in formData) {
        requestedName = formData.requestedName;
      } 
      else if (Object.keys(formData).length === 1) {
        const rawPayload = Object.keys(formData)[0];
        const params = new URLSearchParams(rawPayload);
        requestedName = params.get('requestedName') || 'Player';
      }
    }

    // 🔥 VALIDASI NAMA
    if (!requestedName || requestedName.length < 3) {
      requestedName = 'Player';
    }

    console.log('[LOGIN AS]', requestedName);

    // 🔥 TOKEN AUTO LOGIN
    const raw = `_token=static_token&growId=${requestedName}&password=guest`;
    const token = Buffer.from(raw).toString('base64');

    res.send(JSON.stringify({
      status: 'success',
      message: 'Auto Login Success',
      token,
      url: '', // kosong = tidak ke dashboard
      accountType: 'growtopia',
    }));
  } catch (error) {
    console.log('[ERROR LOGIN]', error);
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

// ================= CHECKTOKEN VALIDATE =================
app.all('/player/growid/validate/checktoken', async (req: Request, res: Response) => {
  try {
    let refreshToken: string | undefined;

    if (typeof req.body === 'object' && req.body !== null) {
      const formData = req.body as Record<string, string>;

      if ('refreshToken' in formData) {
        refreshToken = formData.refreshToken;
      } 
      else if (Object.keys(formData).length === 1) {
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

    // 🔥 DECODE TOKEN
    const decoded = Buffer.from(refreshToken, 'base64').toString('utf-8');

    console.log('[CHECKTOKEN]', decoded);

    // 🔥 RE-ENCODE TANPA UBAH
    const token = Buffer.from(decoded).toString('base64');

    res.send(JSON.stringify({
      status: 'success',
      message: 'Account Validated.',
      token,
      url: '', // penting: kosong biar gak redirect
      accountType: 'growtopia',
      accountAge: 999,
    }));
  } catch (error) {
    console.log('[ERROR CHECKTOKEN]', error);
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
