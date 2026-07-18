for (const file of [".env", ".env.local"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // ファイルがなければ無視
  }
}

async function main() {
  const { db, schema } = await import("../src/db");
  const { TENANT_ID } = await import("../src/lib/tenant");

  await db
    .insert(schema.tenants)
    .values({ id: TENANT_ID, name: "default" })
    .onConflictDoNothing();

  await db
    .insert(schema.companyProfiles)
    .values({ tenantId: TENANT_ID })
    .onConflictDoNothing();

  console.log("Seeded tenant:", TENANT_ID);
}

main().then(() => process.exit(0));
