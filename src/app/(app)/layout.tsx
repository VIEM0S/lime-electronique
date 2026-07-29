import { redirect } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getProfilCourant } from "@/lib/supabase/current-user";
import SyncBar from "@/components/SyncBar";
import Nav from "@/components/Nav";
import DeconnexionButton from "@/components/DeconnexionButton";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profil = await getProfilCourant();

  if (!profil) {
    redirect("/login");
  }

  if (!profil.actif) {
    // Compte désactivé (cf. FR-22ter) : on refuse l'accès.
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <div className="h-[3px] bg-gradient-to-r from-lime via-[#4A78D6] to-lime-soft" />
      <header className="bg-lime-deep text-white px-4 sm:px-6 py-3 text-sm flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-md overflow-hidden flex items-center justify-center bg-white shrink-0">
            <Image src="/icons/icon-192.png" alt="Lime-électronique" width={28} height={28} className="object-cover" />
          </span>
          <div className="leading-tight">
            <div className="font-display font-semibold text-[13px]">Lime-électronique</div>
            <div className="text-[11px] text-white/50">{profil.nom}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] bg-white/15 text-white rounded-full px-2.5 py-1 uppercase tracking-wide font-semibold">
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
