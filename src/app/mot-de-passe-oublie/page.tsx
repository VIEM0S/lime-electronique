"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";

export default function MotDePasseOubliePage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [envoye, setEnvoye] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
    });

    setChargement(false);

    // Volontairement identique que l'email existe ou non (pas de fuite
    // d'information sur qui a un compte) — Supabase gère déjà cette
    // discrétion nativement, on ne fait que refléter le même comportement.
    if (error && error.status && error.status >= 500) {
      setErreur("Une erreur est survenue, réessaie dans un instant.");
      return;
    }
    setEnvoye(true);
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
          {envoye ? (
            <div className="text-center space-y-3">
              <CheckCircle2 size={32} className="text-ok mx-auto" />
              <h2 className="font-display font-semibold text-ink">Vérifie ta boîte mail</h2>
              <p className="text-xs text-ink/60">
                Si un compte existe avec cette adresse, un lien de réinitialisation vient de lui être envoyé.
                Pense à vérifier tes courriers indésirables.
              </p>
              <Link href="/login" className="inline-flex items-center gap-1 text-xs text-lime-deep font-semibold mt-2">
                <ArrowLeft size={13} /> Retour à la connexion
              </Link>
            </div>
          ) : (
            <>
              <h2 className="font-display font-semibold text-ink mb-1">Mot de passe oublié</h2>
              <p className="text-xs text-ink/55 italic mb-6">
                Entre l&apos;email de ton compte, on t&apos;envoie un lien pour en choisir un nouveau.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                  {chargement ? "Envoi..." : "Envoyer le lien"}
                  {!chargement && <Mail size={14} />}
                </Button>
              </form>

              <Link href="/login" className="flex items-center justify-center gap-1 text-[11px] text-ink/50 mt-4 hover:text-ink">
                <ArrowLeft size={12} /> Retour à la connexion
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
