"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Mail, CheckCircle2, KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";

// Flux en code à 6 chiffres plutôt qu'un lien cliquable : un lien "magique"
// peut être consommé par erreur par un scanner de sécurité email (Gmail et
// certains antivirus "visitent" automatiquement les liens reçus pour les
// vérifier), ce qui invalide le lien avant que la vraie personne ne
// clique dessus. Un code tapé à la main n'a pas ce problème.
export default function MotDePasseOubliePage() {
  const supabase = createClient();
  const router = useRouter();

  const [etape, setEtape] = useState<"email" | "code" | "succes">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function demanderCode(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email);

    setChargement(false);
    // Volontairement pas d'erreur affichée même si l'email n'existe pas —
    // pour ne pas révéler quels comptes existent (Supabase se comporte
    // déjà comme ça nativement, on ne fait que refléter le même choix).
    if (error && error.status && error.status >= 500) {
      setErreur("Une erreur est survenue, réessaie dans un instant.");
      return;
    }
    setEtape("code");
  }

  async function validerCodeEtMotDePasse(e: React.FormEvent) {
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

    setChargement(true);

    const { error: erreurCode } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "recovery",
    });

    if (erreurCode) {
      setChargement(false);
      setErreur("Code incorrect ou expiré. Vérifie le code reçu par email, ou demande-en un nouveau.");
      return;
    }

    const { error: erreurMotDePasse } = await supabase.auth.updateUser({ password: nouveauMotDePasse });
    setChargement(false);

    if (erreurMotDePasse) {
      setErreur(erreurMotDePasse.message);
      return;
    }

    setEtape("succes");
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
          {etape === "succes" ? (
            <div className="text-center space-y-3">
              <CheckCircle2 size={32} className="text-ok mx-auto" />
              <h2 className="font-display font-semibold text-ink">Mot de passe changé</h2>
              <p className="text-xs text-ink/60">Redirection vers le tableau de bord...</p>
            </div>
          ) : etape === "email" ? (
            <>
              <h2 className="font-display font-semibold text-ink mb-1">Mot de passe oublié</h2>
              <p className="text-xs text-ink/55 italic mb-6">
                Entre l&apos;email de ton compte, on t&apos;envoie un code à 6 chiffres.
              </p>

              <form onSubmit={demanderCode} className="flex flex-col gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wide text-ink/55 mb-1 font-semibold">
                    Email du compte
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-ink/15 rounded-md px-3 py-2 text-sm bg-white focus:border-lime-deep focus:ring-1 focus:ring-lime-deep transition-colors"
                    placeholder="ton-email@exemple.com"
                  />
                </div>

                {erreur && <p className="text-xs text-signal">{erreur}</p>}

                <Button type="submit" disabled={chargement} className="w-full mt-1">
                  {chargement ? "Envoi..." : "Recevoir le code"}
                  {!chargement && <Mail size={14} />}
                </Button>
              </form>

              <Link href="/login" className="flex items-center justify-center gap-1 text-[11px] text-ink/50 mt-4 hover:text-ink">
                <ArrowLeft size={12} /> Retour à la connexion
              </Link>
            </>
          ) : (
            <>
              <h2 className="font-display font-semibold text-ink mb-1">Code reçu par email</h2>
              <p className="text-xs text-ink/55 italic mb-6">
                Regarde tes emails (et tes courriers indésirables) — entre le code à 6 chiffres et ton nouveau mot
                de passe.
              </p>

              <form onSubmit={validerCodeEtMotDePasse} className="flex flex-col gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wide text-ink/55 mb-1 font-semibold">
                    Code reçu par email
                  </label>
                  <input
                    required
                    inputMode="numeric"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full border border-ink/15 rounded-md px-3 py-2 text-sm bg-white text-center tracking-[0.3em] font-semibold focus:border-lime-deep focus:ring-1 focus:ring-lime-deep transition-colors"
                    placeholder="123456"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wide text-ink/55 mb-1 font-semibold">
                    Nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    required
                    value={nouveauMotDePasse}
                    onChange={(e) => setNouveauMotDePasse(e.target.value)}
                    className="w-full border border-ink/15 rounded-md px-3 py-2 text-sm bg-white focus:border-lime-deep focus:ring-1 focus:ring-lime-deep transition-colors"
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
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                    className="w-full border border-ink/15 rounded-md px-3 py-2 text-sm bg-white focus:border-lime-deep focus:ring-1 focus:ring-lime-deep transition-colors"
                  />
                </div>

                {erreur && <p className="text-xs text-signal">{erreur}</p>}

                <Button type="submit" disabled={chargement} className="w-full mt-1">
                  {chargement ? "Validation..." : "Changer le mot de passe"}
                  {!chargement && <KeyRound size={14} />}
                </Button>
              </form>

              <button
                onClick={() => setEtape("email")}
                className="flex items-center justify-center gap-1 text-[11px] text-ink/50 mt-4 hover:text-ink w-full"
              >
                <ArrowLeft size={12} /> Renvoyer un code / changer d&apos;email
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
