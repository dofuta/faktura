"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { InvoiceFormValues } from "@/invoice/formSchema";
import { calculateTotals, formatYen } from "@/invoice/totals";
import { deleteInvoiceAction, issueInvoiceAction, updateDraftAction } from "../actions";
import { DocumentExportRow } from "./document-export-row";

const TAX_RATES = [
  { value: "0.1", label: "10%" },
  { value: "0.08", label: "8%" },
  { value: "0", label: "0%" },
];

export function InvoiceEditor({
  invoiceId,
  clients,
  initial,
}: {
  invoiceId: number;
  clients: { id: number; name: string }[];
  initial: InvoiceFormValues;
}) {
  const router = useRouter();
  const [values, setValues] = useState<InvoiceFormValues>(initial);
  const [busy, setBusy] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(0);

  const totals = calculateTotals(values.items);

  const setItem = (
    index: number,
    patch: Partial<InvoiceFormValues["items"][number]>,
  ) => {
    setValues({
      ...values,
      items: values.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    });
  };

  const save = async (): Promise<boolean> => {
    setBusy(true);
    const result = await updateDraftAction(invoiceId, values);
    setBusy(false);
    if (result.error) {
      toast.error(result.error);
      return false;
    }
    setPreviewVersion((v) => v + 1);
    return true;
  };

  const issue = async () => {
    if (!(await save())) {
      return;
    }
    if (!confirm(`合計 ${formatYen(totals.total)} で発行しますか?`)) {
      return;
    }
    setBusy(true);
    const result = await issueInvoiceAction(invoiceId);
    setBusy(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    if (result.warning) {
      toast.warning(result.warning);
    } else {
      toast.success("発行しました");
    }
    router.refresh();
  };

  const remove = async () => {
    if (!confirm("このドラフトを削除しますか?")) {
      return;
    }
    setBusy(true);
    const result = await deleteInvoiceAction(invoiceId);
    setBusy(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    router.push("/");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">ドラフト編集</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={remove} disabled={busy}>
              削除
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (await save()) {
                  toast.success("保存しました");
                }
              }}
              disabled={busy}
            >
              保存
            </Button>
            <Button size="sm" onClick={issue} disabled={busy}>
              発行
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 rounded-md border p-3">
          <DocumentExportRow invoiceId={invoiceId} documentType="quotation" beforeGenerate={save} />
          <DocumentExportRow invoiceId={invoiceId} documentType="delivery" beforeGenerate={save} />
        </div>

        <div className="space-y-1.5">
          <Label>取引先</Label>
          <Select
            items={Object.fromEntries(clients.map((c) => [String(c.id), c.name]))}
            value={String(values.clientId)}
            onValueChange={(v) => setValues({ ...values, clientId: Number(v) })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={String(client.id)}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>件名</Label>
          <Input
            value={values.title}
            onChange={(e) => setValues({ ...values, title: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>発行日</Label>
            <Input
              type="date"
              value={values.issueDate}
              onChange={(e) => setValues({ ...values, issueDate: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>支払期限</Label>
            <Input
              type="date"
              value={values.dueDate}
              onChange={(e) => setValues({ ...values, dueDate: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>明細</Label>
          {values.items.map((item, index) => (
            <div key={index} className="flex items-start gap-2">
              <Input
                className="flex-1"
                placeholder="品目"
                value={item.description}
                onChange={(e) => setItem(index, { description: e.target.value })}
              />
              <Input
                className="w-28"
                type="number"
                placeholder="単価"
                value={item.unitPrice === 0 ? "" : item.unitPrice}
                onChange={(e) => setItem(index, { unitPrice: Number(e.target.value) || 0 })}
              />
              <Input
                className="w-20"
                type="number"
                placeholder="数量"
                value={item.quantity}
                onChange={(e) => setItem(index, { quantity: Number(e.target.value) || 0 })}
              />
              <Select
                items={Object.fromEntries(TAX_RATES.map((r) => [r.value, r.label]))}
                value={String(item.taxRate)}
                onValueChange={(v) => setItem(index, { taxRate: Number(v) })}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAX_RATES.map((rate) => (
                    <SelectItem key={rate.value} value={rate.value}>
                      {rate.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                disabled={values.items.length <= 1}
                onClick={() =>
                  setValues({
                    ...values,
                    items: values.items.filter((_, i) => i !== index),
                  })
                }
              >
                ✕
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setValues({
                ...values,
                items: [
                  ...values.items,
                  { description: "", unitPrice: 0, quantity: 1, taxRate: 0.1 },
                ],
              })
            }
          >
            行を追加
          </Button>
        </div>

        <div className="space-y-1.5">
          <Label>備考</Label>
          <Textarea
            rows={3}
            value={values.notes}
            onChange={(e) => setValues({ ...values, notes: e.target.value })}
          />
        </div>

        <div className="rounded-md border p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">小計</span>
            <span>{formatYen(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">消費税</span>
            <span>{formatYen(totals.taxAmount)}</span>
          </div>
          <div className="mt-1 flex justify-between font-semibold">
            <span>合計</span>
            <span>{formatYen(totals.total)}</span>
          </div>
        </div>
      </div>

      <div className="min-h-[600px]">
        <iframe
          key={previewVersion}
          src={`/invoices/${invoiceId}/preview?v=${previewVersion}`}
          className="h-full min-h-[600px] w-full rounded-md border bg-white"
          title="プレビュー"
        />
      </div>
    </div>
  );
}
