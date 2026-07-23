import { DEFAULT_OPENAI_MODEL, SETTING_KEYS, getSetting, hasSetting } from "@/lib/settings";
import { getCompanyProfile } from "@/server/company";
import { getDriveStatus } from "@/server/google";
import { SettingsView } from "./settings-view";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ drive?: string }>;
}) {
  const { drive } = await searchParams;
  const profile = await getCompanyProfile();
  const driveStatus = await getDriveStatus();

  return (
    <SettingsView
      company={{
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
        bankName: profile.bankName,
        bankNameEn: profile.bankNameEn,
        bankBranch: profile.bankBranch,
        bankBranchEn: profile.bankBranchEn,
        bankAccountType: profile.bankAccountType,
        bankAccountTypeEn: profile.bankAccountTypeEn,
        bankAccountNumber: profile.bankAccountNumber,
        bankAccountHolder: profile.bankAccountHolder,
        bankAccountHolderEn: profile.bankAccountHolderEn,
      }}
      openai={{
        hasKey: await hasSetting(SETTING_KEYS.openaiApiKey),
        model: (await getSetting(SETTING_KEYS.openaiModel)) ?? DEFAULT_OPENAI_MODEL,
      }}
      google={{
        clientId: (await getSetting(SETTING_KEYS.googleClientId)) ?? "",
        hasSecret: await hasSetting(SETTING_KEYS.googleClientSecret),
        connected: driveStatus.connected,
        callbackResult: drive,
      }}
    />
  );
}
