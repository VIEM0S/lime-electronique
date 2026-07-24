"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

    // Le rôle (propriétaire/caisse) détermine l'écran d'atterrissage réel ;
    // pour l'instant on redirige tout le monde vers /dashboard, qui se
    // charge lui-même de rediriger la caisse vers /caisse (cf. layout (app)).
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white border border-gray-200 rounded p-8 w-full max-w-sm">
        <h1 className="text-lg font-semibold text-accent mb-1">Connexion</h1>
        <p className="text-xs text-gray-400 italic mb-6">
          Écran commun aux deux profils (propriétaire / caisse)
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-[10px] uppercase tracking-wide text-gray-400 mb-1">
              Identifiant
            </label>
            <input
              type="email"
              required
              value={identifiant}
              onChange={(e) => setIdentifiant(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              placeholder="proprietaire@lime-electronique.ml"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wide text-gray-400 mb-1">
              Mot de passe
            </label>
            <input
              type="password"
              required
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              placeholder="••••••••••"
            />
          </div>

          {erreur && <p className="text-xs text-red-600">{erreur}</p>}

          <button
            type="submit"
            disabled={chargement}
            className="bg-accent text-white rounded py-2 text-sm font-semibold disabled:opacity-50"
          >
            {chargement ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}
