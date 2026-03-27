import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3000;

// ================= HELPER: KIRIM RESPONSE =================
// Dibuat seragam untuk semua OS agar parser C++ game tidak bingung
function sendResponse(res: Response, data: any) {
  // Paksa header tanpa embel-embel charset jika game malah nge-print
  res.setHeader('Content-Type', 'application/json'); 
  
  // Gunakan JSON.stringify tanpa spasi (compact)
  const payload = JSON.stringify(data);
  
  return res.status(200).send(payload);
}

// ================= MIDDLEWARE =================
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// MIDDLEWARE KHUSUS ANDROID: Membongkar body jika terbungkus string tunggal
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length === 1) {
    const rawKey = Object.keys(req.body)[0];
    if (rawKey.includes('=') && (rawKey.includes('growId') || rawKey.includes('refreshToken'))) {
      const params = new URLSearchParams(rawKey);
      const newBody: any = {};
      params.forEach((value, key) => {
        newBody[key] = value;
      });
      req.body = newBody;
    }
  }
  next();
});

const limiter = rateLimit({
  windowMs: 60_000,
  max: 100, // Dinaikkan sedikit agar tidak kena limit saat login ramai
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// ================= ROUTES =================

app.get('/', (_req: Request, res: Response) => {
  res.send('Login Server Active');
});

// DASHBOARD
app.all('/player/login/dashboard', (req: Request, res: Response) => {
  try {
    const body = req.body;
    let clientData = '';

    if (body && typeof body === 'object' && Object.keys(body).length > 0) {
      clientData = JSON.stringify(body);
    }

    const encodedData = Buffer.from(clientData).toString('base64');
    const templatePath = path.join(process.cwd(), 'template', 'dashboard.html');
    
    if (fs.existsSync(templatePath)) {
      const content = fs.readFileSync(templatePath, 'utf-8');
      res.setHeader('Content-Type', 'text/html');
      return res.send(content.replace('{{ data }}', encodedData));
    }
    res.status(404).send('Dashboard Template Missing');
  } catch (err) {
    res.status(500).send('Internal Error');
  }
});

// VALIDATE LOGIN
app.all('/player/growid/login/validate', (req: Request, res: Response) => {
  try {
    const { _token, growId, password } = req.body;

    const raw = `_token=${_token || ''}&growId=${growId || ''}&password=${password || ''}`;
    const token = Buffer.from(raw).toString('base64');

    // Buat object response yang sangat standar
    const result = {
      status: "success",
      message: "Account Validated.",
      token: token,
      url: "",
      accountType: "growtopia"
    };

    // SET HEADER MANUAL & SEND RAW STRING
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(JSON.stringify(result));
    
  } catch (error) {
    return res.status(200).send(JSON.stringify({ status: "error", message: "server_err" }));
  }
});

// CHECKTOKEN (Menghindari 307 Redirect agar Android lama tidak error -1)
app.all(['/player/growid/checktoken', '/player/growid/validate/checktoken'], (req: Request, res: Response) => {
  try {
    const refreshToken = req.body.refreshToken;

    if (!refreshToken) {
      return sendResponse(res, { status: 'error', message: 'Missing token' });
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
    return sendResponse(res, { status: 'error', message: 'Invalid Token' });
  }
});

app.listen(PORT, () => {
  console.log(`[SERVER] Ready on port ${PORT}`);
});

export default app;
