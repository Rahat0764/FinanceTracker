const { getAdminClient, getUserFromToken, sendTelegram } = require('../lib/server');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, message, accessToken } = req.body || {};
  const user = await getUserFromToken(accessToken);
  if (!user) return res.status(401).json({ error: 'Session expired, please login again' });

  const sb = getAdminClient();

  try {
    if (action === 'submit') {
      if (!message || !message.trim()) return res.status(400).json({ error: 'Message is required' });

      await sb.from('user_feedback').insert([{ user_id: user.id, message: message.trim() }]).throwOnError();

      const name = user.user_metadata?.full_name || user.email;
      await sendTelegram(`💬 <b>New Feedback</b>\n👤 ${name}\n✉️ ${user.email}\n📝 ${message.trim()}`);

      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};