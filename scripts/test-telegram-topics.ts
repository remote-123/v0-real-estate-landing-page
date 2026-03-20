
import { sendTelegram } from '../lib/telegram';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function test() {
    console.log('TELEGRAM_GROUP_CHAT_ID:', process.env.TELEGRAM_GROUP_CHAT_ID);
    console.log('TELEGRAM_CHAT_ID:', process.env.TELEGRAM_CHAT_ID);
    console.log('TELEGRAM_THREAD_ID_REDDIT:', process.env.TELEGRAM_THREAD_ID_REDDIT);
    
    await sendTelegram("Test message for Reddit topic", process.env.TELEGRAM_THREAD_ID_REDDIT);
    console.log('Sent test message to Reddit topic');
}

test();
