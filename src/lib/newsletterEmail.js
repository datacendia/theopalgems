// Renders a biweekly "Seasonal Edit" newsletter to email-safe HTML.
// Shared by the admin live preview and the Netlify send function so the
// preview is byte-identical to what subscribers receive.
//
// Email-safe: table layout, inline styles, absolute image URLs. The brand
// serif (Cormorant Garamond) falls back to Georgia in email clients.

const GOLD = '#b4965a';
const INK = '#1a1a1a';

function money(v) {
  const n = Number(String(v ?? '').replace(/[^0-9.]/g, ''));
  return isNaN(n) || n === 0 ? '' : `$${Math.round(n).toLocaleString()}`;
}

function absUrl(src, siteUrl) {
  if (!src) return '';
  return /^https?:\/\//.test(src) ? src : `${siteUrl}${src.startsWith('/') ? '' : '/'}${src}`;
}

function waLink(desc, number) {
  const msg = encodeURIComponent(`Hi! I'm interested in the ${desc} from your latest email. Can you tell me more about it?`);
  return `https://wa.me/${number}?text=${msg}`;
}

function pieceCard(p, { siteUrl, whatsappNumber }) {
  const img = absUrl(p.link || p.image, siteUrl);
  const name = p.description || p.name || '';
  const price = money(p.price);
  return `
    <td width="50%" valign="top" style="padding:8px;">
      <a href="${waLink(name, whatsappNumber)}" style="text-decoration:none;color:${INK};display:block;">
        <img src="${img}" alt="${name}" width="262" style="width:100%;max-width:262px;display:block;border:0;border-radius:6px;background:#0b0b0b;" />
        <div style="padding:12px 2px 4px;font-family:'Cormorant Garamond',Georgia,serif;">
          <div style="font-size:17px;line-height:1.3;color:${INK};">${name}</div>
          ${price ? `<div style="font-size:16px;font-weight:600;color:${GOLD};margin-top:4px;">${price}</div>` : ''}
        </div>
      </a>
    </td>`;
}

function pieceRows(pieces, opts) {
  let rows = '';
  for (let i = 0; i < pieces.length; i += 2) {
    const left = pieceCard(pieces[i], opts);
    const right = pieces[i + 1] ? pieceCard(pieces[i + 1], opts) : '<td width="50%">&nbsp;</td>';
    rows += `<tr>${left}${right}</tr>`;
  }
  return rows;
}

/**
 * @param {object} o
 * @param {string} o.themeName   e.g. "Summer Escapes"
 * @param {string} o.headline
 * @param {string} o.intro
 * @param {Array}  o.pieces      catalog items ({name, link/image, description, price})
 * @param {string} [o.siteUrl]
 * @param {string} [o.unsubscribeUrl]
 * @param {string} [o.whatsappNumber]
 */
export function newsletterEmailHtml({
  themeName = '',
  headline = '',
  intro = '',
  pieces = [],
  siteUrl = 'https://theopalgems.com',
  unsubscribeUrl = '#',
  whatsappNumber = '+15612519560',
}) {
  const opts = { siteUrl, whatsappNumber };
  return `
  <div style="background:#faf8f5;margin:0;padding:0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f5;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;">
        <!-- Header -->
        <tr><td align="center" style="padding:36px 32px 8px;">
          <div style="font-family:'Cormorant Garamond',Georgia,serif;font-weight:500;letter-spacing:0.1em;font-size:26px;color:${INK};">OPAL GEMS</div>
          <div style="letter-spacing:0.25em;font-size:10px;color:${GOLD};margin-top:8px;text-transform:uppercase;">Elevated Diamonds, In Person</div>
        </td></tr>
        <!-- Theme + headline -->
        <tr><td align="center" style="padding:24px 40px 0;">
          ${themeName ? `<div style="letter-spacing:0.22em;font-size:11px;color:${GOLD};text-transform:uppercase;margin-bottom:14px;">${themeName}</div>` : ''}
          <h1 style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-weight:400;font-size:28px;line-height:1.25;color:${INK};">${headline}</h1>
          <p style="margin:16px 0 0;font-family:Georgia,serif;font-size:15px;line-height:1.7;color:#4a4a4a;">${intro}</p>
        </td></tr>
        <!-- Pieces -->
        <tr><td style="padding:24px 24px 8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${pieceRows(pieces, opts)}
          </table>
        </td></tr>
        <!-- CTA -->
        <tr><td align="center" style="padding:16px 32px 40px;">
          <a href="${siteUrl}/book" style="display:inline-block;padding:14px 34px;background:${GOLD};color:#ffffff;text-decoration:none;letter-spacing:0.1em;font-size:13px;text-transform:uppercase;border-radius:50px;font-family:Georgia,serif;">Book an appointment</a>
          <p style="margin:18px 0 0;font-family:Georgia,serif;font-size:13px;color:#888;">Every piece is available to try on at our Florida boutiques.</p>
        </td></tr>
        <!-- Footer -->
        <tr><td align="center" style="padding:24px 32px 32px;border-top:1px solid #eee;">
          <p style="margin:0;font-family:Georgia,serif;font-size:12px;color:#999;line-height:1.7;">
            Opal Gems · 10 N Ocean Blvd, Delray Beach, FL 33483<br/>
            You’re receiving this because you subscribed at theopalgems.com.<br/>
            <a href="${unsubscribeUrl}" style="color:#999;text-decoration:underline;">Unsubscribe</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
  </div>`;
}
