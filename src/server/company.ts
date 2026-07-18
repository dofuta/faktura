import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { CompanySnapshot } from "@/invoice/render";
import { TENANT_ID } from "@/lib/tenant";

export async function getCompanyProfile() {
  const rows = await db
    .select()
    .from(schema.companyProfiles)
    .where(eq(schema.companyProfiles.tenantId, TENANT_ID));

  if (rows[0]) {
    return rows[0];
  }

  await db
    .insert(schema.companyProfiles)
    .values({ tenantId: TENANT_ID })
    .onConflictDoNothing();

  const created = await db
    .select()
    .from(schema.companyProfiles)
    .where(eq(schema.companyProfiles.tenantId, TENANT_ID));
  return created[0];
}

export function toCompanySnapshot(
  profile: Awaited<ReturnType<typeof getCompanyProfile>>,
): CompanySnapshot {
  return {
    name: profile.name,
    postalCode: profile.postalCode,
    address: profile.address,
    email: profile.email,
    phone: profile.phone,
    registrationNumber: profile.registrationNumber,
    invoiceNotes: profile.invoiceNotes,
    bank: {
      name: profile.bankName,
      branch: profile.bankBranch,
      accountType: profile.bankAccountType,
      accountNumber: profile.bankAccountNumber,
      accountHolder: profile.bankAccountHolder,
    },
  };
}
