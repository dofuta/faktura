import { and, eq } from "drizzle-orm";
import { format } from "date-fns";
import { db, schema } from "@/db";
import { TENANT_ID } from "@/lib/tenant";

export async function reserveInvoiceNumber(date: Date): Promise<string> {
  const period = format(date, "yyyyMM");

  const next = await db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(schema.invoiceSequences)
      .where(
        and(
          eq(schema.invoiceSequences.tenantId, TENANT_ID),
          eq(schema.invoiceSequences.period, period),
        ),
      );

    const value = (rows[0]?.lastNumber ?? 0) + 1;

    await tx
      .insert(schema.invoiceSequences)
      .values({ tenantId: TENANT_ID, period, lastNumber: value })
      .onConflictDoUpdate({
        target: [schema.invoiceSequences.tenantId, schema.invoiceSequences.period],
        set: { lastNumber: value },
      });

    return value;
  });

  return `${period}-${String(next).padStart(3, "0")}`;
}
