import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatYen } from "@/invoice/totals";
import { listInvoicesWithClient } from "@/server/invoices";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const invoices = await listInvoicesWithClient();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">請求書</h1>
        <Button size="sm" nativeButton={false} render={<Link href="/invoices/new" />}>
          作成
        </Button>
      </div>

      {invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground">請求書はまだありません</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>番号</TableHead>
              <TableHead>件名</TableHead>
              <TableHead>取引先</TableHead>
              <TableHead>発行日</TableHead>
              <TableHead className="text-right">合計</TableHead>
              <TableHead>状態</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell>
                  <Link href={`/invoices/${invoice.id}`} className="underline-offset-2 hover:underline">
                    {invoice.invoiceNumber ?? "—"}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/invoices/${invoice.id}`} className="underline-offset-2 hover:underline">
                    {invoice.title || "(無題)"}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{invoice.clientName}</TableCell>
                <TableCell className="text-muted-foreground">{invoice.issueDate}</TableCell>
                <TableCell className="text-right">
                  {invoice.total !== null ? formatYen(invoice.total) : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {invoice.status === "draft" ? (
                      <Badge variant="secondary">下書き</Badge>
                    ) : (
                      <Badge>発行済み</Badge>
                    )}
                    {invoice.driveUrl ? <Badge variant="outline">Drive</Badge> : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
