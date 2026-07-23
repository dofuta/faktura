import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { DocumentType, InvoiceLanguage } from "@/invoice/labels";
import type { CompanyDisplay } from "@/invoice/render";
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

// 発行時にスナップショットとして保存する、日英両言語を保持した自社情報。
export type CompanyProfileBilingual = {
  name: string;
  nameEn: string;
  postalCode: string;
  address: string;
  addressEn: string;
  email: string;
  phone: string;
  registrationNumber: string;
  invoiceNotes: string;
  invoiceNotesEn: string;
  quotationNotes: string;
  quotationNotesEn: string;
  deliveryNotes: string;
  deliveryNotesEn: string;
  bank: {
    name: string;
    nameEn: string;
    branch: string;
    branchEn: string;
    accountType: string;
    accountTypeEn: string;
    accountNumber: string;
    accountHolder: string;
    accountHolderEn: string;
  };
};

export function toCompanySnapshot(
  profile: Awaited<ReturnType<typeof getCompanyProfile>>,
): CompanyProfileBilingual {
  return {
    name: profile.name,
    nameEn: profile.nameEn,
    postalCode: profile.postalCode,
    address: profile.address,
    addressEn: profile.addressEn,
    email: profile.email,
    phone: profile.phone,
    registrationNumber: profile.registrationNumber,
    invoiceNotes: profile.invoiceNotes,
    invoiceNotesEn: profile.invoiceNotesEn,
    quotationNotes: profile.quotationNotes,
    quotationNotesEn: profile.quotationNotesEn,
    deliveryNotes: profile.deliveryNotes,
    deliveryNotesEn: profile.deliveryNotesEn,
    bank: {
      name: profile.bankName,
      nameEn: profile.bankNameEn,
      branch: profile.bankBranch,
      branchEn: profile.bankBranchEn,
      accountType: profile.bankAccountType,
      accountTypeEn: profile.bankAccountTypeEn,
      accountNumber: profile.bankAccountNumber,
      accountHolder: profile.bankAccountHolder,
      accountHolderEn: profile.bankAccountHolderEn,
    },
  };
}

// 英語値が空(旧スナップショットや未入力)なら日本語にフォールバックする。
function pickLanguage(
  ja: string | undefined,
  en: string | undefined,
  language: InvoiceLanguage,
): string {
  if (language === "en" && en?.trim()) {
    return en;
  }
  return ja ?? "";
}

function fixedNotesFor(
  snapshot: CompanyProfileBilingual,
  documentType: DocumentType,
): { ja: string; en: string } {
  switch (documentType) {
    case "quotation":
      return { ja: snapshot.quotationNotes, en: snapshot.quotationNotesEn };
    case "delivery":
      return { ja: snapshot.deliveryNotes, en: snapshot.deliveryNotesEn };
    default:
      return { ja: snapshot.invoiceNotes, en: snapshot.invoiceNotesEn };
  }
}

// 文書種別・取引先言語に応じて、表示用の単一言語スナップショットを作る。
// 見積書・納品書では振込先情報を含めない。
export function resolveCompanyForRender(
  snapshot: CompanyProfileBilingual,
  language: InvoiceLanguage,
  documentType: DocumentType,
): CompanyDisplay {
  const notes = fixedNotesFor(snapshot, documentType);
  const showBank = documentType === "invoice";

  return {
    name: pickLanguage(snapshot.name, snapshot.nameEn, language),
    postalCode: snapshot.postalCode,
    address: pickLanguage(snapshot.address, snapshot.addressEn, language),
    email: snapshot.email,
    phone: snapshot.phone,
    registrationNumber: snapshot.registrationNumber,
    fixedNotes: pickLanguage(notes.ja, notes.en, language),
    bank: showBank
      ? {
          name: pickLanguage(snapshot.bank.name, snapshot.bank.nameEn, language),
          branch: pickLanguage(snapshot.bank.branch, snapshot.bank.branchEn, language),
          accountType: pickLanguage(
            snapshot.bank.accountType,
            snapshot.bank.accountTypeEn,
            language,
          ),
          accountNumber: snapshot.bank.accountNumber,
          accountHolder: pickLanguage(
            snapshot.bank.accountHolder,
            snapshot.bank.accountHolderEn,
            language,
          ),
        }
      : { name: "", branch: "", accountType: "", accountNumber: "", accountHolder: "" },
  };
}
