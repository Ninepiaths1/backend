import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

const app = express();
const PORT = 3000;

// trust proxy
app.set('trust proxy', 1);

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
  validate: { trustProxy: false, xForwardedForHeader: false },
});
app.use(limiter);

// request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const clientIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket.remoteAddress ||
    'unknown';

  console.log(
    `[REQ] ${req.method} ${req.path} → ${clientIp} | ${res.statusCode}`,
  );
  next();
});

// root
app.get('/', (_req: Request, res: Response) => {
  res.send('Hello, world!');
});

/**
 * ✅ FIXED: dashboard langsung redirect (tidak render HTML lagi)
 */
app.all('/player/login/dashboard', async (req: Request, res: Response) => {
  return res.redirect(307, '/player/growid/login/validate');
});

/**
 * validate login
 */
app.all(
  '/player/growid/login/validate',
  async (req: Request, res: Response) => {
    try {
      const formData = req.body as Record<string, string>;

      const _token = formData._token;
      const growId = formData.growId;
      const password = formData.password;
      const email = formData.email;

      let token = '';

      if (email) {
        token = Buffer.from(
          `_token=${_token}&growId=${growId}&password=${password}&email=${email}&reg=1`,
        ).toString('base64');
      } else {
        token = Buffer.from(
          `_token=${_token}&growId=${growId}&password=${password}&reg=0`,
        ).toString('base64');
      }

      res.send(
        JSON.stringify({
          status: 'success',
          message: 'Account Validated.',
          token,
          url: '',
          accountType: 'growtopia',
        }),
      );
    } catch (error) {
      console.log(`[ERROR]: ${error}`);
      res.status(500).json({
        status: 'error',
        message: 'Internal Server Error',
      });
    }
  },
);

/**
 * checktoken step 1 → redirect
 */
app.all('/player/growid/checktoken', async (_req: Request, res: Response) => {
  return res.redirect(307, '/player/growid/validate/checktoken');
});

/**
 * checktoken step 2
 */
app.all(
  '/player/growid/validate/checktoken',
  async (req: Request, res: Response) => {
    try {
      const formData = req.body as Record<string, string>;

      let refreshToken = formData.refreshToken;
      let clientData = formData.clientData;

      if (!refreshToken || !clientData) {
        res.status(200).json({
          status: 'error',
          message: 'Missing refreshToken or clientData',
        });
        return;
      }

      let decodedRefreshToken = Buffer.from(
        refreshToken,
        'base64',
      ).toString('utf-8');

      // remove reg flag
      decodedRefreshToken = decodedRefreshToken
        .replace('&reg=0', '')
        .replace('&reg=1', '');

      const token = Buffer.from(
        decodedRefreshToken.replace(
          /(_token=)[^&]*/,
          `$1${Buffer.from(clientData).toString('base64')}`,
        ),
      ).toString('base64');

      res.send(
        JSON.stringify({
          status: 'success',
          message: 'Account Validated.',
          token,
          url: '',
          accountType: 'growtopia',
          accountAge: 2,
        }),
      );
    } catch (error) {
      console.log(`[ERROR]: ${error}`);
      res.status(200).json({
        status: 'error',
        message: 'Internal Server Error',
      });
    }
  },
);

app.listen(PORT, () => {
  console.log(`[SERVER] Running on http://localhost:${PORT}`);
});

export default app;
