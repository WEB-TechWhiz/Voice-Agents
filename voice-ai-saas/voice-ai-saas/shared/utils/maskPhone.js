// DPDP Act compliance — never log full phone numbers
const maskPhone = (phone) => {
  if (!phone) return 'unknown';
  const str = String(phone);
  return str.slice(0, -6).replace(/./g, '*') + str.slice(-6);
};
module.exports = { maskPhone };
