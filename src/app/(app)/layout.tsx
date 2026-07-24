import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SyncBar from "@/components/SyncBar";
import Nav from "@/components/Nav";
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
      <header className="bg-accent text-white px-6 py-3 text-sm flex items-center justify-between">
        <span>
          <b>Lime-électronique</b> — {profil.nom}
        </span>
        <span className="text-xs bg-white/15 rounded-full px-2 py-0.5 uppercase tracking-wide">
          {profil.role}
        </span>
      </header>
      <SyncBar />
      <Nav role={profil.role} />
      <main className="max-w-5xl mx-auto p-6">{children}</main>
    </div>
  );
}
