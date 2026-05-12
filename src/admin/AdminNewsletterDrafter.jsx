import React, { useState } from 'react';
import { getAdminToken } from './api';

export default function AdminNewsletterDrafter() {
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('');
  const [audience, setAudience] = useState('');
  const [products, setProducts] = useState('');
  const [draft, setDraft] = useState(null);
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (topic.trim().length < 5) {
      setStatus({ state: 'error', message: 'Topic must be at least 5 characters.' });
      return;
    }
    setStatus({ state: 'loading', message: '' });
    setDraft(null);
    try {
      const res = await fetch('/api/draft-newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAdminToken() || ''}`,
        },
        body: JSON.stringify({ topic, tone, audience, products }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({ state: 'error', message: data.error || `Error ${res.status}` });
        return;
      }
      setDraft(data.draft);
      setStatus({ state: 'success', message: 'Draft ready. Review, edit, and copy below.' });
    } catch {
      setStatus({ state: 'error', message: 'Network error. Please try again.' });
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus({ state: 'success', message: 'Copied to clipboard.' });
    } catch {
      setStatus({ state: 'error', message: 'Could not copy.' });
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <div>
          <h1>Newsletter Drafter</h1>
          <p className="admin-page__subtitle">
            Tell Claude what you want to send. It returns a draft in Opal Gems voice that you review, edit, and then send via the <code>send-newsletter.mjs</code> script.
          </p>
        </div>
      </div>

      {status.state === 'error' && <div className="admin-alert admin-alert--error">{status.message}</div>}
      {status.state === 'success' && <div className="admin-alert admin-alert--success">{status.message}</div>}

      <form onSubmit={handleGenerate} className="admin-card" style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
        <div>
          <label style={labelStyle}>Topic <span style={{ color: '#c0392b' }}>*</span></label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. New tennis bracelet collection just arrived at Opal Sol — five pieces, prices from $4,500."
            rows={3}
            style={inputStyle}
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>Tone (optional)</label>
            <input
              type="text"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              placeholder="e.g. warm and intimate"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Audience segment (optional)</label>
            <input
              type="text"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g. existing customers near Clearwater"
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Products / details to feature (optional)</label>
          <textarea
            value={products}
            onChange={(e) => setProducts(e.target.value)}
            placeholder="e.g. emerald-cut diamond pendant, $8,200, in-store at Opal Grand. Lab diamonds in 14k white gold."
            rows={3}
            style={inputStyle}
          />
        </div>

        <div>
          <button
            type="submit"
            className="admin-btn admin-btn--primary"
            disabled={status.state === 'loading'}
          >
            {status.state === 'loading' ? 'Drafting…' : 'Generate draft'}
          </button>
        </div>
      </form>

      {draft && (
        <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={labelStyle}>Subject line</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={draft.subject}
                onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button onClick={() => copyToClipboard(draft.subject)} className="admin-btn admin-btn--outline" type="button">Copy</button>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Preheader (inbox preview text)</label>
            <input
              type="text"
              value={draft.preheader || ''}
              onChange={(e) => setDraft({ ...draft, preheader: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>HTML body</label>
            <textarea
              value={draft.html_body}
              onChange={(e) => setDraft({ ...draft, html_body: e.target.value })}
              rows={18}
              style={{ ...inputStyle, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 13 }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={() => copyToClipboard(draft.html_body)} className="admin-btn admin-btn--outline" type="button">Copy HTML</button>
              <button
                onClick={() => {
                  const blob = new Blob([draft.html_body], { type: 'text/html' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `newsletter-draft-${Date.now()}.html`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="admin-btn admin-btn--outline"
                type="button"
              >
                Download .html
              </button>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Live preview</label>
            <div
              style={{ border: '1px solid #e6e6e6', borderRadius: 8, padding: 24, background: '#faf8f5', overflow: 'auto', maxHeight: 480 }}
              dangerouslySetInnerHTML={{ __html: draft.html_body }}
            />
          </div>

          <div style={{ background: '#f4ede0', borderRadius: 8, padding: 16, fontSize: 13, color: '#5c4a2c', lineHeight: 1.6 }}>
            <strong>To send:</strong> save the HTML above to a file (e.g. <code>drafts/{new Date().toISOString().slice(0, 10)}.html</code>), then run from the project root:
            <pre style={{ background: '#fff', padding: 12, borderRadius: 4, marginTop: 8, overflow: 'auto' }}>
{`node scripts/send-newsletter.mjs \\
  --subject "${(draft.subject || '').replace(/"/g, '\\"')}" \\
  --preheader "${(draft.preheader || '').replace(/"/g, '\\"')}" \\
  --html drafts/${new Date().toISOString().slice(0, 10)}.html \\
  --dry-run`}
            </pre>
            Add <code>--location opal-grand</code> (or another value) to target a segment. Remove <code>--dry-run</code> when ready to send live.
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle = { display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#333' };
const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #ddd',
  borderRadius: 6,
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};
