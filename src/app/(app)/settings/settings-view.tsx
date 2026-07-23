"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  disconnectDriveAction,
  saveCompanyAction,
  saveGoogleClientAction,
  saveOpenAiAction,
  type CompanyFormValues,
} from "./actions";

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function NotesField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function SettingsView({
  company: initialCompany,
  openai: initialOpenai,
  google,
}: {
  company: CompanyFormValues;
  openai: { hasKey: boolean; model: string };
  google: {
    clientId: string;
    hasSecret: boolean;
    connected: boolean;
    callbackResult?: string;
  };
}) {
  const router = useRouter();
  const [company, setCompany] = useState(initialCompany);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(initialOpenai.model);
  const [googleClientId, setGoogleClientId] = useState(google.clientId);
  const [googleClientSecret, setGoogleClientSecret] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (google.callbackResult === "connected") {
      toast.success("Google Driveを接続しました");
      router.replace("/settings");
    } else if (google.callbackResult === "error") {
      toast.error("Google Drive接続に失敗しました");
      router.replace("/settings");
    }
  }, [google.callbackResult, router]);

  const set = (patch: Partial<CompanyFormValues>) =>
    setCompany({ ...company, ...patch });

  const run = async (action: () => Promise<{ error?: string }>, message: string) => {
    setBusy(true);
    const result = await action();
    setBusy(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(message);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">設定</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">自社情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="登録番号(適格請求書)"
              value={company.registrationNumber}
              onChange={(v) => set({ registrationNumber: v })}
            />
            <Field
              label="郵便番号"
              value={company.postalCode}
              onChange={(v) => set({ postalCode: v })}
            />
            <Field label="メール" value={company.email} onChange={(v) => set({ email: v })} />
            <Field label="電話" value={company.phone} onChange={(v) => set({ phone: v })} />
            <Field
              label="口座番号"
              value={company.bankAccountNumber}
              onChange={(v) => set({ bankAccountNumber: v })}
            />
          </div>

          <Separator />

          <Tabs defaultValue="ja">
            <TabsList>
              <TabsTrigger value="ja">日本語</TabsTrigger>
              <TabsTrigger value="en">English</TabsTrigger>
            </TabsList>

            <TabsContent value="ja" className="space-y-4 pt-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="社名" value={company.name} onChange={(v) => set({ name: v })} />
                <Field
                  label="住所"
                  value={company.address}
                  onChange={(v) => set({ address: v })}
                />
              </div>
              <NotesField
                label="請求書の固定備考"
                value={company.invoiceNotes}
                onChange={(v) => set({ invoiceNotes: v })}
              />
              <NotesField
                label="見積書の固定備考"
                value={company.quotationNotes}
                onChange={(v) => set({ quotationNotes: v })}
              />
              <NotesField
                label="納品書の固定備考"
                value={company.deliveryNotes}
                onChange={(v) => set({ deliveryNotes: v })}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="銀行名"
                  value={company.bankName}
                  onChange={(v) => set({ bankName: v })}
                />
                <Field
                  label="支店名"
                  value={company.bankBranch}
                  onChange={(v) => set({ bankBranch: v })}
                />
                <Field
                  label="口座種別"
                  value={company.bankAccountType}
                  onChange={(v) => set({ bankAccountType: v })}
                />
                <Field
                  label="口座名義"
                  value={company.bankAccountHolder}
                  onChange={(v) => set({ bankAccountHolder: v })}
                />
              </div>
            </TabsContent>

            <TabsContent value="en" className="space-y-4 pt-3">
              <p className="text-xs text-muted-foreground">
                未入力の項目は請求書PDFで日本語の内容が使われます。
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Company Name"
                  value={company.nameEn}
                  onChange={(v) => set({ nameEn: v })}
                />
                <Field
                  label="Address"
                  value={company.addressEn}
                  onChange={(v) => set({ addressEn: v })}
                />
              </div>
              <NotesField
                label="Invoice Notes"
                value={company.invoiceNotesEn}
                onChange={(v) => set({ invoiceNotesEn: v })}
              />
              <NotesField
                label="Quotation Notes"
                value={company.quotationNotesEn}
                onChange={(v) => set({ quotationNotesEn: v })}
              />
              <NotesField
                label="Delivery Notes"
                value={company.deliveryNotesEn}
                onChange={(v) => set({ deliveryNotesEn: v })}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Bank Name"
                  value={company.bankNameEn}
                  onChange={(v) => set({ bankNameEn: v })}
                />
                <Field
                  label="Branch Name"
                  value={company.bankBranchEn}
                  onChange={(v) => set({ bankBranchEn: v })}
                />
                <Field
                  label="Account Type"
                  value={company.bankAccountTypeEn}
                  onChange={(v) => set({ bankAccountTypeEn: v })}
                />
                <Field
                  label="Account Holder"
                  value={company.bankAccountHolderEn}
                  onChange={(v) => set({ bankAccountHolderEn: v })}
                />
              </div>
            </TabsContent>
          </Tabs>

          <Button
            disabled={busy}
            onClick={() => run(() => saveCompanyAction(company), "自社情報を保存しました")}
          >
            保存
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            OpenAI
            {initialOpenai.hasKey ? (
              <Badge variant="secondary">設定済み</Badge>
            ) : (
              <Badge variant="outline">未設定</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="APIキー"
              type="password"
              value={apiKey}
              placeholder={initialOpenai.hasKey ? "(変更する場合のみ入力)" : "sk-..."}
              onChange={setApiKey}
            />
            <Field label="モデル" value={model} onChange={setModel} />
          </div>
          <Button
            disabled={busy}
            onClick={() =>
              run(() => saveOpenAiAction({ apiKey, model }), "OpenAI設定を保存しました")
            }
          >
            保存
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Google Drive
            {google.connected ? (
              <Badge variant="secondary">接続済み</Badge>
            ) : (
              <Badge variant="outline">未接続</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="OAuthクライアントID"
              value={googleClientId}
              onChange={setGoogleClientId}
            />
            <Field
              label="OAuthクライアントシークレット"
              type="password"
              value={googleClientSecret}
              placeholder={google.hasSecret ? "(変更する場合のみ入力)" : ""}
              onChange={setGoogleClientSecret}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                run(
                  () =>
                    saveGoogleClientAction({
                      clientId: googleClientId,
                      clientSecret: googleClientSecret,
                    }),
                  "Google設定を保存しました",
                )
              }
            >
              保存
            </Button>
            {google.connected ? (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => run(() => disconnectDriveAction(), "接続を解除しました")}
              >
                接続解除
              </Button>
            ) : (
              <Button
                disabled={busy || !google.clientId || !google.hasSecret}
                nativeButton={false}
                render={<a href="/api/google/start" />}
              >
                Driveを接続
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
