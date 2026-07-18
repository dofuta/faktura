import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { clearSessionCookie } from "@/lib/session";

async function logout(): Promise<void> {
  "use server";
  await clearSessionCookie();
  redirect("/login");
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-16">
      <header className="flex items-center justify-between py-4">
        <nav className="flex items-center gap-5">
          <Link href="/" className="font-semibold tracking-wide">
            faktura
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            請求書
          </Link>
          <Link
            href="/clients"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            取引先
          </Link>
          <Link
            href="/settings"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            設定
          </Link>
        </nav>
        <form action={logout}>
          <Button variant="ghost" size="sm" type="submit">
            ログアウト
          </Button>
        </form>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
