"use client";

import { useMemo, useState } from "react";
import { Eye, Download, Search, Printer, Share2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import FactureApercu from "../caisse/FactureApercu";
import { TELEPHONE_ENTREPRISE, partagerWhatsApp } from "@/lib/partage";
import Pagination, { usePagination } from "@/components/ui/Pagination";
import type { ModePaiement } from "@/types/database.types";

type Ligne = {
  id: string;
  type: "vente" | "remboursement";
  reference: string;
  date: string;
  clientNom: string;
  paiement: string;
  total: number;
};

type DetailVente = {
  numero: string;
  statut: string;
  clientNom: string | null;
  lignes: { nom: string; quantite: number; prix_unitaire: number }[];
  total: number;
  paiements: { mode: ModePaiement; montant: number }[];
};

export default function FacturesClient({ lignes }: { lignes: Ligne[] }) {
  const supabase = createClient();
  const [recherche, setRecherche] = useState("");
  const [ligneOuverte, setLigneOuverte] = useState<Ligne | null>(null);
  const [detailVente, setDetailVente] = useState<DetailVente | null>(null);
  const [chargement, setChargement] = useState(false);

  const filtrees = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return lignes;
    return lignes.filter(
      (l) => l.reference.toLowerCase().includes(q) || l.clientNom.toLowerCase().includes(q)
    );
  }, [lignes, recherche]);
  const { page, setPage, totalPages, itemsPage: lignesPage } = usePagination(filtrees);

  async function ouvrir(ligne: Ligne) {
    setLigneOuverte(ligne);
    if (ligne.type !== "vente") return;

    setChargement(true);
    setDetailVente(null);
    const [{ data: venteLignes }, { data: paiements }] = await Promise.all([
      supabase
        .from("ventes_lignes")
        .select("quantite, prix_unitaire, articles(nom)")
        .eq("vente_id", ligne.id),
      supabase.from("paiements").select("mode, montant").eq("vente_id", ligne.id),
    ]);
    setChargement(false);
    setDetailVente({
      numero: ligne.reference,
      statut: "", // recalculé côté FactureApercu à partir des paiements réels
      clientNom: ligne.clientNom === "Client comptoir" ? null : ligne.clientNom,
      lignes: (venteLignes ?? []).map((l: any) => ({
        nom: l.articles?.nom ?? "Article",
        quantite: l.quantite,
        prix_unitaire: l.prix_unitaire,
      })),
      total: ligne.total,
      paiements: paiements ?? [],
    });
  }

  function fermer() {
    setLigneOuverte(null);
    setDetailVente(null);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-display font-semibold text-ink">Factures</h1>
        <p className="text-xs text-ink/55 italic">Ventes et paiements de créances — tout au même endroit</p>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/45" />
        <input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher par n° facture ou client..."
          className="w-full border border-ink/15 rounded-md pl-9 pr-3 py-2 text-sm focus:border-lime-deep focus:ring-1 focus:ring-lime-deep"
        />
      </div>

      <div className="bg-white border border-argent/25 rounded-lg shadow-[0_1px_2px_rgba(8,48,120,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-argent/10 text-ink/55 text-left">
              <tr>
                <th className="p-2.5">N° Facture</th>
                <th>Date</th>
                <th>Client</th>
                <th>Paiement</th>
                <th className="text-right">Total</th>
                <th className="text-right pr-2.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtrees.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-ink/45 italic">
                    Aucune facture trouvée.
                  </td>
                </tr>
              )}
              {lignesPage.map((l) => (
                <tr key={`${l.type}-${l.id}`} className="border-t border-ink/5 hover:bg-lime/5 transition-colors">
                  <td className="p-2.5">
                    <span className="font-mono text-[11px] bg-lime/10 text-lime-deep px-1.5 py-0.5 rounded">
                      {l.reference}
                    </span>
                  </td>
                  <td className="text-ink/70">{new Date(l.date).toLocaleString("fr-FR")}</td>
                  <td className="font-semibold">{l.clientNom}</td>
                  <td className="text-ink/62">{l.paiement}</td>
                  <td className="text-right num font-semibold">{l.total.toLocaleString("fr-FR")} FCFA</td>
                  <td className="text-right pr-2.5">
                    <div className="inline-flex gap-2">
                      <button onClick={() => ouvrir(l)} className="text-ink/55 hover:text-lime-deep" title="Voir">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => ouvrir(l)} className="text-ink/55 hover:text-lime-deep" title="Télécharger / imprimer">
                        <Download size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>

      <Modal
        open={!!ligneOuverte}
        onClose={fermer}
        title={ligneOuverte?.type === "vente" ? `Facture ${ligneOuverte?.reference}` : `Reçu ${ligneOuverte?.reference ?? ""}`}
      >
        {ligneOuverte?.type === "vente" ? (
          chargement || !detailVente ? (
            <p className="text-xs text-ink/55 italic py-6 text-center">Chargement...</p>
          ) : (
            <FactureApercu
              numero={detailVente.numero}
              statut={
                detailVente.paiements.some((p) => p.mode === "credit" && p.montant > 0)
                  ? detailVente.paiements.filter((p) => p.mode !== "credit").reduce((s, p) => s + p.montant, 0) > 0
                    ? "partielle"
                    : "impayee"
                  : "payee"
              }
              clientNom={detailVente.clientNom}
              lignes={detailVente.lignes}
              total={detailVente.total}
              paiements={detailVente.paiements}
            />
          )
        ) : (
          ligneOuverte && <ApercuRemboursement ligne={ligneOuverte} />
        )}
      </Modal>
    </div>
  );
}

function ApercuRemboursement({ ligne }: { ligne: Ligne }) {
  function texteWhatsApp() {
    return (
      `*Lime-électronique* — Reçu ${ligne.reference}\n` +
      `Client : ${ligne.clientNom}\n` +
      `Date : ${new Date(ligne.date).toLocaleString("fr-FR")}\n` +
      `Mode : ${ligne.paiement}\n` +
      `Montant : ${ligne.total.toLocaleString("fr-FR")} FCFA\n\n` +
      `Lime-électronique — ${TELEPHONE_ENTREPRISE}`
    );
  }

  return (
    <div className="space-y-3">
      <div id="zone-impression" className="bg-white border border-argent/25 rounded-lg shadow-[0_1px_2px_rgba(8,48,120,0.05)] p-4 text-xs font-mono">
        <div className="text-center mb-3">
          <div className="font-display font-semibold text-sm">Lime-électronique</div>
          <div className="text-ink/62">Reçu de paiement de créance</div>
          <div className="text-ink/62">{TELEPHONE_ENTREPRISE}</div>
        </div>
        <div className="border-t border-dashed border-ink/20 my-2" />
        <div>Référence : {ligne.reference}</div>
        <div>Client : {ligne.clientNom}</div>
        <div>Date : {new Date(ligne.date).toLocaleString("fr-FR")}</div>
        <div>Mode : {ligne.paiement}</div>
        <div className="border-t border-dashed border-ink/20 my-2" />
        <div className="flex justify-between font-semibold">
          <span>Montant payé</span>
          <span>{ligne.total.toLocaleString("fr-FR")} FCFA</span>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => window.print()} className="flex-1">
          <Printer size={13} /> Imprimer / PDF
        </Button>
        <Button variant="secondary" size="sm" onClick={() => partagerWhatsApp(texteWhatsApp())} className="flex-1">
          <Share2 size={13} /> WhatsApp
        </Button>
      </div>
    </div>
  );
}
