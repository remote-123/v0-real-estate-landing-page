import postgres from 'postgres'

const url = process.env.DATABASE_URL
const directUrl = process.env.DATABASE_URL_DIRECT

console.log('Pooled URL present:', !!url)
console.log('Direct URL present:', !!directUrl)
console.log('Pooled host:', url?.match(/@([^/]+)\//)?.[1] ?? 'not found')
console.log('Direct host:', directUrl?.match(/@([^/]+)\//)?.[1] ?? 'not found')

async function test() {
  const sql = postgres(url!, { ssl: 'require' })
  try {
    const res = await sql`SELECT version()`
    console.log('Pooled connection: OK ✓', res[0].version.slice(0, 40))
  } catch (e: any) {
    console.log('Pooled connection FAILED:', e.message)
  }
  await sql.end()

  const sql2 = postgres(directUrl!, { ssl: 'require' })
  try {
    const res = await sql2`SELECT version()`
    console.log('Direct connection: OK ✓', res[0].version.slice(0, 40))
  } catch (e: any) {
    console.log('Direct connection FAILED:', e.message)
  }
  await sql2.end()
}

test().catch(console.error)
