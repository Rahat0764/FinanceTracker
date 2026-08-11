const { getUserFromToken, sendTelegram } = require('../lib/server');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { event, accessToken, details } = req.body || {};

  const user = await getUserFromToken(accessToken);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const name = user.user_metadata?.full_name || user.email;
  let msg = '';

  switch (event) {
    case 'login':
      msg = `👋 <b>New Login</b>\n👤 ${name}\n✉️ ${user.email}`;
      break;
    case 'transaction_add':
      msg = `💰 <b>${details.type === 'income' ? 'Income Added' : 'Expense Added'}</b>\n👤 ${name}\n🏷️ ${details.category}\n💵 ৳${details.amount}\n🔑 Ref #${details.ref_id}`;
      break;
    case 'transaction_delete':
      msg = `🗑️ <b>Transaction Deleted</b>\n👤 ${name}\n🔑 Ref #${details.ref_id}\n💵 ৳${details.amount}`;
      break;
    case 'full_reset':
      msg = `⚠️ <b>Full History Reset</b>\n👤 ${name}\n✉️ ${user.email}\nAll transactions wiped by the user.`;
      break;
    default:
      return res.status(400).json({ error: 'Unknown event' });
  }

  await sendTelegram(msg);
  return res.status(200).json({ ok: true });
};
