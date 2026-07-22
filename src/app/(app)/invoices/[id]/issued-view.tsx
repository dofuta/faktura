"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatYen } from "@/invoice/totals";
import { downloadFileFromResponse } from "@/lib/download";
import { deleteInvoiceAction } from "../actions";

type IssuedInvoice = {
  id: number;
  invoiceNumber: string | null;
  title: string;
  issueDate: string;
  dueDate: string;
  total: number | null;
  driveUrl: string | null;
  clientName: string;
  clientLanguage: "ja" | "en";
};

export function IssuedInvoiceView({ invoice }: { invoice: IssuedInvoice }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [quoting, setQuoting] = useState(false);

  const downloadQuotation = async () => {
    setQuoting(true);
    const response = await fetch(`/api/invoices/${invoice.id}/quotation-pdf`, {
      method: "POST",
    });
    setQuoting(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      toast.error(body.error ?? "見積書PDFの生成に失敗しました");
      return;
    }
    await downloadFileFromResponse(response);
  };

  const remove = async () => {
    if (
      !confirm(
        "この請求書を削除しますか?(Drive上のPDFも削除されます)",
      )
    ) {
      return;
    }
    setBusy(true);
    const result = await deleteInvoiceAction(invoice.id);
    setBusy(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    if (result.warning) {
      toast.warning(result.warning);
    }
    router.push("/");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">
            {invoice.invoiceNumber} {invoice.title || invoice.clientName}
          </h1>
          <Badge>発行済み</Badge>
        </div>
        <div className="flex gap-2">
          {invoice.driveUrl ? (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<a href={invoice.driveUrl} target="_blank" rel="noreferrer" />}
            >
              Drive
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              <a href={`/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer" />
            }
          >
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={downloadQuotation} disabled={quoting}>
            {quoting ? "生成中..." : "見積書PDF"}
          </Button>
          <Button variant="outline" size="sm" onClick={remove} disabled={busy}>
            削除
          </Button>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        {invoice.clientName} ・ 発行日 {invoice.issueDate}
        {invoice.dueDate ? ` ・ 支払期限 ${invoice.dueDate}` : ""} ・{" "}
        {invoice.total !== null ? formatYen(invoice.total, invoice.clientLanguage) : ""}
      </div>

      <iframe
        src={`/invoices/${invoice.id}/preview`}
        className="h-[800px] w-full rounded-md border bg-white"
        title="請求書"
      />
    </div>
  );
}
