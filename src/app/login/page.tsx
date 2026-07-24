"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AlertCircle, ArrowRight } from "lucide-react";
import Button from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [identifiant, setIdentifiant] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: identifiant,
      password: motDePasse,
    });

    setChargement(false);

    if (error) {
      setErreur("Identifiant ou mot de passe incorrect.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink px-4 relative overflow-hidden">
      {/* Halo lime discret, ambiance sans surcharger */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-lime/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-lime/5 rounded-full blur-3xl" />

      <div className="relative w-full max-w-sm animate-fade-up">
        <div className="flex flex-col items-center mb-6">
          <span className="w-11 h-11 rounded-lg bg-lime text-ink font-display font-bold text-lg flex items-center justify-center mb-3">
            L
          </span>
          <h1 className="font-display font-semibold text-white text-lg">Lime-électronique</h1>
          <p className="text-xs text-white/40 mt-0.5">Système de gestion — Bamako</p>
        </div>

        <div className="bg-paper rounded-lg p-7 shadow-2xl">
          <h2 className="font-display font-semibold text-ink mb-1">Connexion</h2>
          <p className="text-xs text-ink/40 italic mb-6">Écran commun aux deux profils</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-ink/40 mb-1 font-semibold">
                Identifiant
              </label>
              <input
                type="email"
                required
                value={identifiant}
                onChange={(e) => setIdentifiant(e.target.value)}
                className="w-full border border-ink/15 rounded-md px-3 py-2 text-sm bg-white
                  focus:border-lime-deep focus:ring-1 focus:ring-lime-deep transition-colors"
                placeholder="proprietaire@lime-electronique.ml"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wide text-ink/40 mb-1 font-semibold">
                Mot de passe
              </label>
              <input
                type="password"
                required
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                className="w-full border border-ink/15 rounded-md px-3 py-2 text-sm bg-white
                  focus:border-lime-deep focus:ring-1 focus:ring-lime-deep transition-colors"
                placeholder="••••••••••"
              />
            </div>

            {erreur && (
              <p className="flex items-center gap-1.5 text-xs text-signal">
                <AlertCircle size={13} />
                {erreur}
              </p>
            )}

            <Button type="submit" disabled={chargement} className="w-full mt-1">
              {chargement ? "Connexion..." : "Se connecter"}
              {!chargement && <ArrowRight size={14} />}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
