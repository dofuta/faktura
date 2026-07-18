import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>faktura</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={login} className="space-y-3">
            <Input
              type="password"
              name="password"
              placeholder="パスワード"
              autoFocus
              required
            />
            {error ? (
              <p className="text-sm text-destructive">パスワードが違います</p>
            ) : null}
            <Button type="submit" className="w-full">
              ログイン
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
