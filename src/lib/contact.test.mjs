import { CONTACT_MESSAGE, digitsOf, formatPhone, whatsappLink } from './contact.js';
let passed = 0, failed = 0;
const check = (label, ok, extra) => { if (ok) { passed++; console.log('PASS:', label); } else { failed++; console.log('FAIL:', label, extra ?? ''); } };

check('the number is shown the way it is read', formatPhone('94717150111') === '+94 71 715 0111' && formatPhone('+94 71 715 0111') === '+94 71 715 0111' && formatPhone('+94-71-715-0111') === '+94 71 715 0111');
check('a number from another country just gets a plus', formatPhone('447911123456') === '+447911123456');
check('nothing in, nothing out', formatPhone('') === '' && formatPhone(undefined) === '' && whatsappLink('', 'hi') === '' && whatsappLink(null) === '');
check('only the digits count', digitsOf('+94 (71) 715-0111') === '94717150111');
check('the WhatsApp address is wa.me with the number and no plus', whatsappLink('+94 71 715 0111').startsWith('https://wa.me/94717150111') && !whatsappLink('94717150111').includes('+'));
check('the message is written out and safe to put in an address', whatsappLink('94717150111', 'Hi, can we talk? 100% & more') === 'https://wa.me/94717150111?text=Hi%2C%20can%20we%20talk%3F%20100%25%20%26%20more');
check('with no message there is no ?text=', whatsappLink('94717150111') === 'https://wa.me/94717150111');
const link = whatsappLink('94717150111', CONTACT_MESSAGE);
check('the real message reads back exactly', decodeURIComponent(link.split('?text=')[1]) === CONTACT_MESSAGE && CONTACT_MESSAGE.includes('ScoreIt'));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
