"use client";

import { addMonths, format, lastDayOfMonth } from "date-fns";
import Link from "next/link";
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
import { createDraftAction } from "../actions";

export function NewInvoiceForm({ clients }: { clients: { id: number; name: string }[] }) {
  const router = useRouter();
  const [clientId, setClientId] = useState<string>("");
  const [instruction, setInstruction] = useState("");
  const [issueDate, setIssueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dueDate, setDueDate] = useState(
    format(lastDayOfMonth(addMonths(new Date(), 1)), "yyyy-MM-dd"),
  );
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState<"ai" | "manual" | null>(null);

  const create = async (mode: "ai" | "manual") => {
    setCreating(mode);
    const result = await createDraftAction(
      { clientId: Number(clientId), instruction, issueDate, dueDate, notes },
      mode,
    );
    setCreating(null);
    if (result.error || !result.id) {
      toast.error(result.error ?? "作成に失敗しました");
      return;
    }
    router.push(`/invoices/${result.id}`);
  };

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-lg font-semibold">請求書ドラフト作成</h1>

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
        <Label>請求内容(自然文)</Label>
        <Textarea
          rows={4}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="例: Webサイト制作 10万円、保守 月額2万円を2ヶ月分"
        />
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
          <Label>支払期限</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>備考</Label>
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() => create("ai")}
          disabled={creating !== null || !clientId}
          className="flex-1"
        >
          {creating === "ai" ? "生成中..." : "AIで作成"}
        </Button>
        <Button
          variant="outline"
          onClick={() => create("manual")}
          disabled={creating !== null || !clientId}
        >
          空で作成
        </Button>
      </div>
    </div>
  );
}
