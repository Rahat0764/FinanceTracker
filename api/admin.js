const { getAdminClient, requireAdmin, sendTelegram, refId } = require('../lib/server');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const adminPayload = requireAdmin(req);
  if (!adminPayload) return res.status(401).json({ error: 'Admin session শেষ হয়ে গেছে, আবার Master Key দিন' });

  const sb = getAdminClient();
  const { action, payload } = req.body || {};
  const superEmail = (process.env.SUPER_ADMIN_EMAIL || '').toLowerCase().trim();

  try {
    switch (action) {
      case 'list_users': {
        const { data: profiles, error: pErr } = await sb.from('profiles').select('*').order('created_at', { ascending: false });
        if (pErr) throw pErr;

        const { data: txns, error: tErr } = await sb.from('transactions').select('user_id, type, amount');
        if (tErr) throw tErr;

        const totals = {};
        (txns || []).forEach(t => {
          if (!totals[t.user_id]) totals[t.user_id] = { income: 0, expense: 0 };
          totals[t.user_id][t.type] += Number(t.amount);
        });

        const users = (profiles || []).map(p => ({
          ...p,
          isAdmin: !!superEmail && (p.email || '').toLowerCase().trim() === superEmail,
          totalIncome: totals[p.id]?.income || 0,
          totalExpense: totals[p.id]?.expense || 0,
          balance: (totals[p.id]?.income || 0) - (totals[p.id]?.expense || 0),
          txnCount: (txns || []).filter(t => t.user_id === p.id).length
        }));

        return res.status(200).json({ users });
      }

      case 'suspend_user': {
        if (payload.id === adminPayload.uid) return res.status(400).json({ error: 'নিজের অ্যাকাউন্ট সাসপেন্ড করা যাবে না' });
        await sb.from('profiles').update({ is_suspended: true, suspend_reason: payload.reason || null }).eq('id', payload.id).throwOnError();
        await sendTelegram(`⛔ <b>User Suspended</b>\nID: ${payload.id}\nReason: ${payload.reason || '—'}`);
        return res.status(200).json({ ok: true });
      }

      case 'unsuspend_user': {
        await sb.from('profiles').update({ is_suspended: false, suspend_reason: null }).eq('id', payload.id).throwOnError();
        await sendTelegram(`✅ <b>User Unsuspended</b>\nID: ${payload.id}`);
        return res.status(200).json({ ok: true });
      }

      case 'ban_user': {
        if (payload.id === adminPayload.uid) return res.status(400).json({ error: 'নিজের অ্যাকাউন্ট ব্যান করা যাবে না' });
        const { error } = await sb.auth.admin.deleteUser(payload.id);
        if (error) throw error;
        await sendTelegram(`🚨 <b>User Banned & Deleted</b>\nID: ${payload.id}`);
        return res.status(200).json({ ok: true });
      }

      case 'send_feedback': {
        if (!payload.message || !payload.user_id) return res.status(400).json({ error: 'Message ও user আবশ্যক' });
        await sb.from('feedback').insert([{ user_id: payload.user_id, message: payload.message }]).throwOnError();
        const id = refId();
        await sendTelegram(`💬 <b>Feedback Sent</b>\nTo: ${payload.user_id}\n📝 ${payload.message}\n🔑 Ref #${id}`);
        return res.status(200).json({ ok: true });
      }

      case 'delete_feedback': {
        await sb.from('feedback').delete().eq('id', payload.id).throwOnError();
        return res.status(200).json({ ok: true });
      }

      case 'get_user_txns': {
        const { data, error } = await sb.from('transactions').select('*').eq('user_id', payload.user_id).order('txn_date', { ascending: false });
        if (error) throw error;
        return res.status(200).json({ transactions: data || [] });
      }

      case 'list_user_feedback': {
        const { data: fb, error: fErr } = await sb.from('user_feedback').select('*').order('created_at', { ascending: false });
        if (fErr) throw fErr;

        const userIds = [...new Set((fb || []).map(f => f.user_id))];
        let profilesMap = {};
        if (userIds.length) {
          const { data: profs, error: prErr } = await sb.from('profiles').select('*').in('id', userIds);
          if (prErr) throw prErr;
          (profs || []).forEach(p => { profilesMap[p.id] = p; });
        }

        const feedbackList = (fb || []).map(f => ({
          ...f,
          full_name: profilesMap[f.user_id]?.full_name || 'Unknown',
          email: profilesMap[f.user_id]?.email || '',
          avatar_url: profilesMap[f.user_id]?.avatar_url || ''
        }));

        return res.status(200).json({ feedback: feedbackList });
      }

      default:
        return res.status(400).json({ error: 'Unknown command' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};