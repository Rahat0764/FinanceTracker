const { getAdminClient, getUserFromToken, hashPin, checkPin, sendTelegram } = require('../lib/server');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, pin, oldPin, accessToken } = req.body || {};
  const user = await getUserFromToken(accessToken);
  if (!user) return res.status(401).json({ error: 'Session expired, please login again' });

  const sb = getAdminClient();

  try {
    if (action === 'status') {
      const { data } = await sb.from('profiles').select('pin_set, is_suspended').eq('id', user.id).single();
      return res.status(200).json({ pin_set: !!(data && data.pin_set), is_suspended: !!(data && data.is_suspended) });
    }

    if (action === 'set') {
      if (!pin || String(pin).length !== 6) return res.status(400).json({ error: '৬ সংখ্যার পিন দিন' });

      const { data: prof } = await sb.from('profiles').select('pin_set, pin_hash').eq('id', user.id).single();
      if (prof && prof.pin_set) {
        if (!oldPin) return res.status(400).json({ error: 'পুরাতন পিন প্রয়োজন' });
        if (!checkPin(oldPin, prof.pin_hash)) return res.status(401).json({ error: 'পুরাতন পিন সঠিক নয়' });
      }

      const pin_hash = hashPin(pin);
      await sb.from('profiles').update({ pin_hash, pin_set: true }).eq('id', user.id).throwOnError();
      await sendTelegram(`🔐 <b>PIN Updated</b>\n👤 ${user.email}`);
      return res.status(200).json({ ok: true });
    }

    if (action === 'verify') {
      if (!pin) return res.status(400).json({ error: 'পিন দিন' });
      const { data: prof } = await sb.from('profiles').select('pin_hash, pin_set').eq('id', user.id).single();
      if (!prof || !prof.pin_set) return res.status(400).json({ error: 'কোনো পিন সেট করা নেই' });
      const ok = checkPin(pin, prof.pin_hash);
      if (!ok) return res.status(401).json({ error: 'ভুল পিন!' });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
