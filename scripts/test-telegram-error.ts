import { sendTelegramError } from '../lib/telegram';

async function main() {
  await sendTelegramError(
    '/api/ai-blog-generator',
    'Test ping',
    new Error('This is a test error alert — ignore'),
    { subject: 'Test Gmail subject: Dubai Yield Report' }
  );
  console.log('✅ Test ping sent');
}

main();
