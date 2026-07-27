"use client";

import { useMemo, useState } from "react";
import { Plus, Wallet, Pencil } from "lucide-react";
import PaiementModal from "./PaiementModal";
import NouveauClientModal from "./NouveauClientModal";
import ModifierClientModal from "./ModifierClientModal";
import Button from "@/components/ui/Button";
import Toast, { type ToastMsg } from "@/components/ui/Toast";
import type { Client } from "@/types/database.types";

export default function ClientsClient({ clients }: { clients: Client[] }) {
  const [clientPaiement, setClientPaiement] = useState<Client | null>(null);
  const [clientEdite, setClientEdite] = useState<Client | null>(null);
  const [modalNouveau, setModalNouveau] = useState(false);
  const [toast, setToast] = useState<ToastMsg>(null);
  const [recherche, setRecherche] = useState("");

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) => c.nom.toLowerCase().includes(q) || (c.telephone ?? "").toLowerCase().includes(q)
    );
  }, [clients, recherche]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-display font-semibold text-ink">Clients & créances</h1>
          <p className="text-xs text-ink/40 italic">Suivi des ventes à crédit (FR-15 à FR-18)</p>
        </div>
        <Button size="sm" onClick={() => setModalNouveau(true)}>
          <Plus size={14} /> Nouveau client
        </Button>
      </div>

      <input
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder="Rechercher par nom ou téléphone..."
        className="w-full max-w-sm border border-ink/15 rounded-md px-3 py-2 text-sm focus:border-lime-deep focus:ring-1 focus:ring-lime-deep"
      />

      <div className="bg-white border border-ink/10 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-ink/[0.03] text-ink/40 text-left">
            <tr>
              <th className="p-2.5">Client</th>
              <th>Téléphone</th>
              <th>Quartier</th>
              <th>Solde dû</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtres.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-ink/30 italic">
                  Aucun client trouvé.
                </td>
              </tr>
            )}
            {filtres.map((c) => (
              <tr key={c.id} className="border-t border-ink/5 hover:bg-lime/5 transition-colors">
                <td className="p-2.5">{c.nom}</td>
                <td className="text-ink/50">{c.telephone ?? "—"}</td>
                <td className="text-ink/50">{c.quartier ?? "—"}</td>
                <td className={`num ${Number(c.solde_du) > 0 ? "text-ember font-semibold" : "text-ink/40"}`}>
                  {Number(c.solde_du).toLocaleString("fr-FR")} FCFA
                </td>
                <td className="pr-2.5 text-right space-x-3 whitespace-nowrap">
                  <button
                    onClick={() => setClientEdite(c)}
                    className="inline-flex items-center gap-1 text-ink/40 hover:text-lime-deep text-[11px] font-semibold"
                  >
                    <Pencil size={12} /> Modifier
                  </button>
                  {Number(c.solde_du) > 0 && (
                    <button
                      onClick={() => setClientPaiement(c)}
                      className="inline-flex items-center gap-1 text-lime-deep hover:text-ink text-[11px] font-semibold"
                    >
                      <Wallet size={12} /> Paiement
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PaiementModal
        open={!!clientPaiement}
        onClose={() => setClientPaiement(null)}
        client={clientPaiement}
        onSaved={(msg) => setToast({ type: "success", text: msg })}
      />
      <NouveauClientModal
        open={modalNouveau}
        onClose={() => setModalNouveau(false)}
        onSaved={(msg) => setToast({ type: "success", text: msg })}
      />
      <ModifierClientModal
        open={!!clientEdite}
        onClose={() => setClientEdite(null)}
        client={clientEdite}
        onSaved={(msg) => setToast({ type: "success", text: msg })}
      />
      <Toast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}
