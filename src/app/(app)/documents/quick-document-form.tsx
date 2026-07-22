"use client";

import { addDays, format } from "date-fns";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
import type { QuickDocumentFormValues, QuickDocumentType } from "@/invoice/documentFormSchema";
import { calculateTotals, formatYen } from "@/invoice/totals";

const TAX_RATES = [
  { value: "0.1", label: "10%" },
  { value: "0.08", label: "8%" },
  { value: "0", label: "0%" },
];

const DOCUMENT_TYPES: { value: QuickDocumentType; label: string }[] = [
  { value: "quotation", label: "見積書" },
  { value: "delivery", label: "納品書" },
];

const SECOND_DATE_LABEL: Record<QuickDocumentType, string> = {
  quotation: "有効期限",
  delivery: "納品日",
};

function defaultSecondDate(documentType: QuickDocumentType, issueDate: string): string {
  const base = issueDate ? new Date(issueDate) : new Date();
  return documentType === "quotation"
    ? format(addDays(base, 30), "yyyy-MM-dd")
    : issueDate;
}

export function QuickDocumentForm({ clients }: { clients: { id: number; name: string }[] }) {
  const [documentType, setDocumentType] = useState<QuickDocumentType>("quotation");
  const [clientId, setClientId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [issueDate, setIssueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [secondDate, setSecondDate] = useState(defaultSecondDate("quotation", format(new Date(), "yyyy-MM-dd")));
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<QuickDocumentFormValues["items"]>([
    { description: "", unitPrice: 0, quantity: 1, taxRate: 0.1 },
  ]);
  const [previewHtml, setPreviewHtml] = useState("");
  const [downloading, setDownloading] = useState(false);

  const totals = calculateTotals(items);

  const changeDocumentType = (value: QuickDocumentType) => {
    setDocumentType(value);
    setSecondDate(defaultSecondDate(value, issueDate));
  };

  const setItem = (index: number, patch: Partial<QuickDocumentFormValues["items"][number]>) => {
    setItems(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const buildPayload = (): QuickDocumentFormValues => ({
    documentType,
    clientId: Number(clientId),
    title,
    issueDate,
    secondDate,
    notes,
    items,
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!clientId) {
      setPreviewHtml("");
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      const response = await fetch("/api/documents/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      if (response.ok) {
        setPreviewHtml(await response.text());
      }
    }, 400);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentType, clientId, title, issueDate, secondDate, notes, items]);

  const download = async () => {
    if (!clientId) {
      toast.error("取引先を選択してください");
      return;
    }

    setDownloading(true);
    const response = await fetch("/api/documents/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload()),
    });
    setDownloading(false);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      toast.error(body.error ?? "PDFの生成に失敗しました");
      return;
    }

    const blob = await response.blob();
    const disposition = response.headers.get("Content-Disposition") ?? "";
    const match = disposition.match(/filename\*=UTF-8''(.+)$/);
    const fileName = match ? decodeURIComponent(match[1]) : "document.pdf";

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">見積書・納品書を作成</h1>
          <Button size="sm" onClick={download} disabled={downloading || !clientId}>
            {downloading ? "生成中..." : "PDFダウンロード"}
          </Button>
        </div>

        <div className="space-y-1.5">
          <Label>書類種別</Label>
          <Select
            items={Object.fromEntries(DOCUMENT_TYPES.map((t) => [t.value, t.label]))}
            value={documentType}
            onValueChange={(v) => changeDocumentType(v as QuickDocumentType)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>取引先</Label>
          <Select
            items={Object.fromEntries(clients.map((c) => [String(c.id), c.name]))}
            value={clientId}
            onValueChange={(v) => setClientId(v ?? "")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="選択してください" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={String(client.id)}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {clients.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              <Link href="/clients" className="underline">
                取引先
              </Link>
              を先に作成してください
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label>件名</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>発行日</Label>
            <Input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{SECOND_DATE_LABEL[documentType]}</Label>
            <Input
              type="date"
              value={secondDate}
              onChange={(e) => setSecondDate(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>明細</Label>
          {items.map((item, index) => (
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
                disabled={items.length <= 1}
                onClick={() => setItems(items.filter((_, i) => i !== index))}
              >
                ✕
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setItems([...items, { description: "", unitPrice: 0, quantity: 1, taxRate: 0.1 }])
            }
          >
            行を追加
          </Button>
        </div>

        <div className="space-y-1.5">
          <Label>備考</Label>
          <Textarea rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} />
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
        {previewHtml ? (
          <iframe
            srcDoc={previewHtml}
            className="h-full min-h-[600px] w-full rounded-md border bg-white"
            title="プレビュー"
          />
        ) : (
          <div className="flex h-full min-h-[600px] items-center justify-center rounded-md border text-sm text-muted-foreground">
            取引先を選択するとプレビューが表示されます
          </div>
        )}
      </div>
    </div>
  );
}
