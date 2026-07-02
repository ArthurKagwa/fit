import { auth } from "@/auth";

export default async function DashboardPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="grid gap-4">
      <header>
        <h1 className="text-2xl font-bold">Hey {firstName} 👋</h1>
        <p className="text-muted-foreground text-sm">
          Your progress dashboard is on its way.
        </p>
      </header>
    </div>
  );
}
