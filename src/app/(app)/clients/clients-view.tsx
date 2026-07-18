"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  createClientAction,
  deleteClientAction,
  updateClientAction,
  type ClientFormValues,
} from "./actions";

type ClientRow = {
  id: number;
  name: string;
  email: string;
  address: string;
  language: "ja" | "en";
  invoiceCount: number;
};

const emptyForm: ClientFormValues = { name: "", email: "", address: "", language: "ja" };

function ClientFormDialog({
  title,
  initial,
  trigger,
  onSubmit,
}: {
  title: string;
  initial: ClientFormValues;
  trigger: React.ReactElement<Record<string, unknown>>;
  onSubmit: (values: ClientFormValues) => Promise<{ error?: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<ClientFormValues>(initial);
  const [saving, setSaving] = useState(false);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setValues(initial);
    }
  };

  const submit = async () => {
    setSaving(true);
    const result = await onSubmit(values);
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>名前</Label>
            <Input
              value={values.name}
              onChange={(e) => setValues({ ...values, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>メール</Label>
            <Input
              value={values.email}
              onChange={(e) => setValues({ ...values, email: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>住所</Label>
            <Textarea
              rows={2}
              value={values.address}
              onChange={(e) => setValues({ ...values, address: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>言語</Label>
            <Select
              items={{ ja: "日本語", en: "English" }}
              value={values.language}
              onValueChange={(v) => setValues({ ...values, language: v as "ja" | "en" })}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ja">日本語</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={submit} disabled={saving} className="w-full">
            保存
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ClientsView({ clients }: { clients: ClientRow[] }) {
  const router = useRouter();

  const handleDelete = async (client: ClientRow) => {
    if (!confirm(`「${client.name}」を削除しますか?`)) {
      return;
    }
    const result = await deleteClientAction(client.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">取引先</h1>
        <ClientFormDialog
          title="取引先を作成"
          initial={emptyForm}
          trigger={<Button size="sm">作成</Button>}
          onSubmit={async (values) => {
            const result = await createClientAction(values);
            if (!result.error) {
              router.refresh();
            }
            return result;
          }}
        />
      </div>

      {clients.length === 0 ? (
        <p className="text-sm text-muted-foreground">取引先はまだありません</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名前</TableHead>
              <TableHead>メール</TableHead>
              <TableHead>言語</TableHead>
              <TableHead>請求書</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell className="font-medium">{client.name}</TableCell>
                <TableCell className="text-muted-foreground">{client.email}</TableCell>
                <TableCell>
                  <Badge variant="outline">{client.language}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {client.invoiceCount}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <ClientFormDialog
                      title="取引先を編集"
                      initial={{
                        name: client.name,
                        email: client.email,
                        address: client.address,
                        language: client.language,
                      }}
                      trigger={
                        <Button variant="outline" size="sm">
                          編集
                        </Button>
                      }
                      onSubmit={async (values) => {
                        const result = await updateClientAction(client.id, values);
                        if (!result.error) {
                          router.refresh();
                        }
                        return result;
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={client.invoiceCount > 0}
                      onClick={() => handleDelete(client)}
                    >
                      削除
                    </Button>
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
