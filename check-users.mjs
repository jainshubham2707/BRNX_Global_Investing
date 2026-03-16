import { neon } from '@neondatabase/serverless';

const sql = neon("postgresql://neondb_owner:npg_ZmbtGKQx97SN@ep-delicate-hall-anel4eo4-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require");

const rows = await sql`SELECT email, name, role, wallet_address, kyc_status, created_at FROM users ORDER BY created_at DESC`;
console.log(JSON.stringify(rows, null, 2));
