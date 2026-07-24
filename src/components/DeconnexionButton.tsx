"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function DeconnexionButton() {
  const router = useRouter();
  const supabase = createClient();

  async function deconnecter() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={deconnecter}
      className="text-white/60 hover:text-white flex items-center gap-1 text-[11px] transition-colors"
      title="Se déconnecter"
    >
      <LogOut size={13} />
      <span className="hidden sm:inline">Déconnexion</span>
    </button>
  );
}
