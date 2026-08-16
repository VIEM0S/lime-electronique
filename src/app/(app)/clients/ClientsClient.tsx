"use client";

import { useMemo, useState } from "react";
import { Plus, Wallet, Pencil } from "lucide-react";
import PaiementModal from "./PaiementModal";
import NouveauClientModal from "./NouveauClientModal";
import ModifierClientModal from "./ModifierClientModal";
import Button from "@/components/ui/Button";
import Toast, { type ToastMsg } from "@/components/ui/Toast";
import Pagination, { usePagination } from "@/components/ui/Pagination";
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
  const { page, setPage, totalPages, itemsPage: clientsPage } = usePagination(filtres);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
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

      <div className="bg-white border border-argent/25 rounded-lg shadow-card overflow-hidden">
        <div className="overflow-x-auto table-scroll-fade">
          <table className="w-full text-xs">
            <thead className="bg-argent/10 text-ink/55 text-left">
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
                  <td colSpan={5} className="p-6 text-center text-ink/45 italic">
                    Aucun client trouvé.
                  </td>
                </tr>
              )}
              {clientsPage.map((c) => (
                <tr key={c.id} className="border-t border-ink/5 hover:bg-lime/5 transition-colors">
                  <td className="p-2.5">{c.nom}</td>
                  <td className="text-ink/62">{c.telephone ?? "—"}</td>
                  <td className="text-ink/62">{c.quartier ?? "—"}</td>
                  <td className={`num ${Number(c.solde_du) > 0 ? "text-ember font-semibold" : "text-ink/55"}`}>
                    {Number(c.solde_du).toLocaleString("fr-FR")} FCFA
                  </td>
                  <td className="pr-2.5 text-right space-x-3 whitespace-nowrap">
                    <button
                      onClick={() => setClientEdite(c)}
                      className="inline-flex items-center gap-1 text-ink/55 hover:text-lime-deep text-[11px] font-semibold"
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
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
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
