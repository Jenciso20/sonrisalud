const WABA_TOKEN = process.env.WHATSAPP_TOKEN || '';
const WABA_PHONE_ID = process.env.WHATSAPP_PHONE_ID || '';
const WABA_API = (process.env.WHATSAPP_API_BASE || 'https://graph.facebook.com/v18.0').replace(/\/$/, '');

function ensureConfigured() {
  if (!WABA_TOKEN || !WABA_PHONE_ID) {
    throw new Error('WhatsApp Cloud API no configurado (WHATSAPP_TOKEN / WHATSAPP_PHONE_ID)');
  }
}

export function formatE164(raw) {
  if (!raw) return null;
  let s = String(raw).replace(/\D/g, '');
  if (!s) return null;
  if (s.startsWith('0')) s = s.replace(/^0+/, '');
  // Si ya incluye código de país (11-15 dígitos), asumimos E.164
  if (s.length >= 11) return `+${s}`;
  // Por defecto Peru (+51) si es un número local de 9 dígitos
  if (s.length === 9) return `+51${s}`;
  // Como fallback, anteponer +
  return `+${s}`;
}

export async function sendTemplate(toE164, templateName, lang = 'es') {
  ensureConfigured();
  const url = `${WABA_API}/${WABA_PHONE_ID}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    to: toE164,
    type: 'template',
    template: {
      name: templateName,
      language: { code: lang },
    },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WABA_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(`WhatsApp API error: ${res.status}`);
    err.details = json;
    throw err;
  }
  return json;
}

export async function sendText(toE164, text) {
  ensureConfigured();
  const url = `${WABA_API}/${WABA_PHONE_ID}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    to: toE164,
    type: 'text',
    text: { body: text.slice(0, 4096) },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WABA_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(`WhatsApp API error: ${res.status}`);
    err.details = json;
    throw err;
  }
  return json;
}

