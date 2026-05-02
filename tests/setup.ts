// Global test environment setup
// Sets env vars before any module is imported so initialisation-time reads work

process.env.DATABASE_URL = 'postgres://test@localhost/test_db'
process.env.TELEGRAM_BOT_TOKEN = 'test-token'
process.env.TELEGRAM_CHAT_ID = '-100000000'
process.env.CRON_SECRET = 'test-secret'
process.env.ADMIN_PASSCODE = 'test-passcode'
process.env.NEXT_PUBLIC_SITE_URL = 'https://www.northcapitaldxb.com'
