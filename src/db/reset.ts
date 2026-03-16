import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import {
  users,
  issuers,
  tokens,
  transactions,
  instantPayRequests,
  portfolio,
  onchainTransactions,
} from "./schema";

async function reset() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle({ client: sql });

  console.log("Clearing all data...");

  // Delete in order (foreign key deps)
  await db.delete(onchainTransactions);
  await db.delete(instantPayRequests);
  await db.delete(portfolio);
  await db.delete(transactions);
  await db.delete(tokens);
  await db.delete(issuers);
  await db.delete(users);

  console.log("All tables cleared.");

  // Re-seed with updated data
  console.log("Re-seeding...");

  // Create issuer user
  const [issuerUser] = await db
    .insert(users)
    .values({
      privyId: "issuer-atlas-capital",
      email: "shubham@mvplabs.build",
      name: "Atlas Capital Partners",
      role: "issuer",
      kycStatus: "approved",
    })
    .onConflictDoNothing()
    .returning();

  const issuerUserId = issuerUser?.id;

  if (issuerUserId) {
    const [issuer] = await db
      .insert(issuers)
      .values({
        userId: issuerUserId,
        companyName: "Atlas Capital Partners",
        kybStatus: "approved",
        kybProvider: "bridge",
      })
      .returning();

    // Updated tokens: $2.50 Manhattan, $1.00 US Treasury, 100M supply each
    await db.insert(tokens).values([
      {
        name: "Manhattan Commercial Real Estate Fund",
        description:
          "Fractional ownership in a portfolio of Class-A commercial properties in Manhattan, NYC. Quarterly yield distributions with projected 8-12% annual returns.",
        priceUsd: "2.50",
        issuerId: issuer.id,
        totalSupply: 100000000,
        soldCount: 0,
      },
      {
        name: "US Treasury Bond Fund Token",
        description:
          "Tokenized exposure to short-duration US Treasury bonds. Low risk, stable returns, fully backed by US government securities.",
        priceUsd: "1.00",
        issuerId: issuer.id,
        totalSupply: 100000000,
        soldCount: 0,
      },
    ]);
  }

  // Create admin user
  await db
    .insert(users)
    .values({
      privyId: "admin-borderless",
      email: "shubham@borderless.world",
      name: "Shubham (Admin)",
      role: "admin",
      kycStatus: "approved",
    })
    .onConflictDoNothing();

  console.log("Reset complete!");
  console.log("  - Manhattan Commercial Real Estate Fund: $2.50/token, 100M supply");
  console.log("  - US Treasury Bond Fund Token: $1.00/token, 100M supply");
}

reset().catch(console.error);
