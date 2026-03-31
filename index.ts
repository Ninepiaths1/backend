import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// RATE LIMITER (Ditingkatkan agar tidak 403)
const limiter = rateLimit({
  windowMs: 60_000,
  max: 1000, // Kapasitas besar agar aman
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false, xForwardedForHeader: false },
});
app.use(limiter);

app.use(express.static(path.join(process.cwd(), 'public')));

// LOGGER
app.use((req: Request, res: Response, next: NextFunction) => {
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress;
  res.on('finish', () => {
    console.log(`[${res.statusCode}] ${req.method} ${req.path} → ${clientIp}`);
  });
  next();
});

// ROUTE: DASHBOARD
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
        res.send(templateContent.replace('{{ data }}', encodedClientData));
    } else {
        res.status(404).send("Template missing");
    }
  } catch (e) { res.status(500).send("Error"); }
});

// ROUTE: VALIDATE LOGIN
app.all('/player/growid/login/validate', async (req: Request, res: Response) => {
  try {
    const formData = req.body as Record<string, string>;
    const { _token, growId, password, email } = formData;

    let token = Buffer.from(
      `_token=${_token}&growId=${growId}&password=${password}${email ? `&email=${email}&reg=1` : '&reg=0'}`
    ).toString('base64');

    res.json({
      status: 'success',
      message: 'Account Validated.',
      token,
      url: '',
      accountType: 'growtopia',
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
});

// ROUTE: CHECKTOKEN REDIRECT
app.all('/player/growid/checktoken', async (_req: Request, res: Response) => {
  return res.redirect(307, '/player/growid/validate/checktoken');
});

// ROUTE: CHECKTOKEN VALIDATE (LOGIKA SEMPURNA)
app.all('/player/growid/validate/checktoken', async (req: Request, res: Response) => {
  try {
    let refreshToken: string | undefined;
    let clientData: string | undefined;

    // 1. Coba ambil dari body (Object)
    if (typeof req.body === 'object' && req.body !== null) {
      const formData = req.body as Record<string, string>;
      if ('refreshToken' in formData) {
        refreshToken = formData.refreshToken;
        clientData = formData.clientData;
      } else if (Object.keys(formData).length === 1) {
        // Handle single-key payload
        const params = new URLSearchParams(Object.keys(formData)[0]);
        refreshToken = params.get('refreshToken') || undefined;
        clientData = params.get('clientData') || undefined;
      }
    }

    // 2. Jika masih kosong, baca raw stream (Penting untuk Android!)
    if (!refreshToken || !clientData) {
        const rawBody = await new Promise<string>((resolve) => {
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', () => resolve(body));
        });
        if (rawBody) {
            const params = new URLSearchParams(rawBody);
            refreshToken = params.get('refreshToken') || refreshToken;
            clientData = params.get('clientData') || clientData;
        }
    }

    if (!refreshToken || !clientData) {
      return res.json({ status: 'error', message: 'Missing data' });
    }

    // Pembersihan Token
    let decoded = Buffer.from(refreshToken, 'base64').toString('utf-8');
    decoded = decoded.replace('&reg=0', '').replace('&reg=1', '');

    const finalToken = Buffer.from(
      decoded.replace(/(_token=)[^&]*/, `$1${Buffer.from(clientData).toString('base64')}`)
    ).toString('base64');

    res.json({
      status: 'success',
      message: 'Account Validated.',
      token: finalToken,
      url: '',
      accountType: 'growtopia',
      accountAge: 2,
    });
  } catch (error) {
    res.json({ status: 'error', message: 'Internal Error' });
  }
});

app.listen(PORT, () => console.log(`[SERVER] NovaGT Online on port ${PORT}`));

export default app;
