import React, { useState, useEffect, useMemo } from 'react';
import {
  getNewsletterEditions,
  saveNewsletterEdition,
  deleteNewsletterEdition,
  sendNewsletterEdition,
} from './api';
import { themeForDate, themeByKey, suggestPieces } from '../lib/newsletterThemes.js';
import { newsletterEmailHtml } from '../lib/newsletterEmail.js';
import { kiraProducts } from '../data/kiraProducts.js';

const slim = (p) => ({
  name: p.name,
  description: p.description || '',
  price: p.price ?? null,
  link: p.link || p.image || '',
  category: p.category || '',
});

const money = (v) => {
  const n = Number(String(v ?? '').replace(/[^0-9.]/g, ''));
  return isNaN(n) || n === 0 ? '' : `$${Math.round(n).toLocaleString()}`;
};

function formatDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return iso; }
}

function statusBadge(status) {
  if (status === 'sent') return <span className="admin-badge admin-badge--success">Sent</span>;
  if (status === 'approved') return <span className="admin-badge admin-badge--warning">Approved</span>;
  return <span className="admin-badge admin-badge--gray">Draft</span>;
}

export default function AdminNewsletter() {
  const [editions, setEditions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [draft, setDraft] = useState(null);      // the edition being edited (a copy)
  const [busy, setBusy] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [confirmSend, setConfirmSend] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await getNewsletterEditions();
      setEditions(data);
      return data;
    } catch (e) {
      setError(e.message || 'Failed to load editions');
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const flash = (msg) => { setMessage(msg); setTimeout(() => setMessage(null), 3500); };

  const createDraft = async () => {
    try {
      setBusy(true);
      const theme = themeForDate(new Date());
      const recent = editions.slice(0, 3).flatMap((e) => (e.pieces || []).map((p) => p.name));
      const pieces = suggestPieces(theme, kiraProducts, { count: 4, excludeNames: recent }).map(slim);
      const saved = await saveNewsletterEdition({
        theme_key: theme.key,
        theme_name: theme.name,
        subject: theme.subject,
        headline: theme.headline,
        intro: theme.intro,
        pieces,
        status: 'draft',
      });
      await load();
      setDraft({ ...saved });
      flash('New draft created.');
    } catch (e) {
      setError(e.message || 'Failed to create draft');
    } finally {
      setBusy(false);
    }
  };

  const editEdition = (ed) => { setDraft({ ...ed, pieces: [...(ed.pieces || [])] }); setShowPicker(false); setConfirmSend(false); };

  const patch = (field, value) => setDraft((d) => ({ ...d, [field]: value }));
  const removePiece = (name) => setDraft((d) => ({ ...d, pieces: d.pieces.filter((p) => p.name !== name) }));
  const addPiece = (p) => setDraft((d) => {
    if (d.pieces.some((x) => x.name === p.name)) return d;
    return { ...d, pieces: [...d.pieces, slim(p)] };
  });

  const save = async () => {
    try {
      setBusy(true);
      const saved = await saveNewsletterEdition(draft);
      setDraft({ ...saved });
      await load();
      flash('Saved.');
    } catch (e) { setError(e.message || 'Save failed'); }
    finally { setBusy(false); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this edition?')) return;
    try {
      await deleteNewsletterEdition(id);
      setDraft(null);
      await load();
    } catch (e) { setError(e.message || 'Delete failed'); }
  };

  const doSendTest = async () => {
    if (!draft?.id) { setError('Save the draft before sending a test.'); return; }
    if (!testEmail) { setError('Enter an email to send the test to.'); return; }
    try {
      setBusy(true);
      await sendNewsletterEdition(draft.id, testEmail);
      flash(`Test sent to ${testEmail}.`);
    } catch (e) { setError(e.message || 'Test send failed'); }
    finally { setBusy(false); }
  };

  const doSendAll = async () => {
    if (!draft?.id) return;
    try {
      setBusy(true);
      const res = await sendNewsletterEdition(draft.id, null);
      setConfirmSend(false);
      await load();
      const updated = (await getNewsletterEditions()).find((e) => e.id === draft.id);
      if (updated) setDraft({ ...updated });
      flash(`Sent to ${res.sent} subscriber${res.sent === 1 ? '' : 's'}${res.failed ? ` (${res.failed} failed)` : ''}.`);
    } catch (e) { setError(e.message || 'Send failed'); }
    finally { setBusy(false); }
  };

  const previewHtml = useMemo(() => {
    if (!draft) return '';
    return newsletterEmailHtml({
      themeName: draft.theme_name || '',
      headline: draft.headline || '',
      intro: draft.intro || '',
      pieces: draft.pieces || [],
      siteUrl: 'https://theopalgems.com',
      unsubscribeUrl: '#',
      accent: themeByKey(draft.theme_key)?.accent,
    });
  }, [draft]);

  const pickerResults = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    return kiraProducts
      .filter((p) => (p.link || p.image) && (p.price != null && p.price !== ''))
      .filter((p) => !q || (p.description || '').toLowerCase().includes(q) || (p.category || '').includes(q))
      .slice(0, 60);
  }, [pickerSearch]);

  const sent = draft?.status === 'sent';

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <div>
          <h1>Newsletter</h1>
          <p className="admin-page__subtitle">
            Biweekly seasonal edit · {editions.length} edition{editions.length === 1 ? '' : 's'} · drafts auto-build every 2 weeks
          </p>
        </div>
        <button className="admin-btn admin-btn--primary" onClick={createDraft} disabled={busy}>+ New edition</button>
      </div>

      {error && <div className="admin-alert admin-alert--error" onClick={() => setError(null)} style={{ cursor: 'pointer' }}>{error} (dismiss)</div>}
      {message && <div className="admin-alert admin-alert--success">{message}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Editions list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading ? <p className="admin-page__subtitle">Loading…</p> :
            editions.length === 0 ? <p className="admin-page__subtitle">No editions yet. Click “New edition”.</p> :
            editions.map((ed) => (
              <button
                key={ed.id}
                onClick={() => editEdition(ed)}
                style={{
                  textAlign: 'left', padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                  border: draft?.id === ed.id ? '1px solid #b4965a' : '1px solid #e2ddd3',
                  background: draft?.id === ed.id ? '#fbf7ee' : '#fff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <strong style={{ fontSize: 14 }}>{ed.theme_name || 'Edition'}</strong>
                  {statusBadge(ed.status)}
                </div>
                <div style={{ fontSize: 12, color: '#8a8175', marginTop: 4 }}>{formatDate(ed.created_at)} · {(ed.pieces || []).length} pieces</div>
              </button>
            ))}
        </div>

        {/* Editor */}
        {!draft ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#8a8175', border: '1px dashed #e2ddd3', borderRadius: 12 }}>
            Select an edition to edit, or create a new one.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
            {/* Left: form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {statusBadge(draft.status)}
                {sent && <span style={{ fontSize: 13, color: '#8a8175' }}>Sent to {draft.sent_count ?? 0} of {draft.recipients_count ?? 0}</span>}
                <span style={{ fontSize: 12, color: '#8a8175', marginLeft: 'auto' }}>{draft.theme_name}</span>
              </div>

              <label style={{ fontSize: 13, fontWeight: 600 }}>Subject
                <input value={draft.subject || ''} disabled={sent} onChange={(e) => patch('subject', e.target.value)} className="admin-input" style={{ width: '100%', marginTop: 4 }} />
              </label>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Headline
                <input value={draft.headline || ''} disabled={sent} onChange={(e) => patch('headline', e.target.value)} className="admin-input" style={{ width: '100%', marginTop: 4 }} />
              </label>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Intro
                <textarea value={draft.intro || ''} disabled={sent} onChange={(e) => patch('intro', e.target.value)} rows={3} className="admin-input" style={{ width: '100%', marginTop: 4, resize: 'vertical' }} />
              </label>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Featured pieces ({(draft.pieces || []).length})</span>
                  {!sent && <button className="admin-btn admin-btn--outline" onClick={() => setShowPicker((s) => !s)}>{showPicker ? 'Done' : '+ Add pieces'}</button>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                  {(draft.pieces || []).map((p) => (
                    <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, border: '1px solid #eee', borderRadius: 8 }}>
                      <img src={p.link} alt="" width={40} height={40} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, background: '#0b0b0b' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.description}</div>
                        <div style={{ fontSize: 12, color: '#b4965a' }}>{money(p.price)}</div>
                      </div>
                      {!sent && <button onClick={() => removePiece(p.name)} title="Remove" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#c0392b', fontSize: 18 }}>×</button>}
                    </div>
                  ))}
                </div>

                {showPicker && !sent && (
                  <div style={{ marginTop: 12, border: '1px solid #e2ddd3', borderRadius: 10, padding: 12 }}>
                    <input placeholder="Search pieces…" value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)} className="admin-input" style={{ width: '100%', marginBottom: 10 }} />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
                      {pickerResults.map((p) => (
                        <button key={p.name} onClick={() => addPiece(p)} title={`${p.description} — ${money(p.price)}`}
                          style={{ padding: 4, border: '1px solid #eee', borderRadius: 8, cursor: 'pointer', background: '#fff' }}>
                          <img src={p.link || p.image} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 4, background: '#0b0b0b' }} />
                          <div style={{ fontSize: 10, color: '#b4965a', marginTop: 2 }}>{money(p.price)}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ borderTop: '1px solid #eee', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {!sent && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="admin-btn admin-btn--primary" onClick={save} disabled={busy}>Save draft</button>
                    <button className="admin-btn admin-btn--outline admin-btn--danger" onClick={() => remove(draft.id)} disabled={busy || !draft.id}>Delete</button>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input placeholder="you@email.com" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} className="admin-input" style={{ flex: 1 }} />
                  <button className="admin-btn admin-btn--outline" onClick={doSendTest} disabled={busy}>Send test</button>
                </div>
                {!sent && (
                  confirmSend ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#fbf7ee', padding: 10, borderRadius: 8 }}>
                      <span style={{ fontSize: 13 }}>Send to all confirmed subscribers?</span>
                      <button className="admin-btn admin-btn--primary" onClick={doSendAll} disabled={busy}>{busy ? 'Sending…' : 'Yes, send'}</button>
                      <button className="admin-btn admin-btn--outline" onClick={() => setConfirmSend(false)} disabled={busy}>Cancel</button>
                    </div>
                  ) : (
                    <button className="admin-btn admin-btn--primary" onClick={() => { setError(null); setConfirmSend(true); }} disabled={busy || !draft.id}>Send to subscribers →</button>
                  )
                )}
              </div>
            </div>

            {/* Right: live preview */}
            <div>
              <div style={{ fontSize: 12, color: '#8a8175', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Live preview</div>
              <iframe title="Newsletter preview" srcDoc={previewHtml}
                style={{ width: '100%', height: 720, border: '1px solid #e2ddd3', borderRadius: 10, background: '#faf8f5' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
