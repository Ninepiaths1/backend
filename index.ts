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
max: 100,
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

// =====================================================
// 🔥 DASHBOARD BYPASS (NO LOOP)
// =====================================================
app.all('/player/login/dashboard', (_req: Request, res: Response) => {
console.log('[BYPASS] Dashboard skipped');

return res.json({
status: 'success',
message: 'Dashboard bypassed',
});
});

// =====================================================
// 🔥 LOGIN VALIDATE (TOKEN DUMMY ONLY)
// =====================================================
app.all('/player/growid/login/validate', (req: Request, res: Response) => {
try {
let requestedName = 'Player';

```
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

if (!requestedName || requestedName.length < 3) {
  requestedName = 'Player';
}

console.log('[BYPASS LOGIN AS]', requestedName);

// 🔥 TOKEN DUMMY (TIDAK DIGUNAKAN C++)
const raw = `_token=dummy&growId=${requestedName}&password=dummy`;
const token = Buffer.from(raw).toString('base64');

return res.json({
  status: 'success',
  message: 'Bypass OK',
  token,
  url: '', // penting: kosong biar langsung ke server
  accountType: 'growtopia',
});
```

} catch (error) {
console.log('[ERROR LOGIN]', error);

```
return res.status(500).json({
  status: 'error',
  message: 'Internal Server Error',
});
```

}
});

// =====================================================
// 🔥 CHECKTOKEN (NO LOOP, NO REDIRECT)
// =====================================================
app.all('/player/growid/checktoken', (_req: Request, res: Response) => {
console.log('[CHECKTOKEN BYPASS]');

const raw = `_token=dummy&growId=Player&password=dummy`;
const token = Buffer.from(raw).toString('base64');

return res.json({
status: 'success',
message: 'Token OK',
token,
url: '',
accountType: 'growtopia',
});
});

// =====================================================
// 🔥 VALIDATE CHECKTOKEN (FINAL STEP)
// =====================================================
app.all('/player/growid/validate/checktoken', (_req: Request, res: Response) => {
console.log('[FINAL TOKEN VALIDATION]');

const raw = `_token=dummy&growId=Player&password=dummy`;
const token = Buffer.from(raw).toString('base64');

return res.json({
status: 'success',
message: 'Account Validated',
token,
url: '',
accountType: 'growtopia',
accountAge: 999,
});
});

// ================= START SERVER =================
app.listen(PORT, () => {
console.log(`[SERVER] Running on http://localhost:${PORT}`);
});

export default app;
