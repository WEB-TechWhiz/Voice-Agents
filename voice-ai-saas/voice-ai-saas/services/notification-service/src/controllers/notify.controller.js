const { sendFollowUp } = require('../whatsapp/client');
const logger = require('../../../shared/utils/logger');
const { maskPhone } = require('../../../shared/utils/maskPhone');

function buildMessage(lead) {
  return `Namaste ${lead.name || ''}! 🙏

Humne aapka call receive kiya. Shukriya humse sampark karne ke liye.

📋 Aapki query: ${lead.intent?.replace(/_/g, ' ')}
🏢 Hum jald hi aapse sampark karenge.

Koi bhi sawaal ho toh is number pe reply karein.

— Muffincodes Team`;
}

exports.sendFollowUp = async (req, res) => {
  const { phone, lead } = req.body;
  if (!phone || !lead) return res.status(400).json({ error: 'phone and lead required' });

  try {
    const message = buildMessage(lead);
    await sendFollowUp(phone, message);
    logger.info('Follow-up sent', { phone: maskPhone(phone) });
    return res.json({ success: true, message: 'WhatsApp message sent' });
  } catch (err) {
    logger.error('Follow-up failed', { phone: maskPhone(phone), err: err.message });
    return res.status(500).json({ success: false, error: err.message });
  }
};
