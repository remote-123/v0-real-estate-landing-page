
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function listTopics() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_GROUP_CHAT_ID;
    
    if (!token || !chatId) {
        console.error('Missing token or group chat id');
        return;
    }
    
    console.log(`Checking topics for Group ID: ${chatId}`);
    
    try {
        const response = await fetch(`https://api.telegram.org/bot${token}/getForumTopicIconStickers`);
        // Note: There isn't a direct getForumTopics in the basic Bot API without searching, 
        // but we can try to get chat details which might contain forum info.
        
        // Actually, let's just try to send a message to various IDs to see what sticks or list messages? 
        // No, the best way to get topics is getForumTopicIconStickers is just for stickers.
        
        // Let's try something else. We can't actually "list" topics easily via Bot API 
        // without a specific method. 
        // Ah, the method is getChat which might show if it's a forum.
        
        const chatRes = await fetch(`https://api.telegram.org/bot${token}/getChat?chat_id=${chatId}`);
        const chatData = await chatRes.json();
        console.log('Chat Details:', JSON.stringify(chatData, null, 2));

    } catch (err) {
        console.error('Failed to get chat details:', err);
    }
}

listTopics();
