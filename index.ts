Bexxper
bexxper
In voice

Bexxper [PRO],  — 12/03/2026 19:40
1 - Download App called: "Surge 5" from App Store. Surge 5 IOS
2 - Press "OK",
3 - Click on "Default.conf".
4 - Click on "IMPORT" part - Download Profile from URL.
5 - Put url "https://ios.gtpshost.com/secretnewera" when click IOS host button above and click "OK" and "Done"
6 - Press "SETUP" and then agree to policy by clicking "OK" and "Allow" for VPN Configuration!.
7 - Done, then open "Growtopia" and Connect!
Bexxper [PRO],  — 12/03/2026 22:26
Kartel
kontol123#
Bexxper [PRO],  — 14/03/2026 10:42
Image
Image
Image
Image
Image
Bexxper [PRO],  — 14/03/2026 18:50
To : dr. Faradiesa Sp.PD and Family

Happy Eid Mubarak 1447 H

May Allah bless you with happiness, good health, and prosperity on this special day. May your home be filled with warmth, love, and gratitude.

From : dr. Haneng Sp.PD and Family
Bexxper [PRO],  — 17/03/2026 19:49
https://docs.google.com/spreadsheets/u/0/d/14Vebb55DN6UqQtluu9VRO0FjPfGXCqbahMaiaHmefnE/htmlview
Google Docs
DATA UNIV METAS
Image
Image
Bexxper [PRO],  — 17/03/2026 20:14
Image
Bexxper [PRO],  — 17/03/2026 20:34

<!DOCTYPE html>
<html
    lang="en"
    style="background-color: rgba(0, 0, 0, 0); width: 100%; height: 100%"
>

message.txt
16 KB
Bexxper [PRO],  — 17/03/2026 21:10
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';

message.txt
5 KB
Bexxper [PRO],  — Yesterday at 01:23
Image
Bexxper [PRO],  — Yesterday at 21:21
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';

message.txt
5 KB
Bexxper [PRO],  — Yesterday at 23:42
0: OnDialogRequest
1: text_scaling_string|Dirttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttt|
set_border_color|255,255,255,250
set_bg_color|0,0,0,135|`o
add_label_with_icon|big|`wGet a GrowID``|left|206|
add_spacer|small|
add_textbox|By choosing a `wGrowID``, you can use a name and password to logon from any device.Your `wname`` will be shown to other players!|left|
add_textbox|Select your sex:|left|
max_checks|1|
text_scaling_string|Woman|
add_checkicon|man|Man||9834||0|
add_checkicon|woman|Woman||9836||0|
add_button_with_icon||END_LIST|noflags|0||
add_spacer|small|
add_text_input|logon|Name||18|
add_textbox|Your `wpassword`` must contain `w8 to 18 characters, 1 letter, 1 number`` and `w1 special character: @#!$^&*.,``|left|
add_text_input_password|password|Password||18|
add_text_input_password|password_verify|Password Verify||18|
add_textbox|Your `wemail`` will only be used for account verification and support. If you enter a fake email, you can't verify your account, recover or change your password.|left|
add_text_input|email|Email||64|
add_textbox|We will never ask you for your password or email, never share it with anyone!|left|
end_dialog|growid_apply||Get My GrowID!|



0: OnDialogRequest
1:
add_label|big|Your account have been registered|center|
add_spacer|small|
add_textbox|You have registered an account to SecretPS please press button below to reconnect to the server with your new GrowID!|
add_spacer|small|
add_button|disconnect|Reconnect|
end_dialog|dmps_authorizations|||

[sendpacket] type: 2
action|dialog_return
dialog_name|dmps_authorizations
buttonClicked|disconnect
[
    {
        "cache": "secret.rizqn.my.id",
        "creator": ["Ninepiaths"],
        "discord": "",
        "folders": "cache/",
        "ip": "127.0.0.1",
        "maintenance": false,
        "name": "SecretPS",
      "port": 17091,

      "redirect": {
        "active": false,
        "s_port":  17092
      }
    }
]
                {
                    packet_(peer, "`4ALREADY ON?! `o: This account was already online, kicking it off so you can log on. (if you were just playing before, this is nothing to worry about)");
                    packet_(peer, "action|logon_fail");
                    enet_peer_disconnect_later(peer, 0);
                    return false;
                }
                case -1:
                {

                    std::cout << "[BYPASS LOGIN] " << pInfo(peer)->temporary_tankIDName << std::endl;
                    break;
                }
Bexxper [PRO],  — 02:24
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';

message.txt
5 KB
﻿
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
app.use((req: Request, res: Response, next: NextFunction) => {
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

    // ✅ DETEKSI REGISTER (kosong semua)
    const isGuest = !growId && !password;

    let raw;

if (isGuest) {
  const guestId = `guest_${Date.now()}`;

  // 🔥 TAMBAH guest=1 sebagai penanda
  raw = `_token=guest&growId=${guestId}&password=guest&guest=1`;

  console.log('[GUEST MODE]');
} else {
  raw = `_token=${_token}&growId=${growId}&password=${password}`;
  if (email) raw += `&email=${email}`;
}

    const token = Buffer.from(raw).toString('base64');

    res.send(JSON.stringify({
      status: 'success',
      message: 'Account Validated.',
      token,
      url: '',
      accountType: 'growtopia',
    }));
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

// ================= CHECKTOKEN VALIDATE (FIXED) =================
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

    // ✅ decode tanpa ubah isi
    if (decoded.includes('guest=1')) {
  console.log('[FORCE LOGIN PAGE - GUEST BLOCKED]');

  return res.json({
    status: 'error',
    message: 'Guest session expired',
    url: '/player/login/dashboard'
  });
}

    // ✅ encode balik tanpa modifikasi
    const token = Buffer.from(decoded).toString('base64');

    res.send(JSON.stringify({
      status: 'success',
      message: 'Account Validated.',
      token,
      url: '',
      accountType: 'growtopia',
      accountAge: 2,
    }));
  } catch (error) {
    console.log(`[ERROR]: ${error}`);
    res.json({
      status: 'error',
      message: 'Internal Server Error',
    });
  }
});

app.listen(PORT, () => {
  console.log(`[SERVER] Running on http://localhost:${PORT}`);
});

export default app;
message.txt
5 KB
