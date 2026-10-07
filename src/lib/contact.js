// How a new venue gets in touch: WhatsApp, with a message already written.
const DEFAULT_NUMBER = '94717150111';

export function digitsOf(number) {
  return String(number || '').replace(/\D/g, '');
}

// "94717150111" -> "+94 71 715 0111". Other countries just get a plus in front.
export function formatPhone(number) {
  const n = digitsOf(number);
  if (n.length === 11 && n.startsWith('94')) return `+94 ${n.slice(2, 4)} ${n.slice(4, 7)} ${n.slice(7)}`;
  return n ? `+${n}` : '';
}

export function whatsappLink(number, message) {
  const n = digitsOf(number);
  if (!n) return '';
  return `https://wa.me/${n}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

export const CONTACT_MESSAGE = "Hi ScoreIt, I'd like to run a tournament with ScoreIt. Can we talk?";

export function contactNumber() {
  return digitsOf(import.meta.env.VITE_WHATSAPP_NUMBER) || DEFAULT_NUMBER;
}
