import { neon } from '@neondatabase/serverless';

const sql = neon("postgresql://neondb_owner:npg_ZmbtGKQx97SN@ep-delicate-hall-anel4eo4-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require");

await sql`UPDATE users SET role = 'admin', name = 'Shubham (Admin)' WHERE email = 'shubham@borderless.world'`;
console.log("Updated shubham@borderless.world to admin role");

const rows = await sql`SELECT email, role, wallet_address FROM users WHERE email = 'shubham@borderless.world'`;
console.log(JSON.stringify(rows, null, 2));
