const { getUserFromToken, sign, sendTelegram } = require('../lib/server');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { masterKey, accessToken } = req.body || {};
  if (!masterKey || masterKey !== process.env.MASTER_KEY) {
    return res.status(401).json({ error: 'Master Key সঠিক নয়' });
  }

  const user = await getUserFromToken(accessToken);
  if (!user) return res.status(401).json({ error: 'আগে গুগল দিয়ে লগইন করুন' });

  const superEmail = (process.env.SUPER_ADMIN_EMAIL || '').toLowerCase().trim();
  if (!superEmail || (user.email || '').toLowerCase().trim() !== superEmail) {
    return res.status(403).json({ error: 'এই একাউন্টের Master Key ব্যবহারের অনুমতি নেই' });
  }

  const token = sign({ role: 'super_admin', uid: user.id, exp: Date.now() + 1000 * 60 * 60 * 6 });
  await sendTelegram(`🛡️ <b>Master Key Used</b>\n👤 ${user.email}\n⏰ Admin session opened (6h)`);
  return res.status(200).json({ token });
};
