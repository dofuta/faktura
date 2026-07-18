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
        postalCode: profile.postalCode,
        address: profile.address,
        email: profile.email,
        phone: profile.phone,
        registrationNumber: profile.registrationNumber,
        invoiceNotes: profile.invoiceNotes,
        bankName: profile.bankName,
        bankBranch: profile.bankBranch,
        bankAccountType: profile.bankAccountType,
        bankAccountNumber: profile.bankAccountNumber,
        bankAccountHolder: profile.bankAccountHolder,
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
