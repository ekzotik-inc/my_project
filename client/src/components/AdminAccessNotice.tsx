import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export function AdminAccessNotice() {
  const { loading, user } = useAuth();
  if (loading || user?.role === "admin" || user?.role === "pc_admin") return null;

  return (
    <section className="mx-auto mt-24 max-w-xl rounded-[1.75rem] border border-black/5 bg-card p-10 text-center shadow-[0_18px_50px_-30px_rgba(0,0,0,0.22)]">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FBE8EC] text-black">
        <ShieldAlert className="h-5 w-5" />
      </div>
      <h1 className="mt-6 text-2xl font-extrabold tracking-[-0.04em]">Нужны права администратора</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Доступ к управлению активностями, командами и участниками открыт Chief Administrator и назначенным P&amp;C Administrator.
      </p>
    </section>
  );
}
