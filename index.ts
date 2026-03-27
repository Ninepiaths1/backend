import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3000;

// ================= FIXED SEND RESPONSE =================
// Menghapus pemisahan iOS/Android agar format seragam & compact
function sendResponse(res: Response, data: any) {
  // Paksa header Content-Type tanpa charset untuk kompatibilitas maksimal
  res.setHeader('Content-Type', 'application/json');
  // JSON.stringify tanpa spasi tambahan (compact mode)
  return res.status(200).send(JSON.stringify(data));
}

app.set('trust proxy', 1);
app.disable('x-powered-by');

// ================= MIDDLEWARE =================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Middleware Fix: Menangani body "aneh" dari Android (raw string dalam object)
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length === 1) {
    const rawKey = Object.keys(req.body)[0];
    if (rawKey.includes('=') && (rawKey.includes('growId') || rawKey.includes('refreshToken'))) {
      const params = new URLSearchParams(rawKey);
      const newBody: any = {};
      params.forEach((value, key) => { newBody[key] = value; });
      req.body = newBody;
    }
  }
  next();
});

const limiter = rateLimit({
  windowMs: 60_000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// ================= ROUTES =================

app.get('/', (_req: Request, res: Response) => {
  res.send('Login Server Active');
});

// LOGIN VALIDATE
app.all('/player/growid/login/validate', (req: Request, res: Response) => {
  try {
    const { _token, growId, password, email } = req.body;

    // Handle Register / Empty Fields
    if (!growId && !password) {
      const raw = `_token=${_token || ''}&growId=&password=`;
      return sendResponse(res, {
        status: 'success',
        message: 'Account Validated.',
        token: Buffer.from(raw).toString('base64'),
        url: '',
        accountType: 'growtopia',
      });
    }

    // Normal Login
    let raw = `_token=${_token || ''}&growId=${growId}&password=${password}`;
    if (email) raw += `&email=${email}`;

    return sendResponse(res, {
      status: 'success',
      message: 'Account Validated.',
      token: Buffer.from(raw).toString('base64'),
      url: '',
      accountType: 'growtopia',
    });
  } catch (error) {
    return res.status(200).send(JSON.stringify({ status: 'error', message: 'Internal Error' }));
  }
});

// CHECKTOKEN (Hapus redirect 307 karena sering bikin Error -1 di Android)
app.all(['/player/growid/checktoken', '/player/growid/validate/checktoken'], (req: Request, res: Response) => {
  try {
    const refreshToken = req.body.refreshToken;
    if (!refreshToken) {
      return res.json({ status: 'error', message: 'Missing token' });
    }

    const decoded = Buffer.from(refreshToken, 'base64').toString('utf-8');
    const token = Buffer.from(decoded).toString('base64');

    return sendResponse(res, {
      status: 'success',
      message: 'Account Validated.',
      token,
      url: '',
      accountType: 'growtopia',
      accountAge: 2,
    });
  } catch (error) {
    return res.json({ status: 'error', message: 'Invalid Token' });
  }
});

app.listen(PORT, () => {
  console.log(`[SERVER] Running on port ${PORT}`);
});

export default app;
