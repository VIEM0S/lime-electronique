"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { KeyRound, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";

export default function ReinitialiserMotDePassePage() {
  const supabase = createClient();
  const router = useRouter();
  const [pret, setPret] = useState(false);
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [succes, setSucces] = useState(false);

  useEffect(() => {
    // Le lien reçu par email crée une session temporaire de type
    // "recovery" — on vérifie juste qu'une session existe avant d'autoriser
    // le changement (Supabase gère l'échange du jeton automatiquement).
    supabase.auth.getSession().then(({ data }) => {
      setPret(!!data.session);
      if (!data.session) {
        setErreur("Ce lien a expiré ou n'est plus valide. Demande un nouveau lien.");
      }
    });
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);

    if (nouveauMotDePasse.length < 6) {
      setErreur("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (nouveauMotDePasse !== confirmation) {
      setErreur("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setEnvoi(true);
    const { error } = await supabase.auth.updateUser({ password: nouveauMotDePasse });
    setEnvoi(false);

    if (error) {
      setErreur(error.message);
      return;
    }
    setSucces(true);
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1800);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-lime-deep px-4 relative overflow-hidden">
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-lime/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-lime/5 rounded-full blur-3xl" />

      <div className="relative w-full max-w-sm animate-fade-up">
        <div className="flex flex-col items-center mb-6">
          <span className="w-14 h-14 rounded-lg overflow-hidden flex items-center justify-center bg-white mb-3">
            <Image src="/icons/icon-192.png" alt="Lime-électronique" width={56} height={56} className="object-cover" />
          </span>
          <h1 className="font-display font-semibold text-white text-lg">Lime-électronique</h1>
        </div>

        <div className="bg-paper rounded-lg p-7 shadow-2xl">
          {succes ? (
            <div className="text-center space-y-3">
              <CheckCircle2 size={32} className="text-ok mx-auto" />
              <h2 className="font-display font-semibold text-ink">Mot de passe changé</h2>
              <p className="text-xs text-ink/60">Redirection vers le tableau de bord...</p>
            </div>
          ) : (
            <>
              <h2 className="font-display font-semibold text-ink mb-1">Nouveau mot de passe</h2>
              <p className="text-xs text-ink/55 italic mb-6">Choisis un nouveau mot de passe pour ton compte.</p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wide text-ink/55 mb-1 font-semibold">
                    Nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    required
                    disabled={!pret}
                    value={nouveauMotDePasse}
                    onChange={(e) => setNouveauMotDePasse(e.target.value)}
                    className="w-full border border-ink/15 rounded-md px-3 py-2 text-sm bg-white focus:border-lime-deep focus:ring-1 focus:ring-lime-deep transition-colors disabled:opacity-50"
                    placeholder="Au moins 6 caractères"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wide text-ink/55 mb-1 font-semibold">
                    Confirmer le mot de passe
                  </label>
                  <input
                    type="password"
                    required
                    disabled={!pret}
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                    className="w-full border border-ink/15 rounded-md px-3 py-2 text-sm bg-white focus:border-lime-deep focus:ring-1 focus:ring-lime-deep transition-colors disabled:opacity-50"
                  />
                </div>

                {erreur && <p className="text-xs text-signal">{erreur}</p>}

                <Button type="submit" disabled={!pret || envoi} className="w-full mt-1">
                  {envoi ? "Enregistrement..." : "Changer le mot de passe"}
                  {!envoi && <KeyRound size={14} />}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
