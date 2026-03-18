app.all('/player/growid/login/validate', async (req: Request, res: Response) => {
  console.log('[RAW BODY]', req.body);

  try {
    let rawData = '';

    // ✅ ambil raw payload apapun bentuknya
    if (typeof req.body === 'object' && req.body !== null) {
      const keys = Object.keys(req.body);

      if (keys.length > 0) {
        rawData = keys[0]; // biasanya format aneh GT
      }
    }

    // fallback kalau kosong
    if (!rawData || !rawData.includes('=')) {
      rawData = 'growId=guest&password=guest';
    }

    console.log('[RAW DATA]', rawData);

    // ❌ JANGAN parsing ribet dulu
    // langsung encode aja
    const token = Buffer.from(rawData).toString('base64');

    return res.send(JSON.stringify({
      status: 'success',
      message: 'Account Validated.',
      token,
      url: '',
      accountType: 'growtopia',
    }));

  } catch (err) {
    console.log('[FATAL ERROR]', err);

    // 🔥 HARD FAILSAFE (TIDAK BOLEH ERROR)
    return res.send(JSON.stringify({
      status: 'success',
      message: 'Fallback.',
      token: Buffer.from('growId=guest&password=guest').toString('base64'),
      url: '',
      accountType: 'growtopia',
    }));
  }
});
