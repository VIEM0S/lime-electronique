import { Wallet, AlertTriangle, PackageX, Bell } from "lucide-react";
import Button from "@/components/ui/Button";

function Swatch({ nom, classeBg, hex, classeTexte = "text-white" }: { nom: string; classeBg: string; hex: string; classeTexte?: string }) {
  return (
    <div className="rounded-lg overflow-hidden border border-argent/25">
      <div className={`h-16 flex items-end p-2 ${classeBg} ${classeTexte}`}>
        <span className="text-xs font-semibold">{nom}</span>
      </div>
      <div className="bg-white px-2 py-1.5 text-[11px] font-mono text-ink/50">{hex}</div>
    </div>
  );
}

function Badge({ classe, children }: { classe: string; children: React.ReactNode }) {
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${classe}`}>{children}</span>;
}

export default function StyleGuidePage() {
  return (
    <div className="space-y-10 pb-16">
      <div>
        <h1 className="text-lg font-display font-semibold text-ink">Guide de style — bleu / argent</h1>
        <p className="text-xs text-ink/40 italic">
          Page de référence uniquement — pas liée à tes vraies données. Regarde, réagis, on ajuste ici avant de
          toucher le reste de l&apos;app.
        </p>
      </div>

      {/* ------------------------------------------------------------------ */}
      <section className="space-y-3">
        <h2 className="text-sm font-display font-semibold text-ink">1. Couleurs</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <Swatch nom="Bleu (lime)" classeBg="bg-lime" hex="#0050B0" />
          <Swatch nom="Bleu marine (lime-deep)" classeBg="bg-lime-deep" hex="#083078" />
          <Swatch nom="Bleu clair (lime-soft)" classeBg="bg-lime-soft" hex="#E4ECFA" classeTexte="text-ink" />
          <Swatch nom="Argent (argent)" classeBg="bg-argent" hex="#9AA7B4" classeTexte="text-ink" />
          <Swatch nom="Argent foncé (argent-deep)" classeBg="bg-argent-deep" hex="#6B7684" />
          <Swatch nom="Argent clair (argent-soft)" classeBg="bg-argent-soft" hex="#EEF1F4" classeTexte="text-ink" />
          <Swatch nom="Encre (ink)" classeBg="bg-ink" hex="#262626" />
          <Swatch nom="Papier (paper)" classeBg="bg-paper" hex="#EDF0F4" classeTexte="text-ink" />
          <Swatch nom="Succès (ok)" classeBg="bg-ok" hex="#3F9142" />
          <Swatch nom="Attention (ember)" classeBg="bg-ember" hex="#E2A33D" />
          <Swatch nom="Danger (signal)" classeBg="bg-signal" hex="#D14343" />
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="space-y-3">
        <h2 className="text-sm font-display font-semibold text-ink">2. Boutons</h2>
        <div className="flex flex-wrap gap-3 items-center bg-white border border-argent/25 rounded-lg p-4">
          <Button>Primaire</Button>
          <Button variant="secondary">Secondaire</Button>
          <Button variant="ghost">Discret (ghost)</Button>
          <Button variant="danger">Danger</Button>
          <Button disabled>Primaire (désactivé)</Button>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="space-y-3">
        <h2 className="text-sm font-display font-semibold text-ink">3. Cartes KPI (Tableau de bord)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-argent/25 border-l-[3px] border-l-lime rounded-lg p-4 shadow-[0_1px_2px_rgba(8,48,120,0.06)]">
            <div className="w-8 h-8 rounded-md flex items-center justify-center mb-2.5 bg-lime/10 text-lime-deep">
              <Wallet size={16} />
            </div>
            <div className="text-[10px] uppercase tracking-wide text-ink/40 font-semibold">Ventes du jour</div>
            <div className="text-lg font-display font-semibold num">555 000 FCFA</div>
            <div className="text-xs text-ink/40">3 vente(s)</div>
          </div>
          <div className="bg-white border border-argent/25 border-l-[3px] border-l-ember rounded-lg p-4 shadow-[0_1px_2px_rgba(8,48,120,0.06)]">
            <div className="w-8 h-8 rounded-md flex items-center justify-center mb-2.5 bg-ember/10 text-ember">
              <AlertTriangle size={16} />
            </div>
            <div className="text-[10px] uppercase tracking-wide text-ink/40 font-semibold">Créances en cours</div>
            <div className="text-lg font-display font-semibold num">150 000 FCFA</div>
            <div className="text-xs text-ink/40">1 client(s)</div>
          </div>
          <div className="bg-white border border-argent/25 border-l-[3px] border-l-argent rounded-lg p-4 shadow-[0_1px_2px_rgba(8,48,120,0.06)]">
            <div className="w-8 h-8 rounded-md flex items-center justify-center mb-2.5 bg-argent/10 text-argent-deep">
              <PackageX size={16} />
            </div>
            <div className="text-[10px] uppercase tracking-wide text-ink/40 font-semibold">Articles en stock faible</div>
            <div className="text-lg font-display font-semibold num">2</div>
            <div className="text-xs text-ink/40">&lt; 5 unités</div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="space-y-3">
        <h2 className="text-sm font-display font-semibold text-ink">4. Badges / statuts</h2>
        <div className="bg-white border border-argent/25 rounded-lg p-4 space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-ink/40 font-semibold mb-1.5">Ventes</p>
            <div className="flex gap-2 flex-wrap">
              <Badge classe="bg-ok/10 text-ok">Payé</Badge>
              <Badge classe="bg-ember/10 text-ember">Payé en partie</Badge>
              <Badge classe="bg-signal/10 text-signal">Impayé</Badge>
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-ink/40 font-semibold mb-1.5">Crédits</p>
            <div className="flex gap-2 flex-wrap">
              <Badge classe="bg-argent/15 text-argent-deep">En cours</Badge>
              <Badge classe="bg-signal/10 text-signal">En retard</Badge>
              <Badge classe="bg-ok/10 text-ok">Soldée</Badge>
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-ink/40 font-semibold mb-1.5">Utilisateurs</p>
            <div className="flex gap-2 flex-wrap">
              <Badge classe="bg-ok/10 text-ok">Actif</Badge>
              <Badge classe="bg-ink/10 text-ink/50">Désactivé</Badge>
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-ink/40 font-semibold mb-1.5">Rôle (en-tête)</p>
            <div className="flex gap-2 flex-wrap">
              <span className="text-[10px] bg-lime/15 text-lime rounded-full px-2.5 py-1 uppercase tracking-wide font-semibold">
                Propriétaire
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="space-y-3">
        <h2 className="text-sm font-display font-semibold text-ink">5. Palette graphiques (modes de paiement)</h2>
        <div className="bg-white border border-argent/25 rounded-lg p-4">
          <div className="flex gap-4 flex-wrap">
            {[
              { nom: "Espèces", hex: "#0050B0" },
              { nom: "Mobile Money", hex: "#6B7684" },
              { nom: "Virement", hex: "#3F9142" },
              { nom: "Crédit", hex: "#E2A33D" },
            ].map((m) => (
              <div key={m.nom} className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full" style={{ backgroundColor: m.hex }} />
                <span className="text-xs text-ink/60">{m.nom}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="space-y-3">
        <h2 className="text-sm font-display font-semibold text-ink">6. Typographie</h2>
        <div className="bg-white border border-argent/25 rounded-lg p-4 space-y-2">
          <div className="text-lg font-display font-semibold text-ink">Titre de page (font-display, semibold)</div>
          <div className="text-sm font-display font-semibold text-ink">Titre de section (text-sm, display)</div>
          <div className="text-sm text-ink">Texte courant (body)</div>
          <div className="text-xs text-ink/40 italic">Légende discrète (italic, ink/40)</div>
          <div className="text-lg font-display font-semibold num">1 234 567 FCFA</div>
          <div className="text-[10px] uppercase tracking-wide text-ink/40 font-semibold">Étiquette (label kpi)</div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="space-y-3">
        <h2 className="text-sm font-display font-semibold text-ink">7. En-tête de l&apos;app (aperçu)</h2>
        <div className="rounded-lg overflow-hidden border border-argent/25">
          <header className="bg-lime-deep text-white px-4 py-3 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-md bg-white flex items-center justify-center text-[10px] text-ink font-bold">
                L
              </span>
              <div className="font-display font-semibold text-[13px]">Lime-électronique</div>
            </div>
            <span className="text-[10px] bg-lime/15 text-lime rounded-full px-2.5 py-1 uppercase tracking-wide font-semibold">
              Propriétaire
            </span>
          </header>
          <nav className="bg-ink px-4 py-2.5 flex gap-4 text-xs">
            <span className="text-lime font-semibold border-b-2 border-lime pb-1">Tableau de bord</span>
            <span className="text-white/50">Caisse</span>
            <span className="text-white/50">Factures</span>
          </nav>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="space-y-3">
        <h2 className="text-sm font-display font-semibold text-ink">8. Alerte (écart négatif / notification)</h2>
        <div className="bg-white border border-argent/25 rounded-lg p-4 max-w-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-lime-deep" />
              <div>
                <p className="text-sm font-display font-semibold">Alertes de caisse</p>
                <p className="text-xs text-ink/40">Reçois une vraie notification à l&apos;ouverture/fermeture.</p>
              </div>
            </div>
            <button className="flex items-center gap-1 text-xs bg-lime-deep text-white px-3 py-1.5 rounded-md font-semibold">
              <Bell size={13} /> Activer
            </button>
          </div>
        </div>
        <div className="bg-signal/5 border border-signal/20 rounded-md p-2.5 max-w-md text-signal text-xs flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>Écart négatif — signale-le au propriétaire.</span>
        </div>
      </section>
    </div>
  );
}
