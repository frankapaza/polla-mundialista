import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const client = new pg.Client({
  host: '2600:1f14:90b:6001:adba:5024:2cb8:b9d5',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Mundial@2026#',
  ssl: { rejectUnauthorized: false },
})

async function run() {
  await client.connect()
  console.log('✅ Conectado a Supabase')

  for (const file of ['schema.sql', 'seed.sql']) {
    const sql = readFileSync(join(__dirname, '..', 'supabase', file), 'utf8')
    console.log(`⏳ Ejecutando ${file}...`)
    await client.query(sql)
    console.log(`✅ ${file} ejecutado`)
  }

  await client.end()
  console.log('🎉 Base de datos lista')
}

run().catch(err => { console.error('❌', err.message); process.exit(1) })
