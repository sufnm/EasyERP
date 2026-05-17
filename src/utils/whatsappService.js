import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let whatsappStatus = 'disconnected'; // 'disconnected' | 'connecting' | 'qr_ready' | 'authenticating' | 'ready'
let currentQrCode = null; // Base64 data URL

// We store the session persistently inside .wwebjs_auth inside the project folder
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: path.join(__dirname, '..', '..', '.wwebjs_auth')
  }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]
  }
});

export const getWhatsappStatus = () => {
  return {
    status: whatsappStatus,
    qr: currentQrCode
  };
};

export const initializeWhatsapp = () => {
  console.log('📡 [WHATSAPP] Initializing background programmatic engine...');
  whatsappStatus = 'connecting';

  client.on('qr', async (qr) => {
    console.log('🔑 [WHATSAPP] New pairing QR code generated!');
    try {
      whatsappStatus = 'qr_ready';
      // Convert raw QR string into a high-quality base64 image data URL!
      currentQrCode = await qrcode.toDataURL(qr, { margin: 2, scale: 6 });
    } catch (err) {
      console.error('❌ [WHATSAPP] QR conversion to Base64 failed:', err.message);
    }
  });

  client.on('authenticated', () => {
    console.log('✅ [WHATSAPP] Link credentials authenticated successfully!');
    whatsappStatus = 'authenticating';
    currentQrCode = null;
  });

  client.on('auth_failure', (msg) => {
    console.error('❌ [WHATSAPP] Auth failure details:', msg);
    whatsappStatus = 'disconnected';
    currentQrCode = null;
  });

  client.on('ready', () => {
    console.log('🟢 [WHATSAPP] Gateway engine is fully connected and ready!');
    whatsappStatus = 'ready';
    currentQrCode = null;
  });

  client.on('disconnected', (reason) => {
    console.log('🔴 [WHATSAPP] Link disconnected. Reason:', reason);
    whatsappStatus = 'disconnected';
    currentQrCode = null;
    // Re-initialize to offer new QR code pairing
    try {
      client.initialize();
    } catch (reInitErr) {
      console.error('⚠️ [WHATSAPP] Re-initialization failed:', reInitErr.message);
    }
  });

  // Catch unhandled connection/browser errors
  try {
    client.initialize().catch((initErr) => {
      console.error('❌ [WHATSAPP] Client initialize promise rejected:', initErr.message);
      whatsappStatus = 'disconnected';
    });
  } catch (err) {
    console.error('❌ [WHATSAPP] Direct Client launch failed:', err.message);
    whatsappStatus = 'disconnected';
  }
};

export const sendWhatsappMessageWithInvoice = async (phone, messageBody, pdfPath, pdfName) => {
  if (whatsappStatus !== 'ready') {
    throw new Error('WhatsApp Gateway is not active. Please scan the QR code first.');
  }

  // Format recipient phone number to whatsapp syntax
  // Example: 966501234567@c.us
  const formattedPhone = `${phone}@c.us`;

  console.log(`📡 [WHATSAPP] Programmatically sharing invoice with ${formattedPhone} in the background...`);

  let media = null;
  if (pdfPath && fs.existsSync(pdfPath)) {
    media = MessageMedia.fromFilePath(pdfPath);
    if (pdfName) {
      media.filename = pdfName;
    }
  }

  if (media) {
    // Send both text message caption and PDF attachment together!
    await client.sendMessage(formattedPhone, media, { caption: messageBody });
  } else {
    // Fallback: Send text body only if PDF fails
    await client.sendMessage(formattedPhone, messageBody);
  }

  console.log(`✅ [WHATSAPP] Programmatic delivery successfully dispatched to ${formattedPhone}`);
};

export const logoutWhatsapp = async () => {
  if (client) {
    try {
      console.log('📡 [WHATSAPP] Attempting to logout and destroy active session...');
      await client.logout();
      whatsappStatus = 'disconnected';
      currentQrCode = null;
      console.log('✅ [WHATSAPP] Session successfully destroyed and logged out.');
      return { success: true };
    } catch (err) {
      console.error('❌ [WHATSAPP] Failed to destroy active session safely:', err.message);
      // Fallback: force destruction and re-initialization
      try {
        await client.destroy();
      } catch (destroyErr) {
        console.error('⚠️ [WHATSAPP] client.destroy failed:', destroyErr.message);
      }
      whatsappStatus = 'disconnected';
      currentQrCode = null;
      // Re-initialize to offer new QR code pairing
      initializeWhatsapp();
      return { success: false, error: err.message };
    }
  }
  return { success: false, error: 'No active WhatsApp client' };
};

export { client as whatsappClient };
