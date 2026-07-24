import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SyncBar from "@/components/SyncBar";
import Nav from "@/components/Nav";
import DeconnexionButton from "@/components/DeconnexionButton";
import type { Profil } from "@/types/database.types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profil } = await supabase
    .from("profils")
    .select("*")
    .eq("id", user!.id)
    .single<Profil>();

  if (!profil || !profil.actif) {
    // Compte inconnu ou désactivé (cf. FR-22ter) : on refuse l'accès.
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <header className="bg-ink text-white px-4 sm:px-6 py-3 text-sm flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-md bg-lime text-ink font-display font-bold text-sm flex items-center justify-center">
            L
          </span>
          <div className="leading-tight">
            <div className="font-display font-semibold text-[13px]">Lime-électronique</div>
            <div className="text-[11px] text-white/50">{profil.nom}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] bg-lime/15 text-lime rounded-full px-2.5 py-1 uppercase tracking-wide font-semibold">
            {profil.role}
          </span>
          <DeconnexionButton />
        </div>
      </header>
      <SyncBar />
      <Nav role={profil.role} />
      <main className="max-w-5xl mx-auto p-4 sm:p-6 animate-fade-up">{children}</main>
    </div>
  );
}
