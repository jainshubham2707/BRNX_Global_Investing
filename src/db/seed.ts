import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { users, issuers, tokens } from "./schema";

async function seed() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle({ client: sql });

  console.log("Seeding database...");

  // Create issuer user
  const [issuerUser] = await db.insert(users).values({
    privyId: "issuer-atlas-capital",
    email: "shubham@mvplabs.build",
    name: "Atlas Capital Partners",
    role: "issuer",
    kycStatus: "approved",
  }).onConflictDoNothing().returning();

  const issuerUserId = issuerUser?.id;

  if (issuerUserId) {
    // Create issuer record
    const [issuer] = await db.insert(issuers).values({
      userId: issuerUserId,
      companyName: "Atlas Capital Partners",
      kybStatus: "approved",
      kybProvider: "bridge",
    }).returning();

    // Create demo tokens
    await db.insert(tokens).values([
      {
        name: "Manhattan Commercial Real Estate Fund",
        description: "Fractional ownership in a portfolio of Class-A commercial properties in Manhattan, NYC. Quarterly yield distributions with projected 8-12% annual returns.",
        priceUsd: "2.50",
        issuerId: issuer.id,
        totalSupply: 100000000,
        soldCount: 0,
      },
      {
        name: "US Treasury Bond Fund Token",
        description: "Tokenized exposure to short-duration US Treasury bonds. Low risk, stable returns, fully backed by US government securities.",
        priceUsd: "1.00",
        issuerId: issuer.id,
        totalSupply: 100000000,
        soldCount: 0,
      },
    ]);
  }

  // Create admin user
  await db.insert(users).values({
    privyId: "admin-borderless",
    email: "shubham@borderless.world",
    name: "Shubham (Admin)",
    role: "admin",
    kycStatus: "approved",
  }).onConflictDoNothing();

  console.log("Seed complete!");
}

seed().catch(console.error);
