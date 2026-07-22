"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { downloadFileFromResponse } from "@/lib/download";

type DocumentType = "quotation" | "delivery";

const CONFIG: Record<DocumentType, { label: string; dateLabel: string; errorMessage: string }> = {
  quotation: {
    label: "見積書PDF",
    dateLabel: "有効期限",
    errorMessage: "見積書PDFの生成に失敗しました",
  },
  delivery: {
    label: "納品書PDF",
    dateLabel: "納品日",
    errorMessage: "納品書PDFの生成に失敗しました",
  },
};

export function DocumentExportRow({
  invoiceId,
  documentType,
  beforeGenerate,
}: {
  invoiceId: number;
  documentType: DocumentType;
  beforeGenerate?: () => Promise<boolean>;
}) {
  const [secondDate, setSecondDate] = useState("");
  const [busy, setBusy] = useState(false);
  const config = CONFIG[documentType];

  const download = async () => {
    if (beforeGenerate && !(await beforeGenerate())) {
      return;
    }

    setBusy(true);
    const response = await fetch(`/api/invoices/${invoiceId}/document-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentType, secondDate }),
    });
    setBusy(false);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      toast.error(body.error ?? config.errorMessage);
      return;
    }

    await downloadFileFromResponse(response);
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={download} disabled={busy}>
        {busy ? "生成中..." : config.label}
      </Button>
      <span className="text-sm text-muted-foreground">{config.dateLabel}</span>
      <Input
        type="date"
        className="w-40"
        value={secondDate}
        onChange={(e) => setSecondDate(e.target.value)}
      />
    </div>
  );
}
