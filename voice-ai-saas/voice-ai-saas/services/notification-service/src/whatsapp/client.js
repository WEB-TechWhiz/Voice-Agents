const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const logger = require('../../../shared/utils/logger');

let client = null;
let isReady = false;

function initWhatsApp() {
  client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.whatsapp-session' }),
    puppeteer: {
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  });

  client.on('qr', (qr) => {
    logger.info('WhatsApp QR generated — scan with your phone');
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', () => {
    isReady = true;
    logger.info('WhatsApp client ready');
  });

  client.on('disconnected', () => {
    isReady = false;
    logger.warn('WhatsApp disconnected — will retry');
    setTimeout(initWhatsApp, 5000);
  });

  client.initialize();
}

async function sendFollowUp(phone, message) {
  if (!isReady) throw new Error('WhatsApp client not ready');
  // India: prefix 91, format: 919876543210@c.us
  const cleaned = phone.replace(/\D/g, '');
  const chatId  = cleaned.startsWith('91') ? `${cleaned}@c.us` : `91${cleaned}@c.us`;
  await client.sendMessage(chatId, message);
  logger.info('WhatsApp message sent', { chatId });
}

module.exports = { initWhatsApp, sendFollowUp };
