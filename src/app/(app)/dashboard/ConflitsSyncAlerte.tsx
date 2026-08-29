"use client";

// Résolution manuelle d'un conflit de synchronisation (BR-08/UC-08bis).
// Cette page (dashboard/page.tsx) redirige déjà tout compte "caisse" vers
// /caisse avant même de charger ce composant — inutile de revérifier le
// rôle ici, seul un propriétaire peut l'atteindre.
//
// "Résoudre" se contente de lever le badge conflit_sync = false : la vente
// et le stock (resté à sa valeur actuelle, jamais décrémenté pour la ligne
// en conflit) ne sont pas touchés. À n'utiliser qu'après avoir vérifié dans
// la vraie vie si l'article a été remis au client — sinon, annuler la vente
// depuis Factures est la bonne action (mais attention : annuler une vente
// en conflit réincrémente son stock via le trigger, alors que ce stock
// n'avait jamais été décrémenté au départ pour cette ligne précise — vérifie
// le stock manuellement après une annulation dans ce cas précis).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertOctagon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type VenteConflit = { id: string; numero_facture: string; date: string; montant_total: number };

export default function ConflitsSyncAlerte({ ventes }: { ventes: VenteConflit[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [venteEnCours, setVenteEnCours] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function resoudre(venteId: string) {
    setEnvoi(true);
    setErreur(null);
    const { error } = await supabase.from("ventes").update({ conflit_sync: false }).eq("id", venteId);
    setEnvoi(false);
    if (error) {
      setErreur(error.message);
      return;
    }
    setVenteEnCours(null);
    router.refresh();
  }

  return (
    <div className="bg-signal/5 border border-signal/20 rounded-lg p-4">
      <h2 className="flex items-center gap-1.5 text-sm font-display font-semibold mb-2 text-signal">
        <AlertOctagon size={15} />
        {ventes.length} vente(s) en conflit de synchronisation
      </h2>
      <p className="text-xs text-signal/80 mb-2">
        Stock devenu insuffisant entre l&apos;enregistrement hors-ligne et la synchronisation — vérifie si
        l&apos;article a vraiment été remis au client avant de résoudre.
      </p>
      <div className="overflow-x-auto table-scroll-fade">
        <table className="w-full text-xs">
          <thead className="text-signal/60 text-left">
            <tr>
              <th className="py-1">Facture</th>
              <th>Date</th>
              <th>Montant</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {ventes.map((v) => (
              <tr key={v.id} className="border-t border-signal/10">
                <td className="py-1">{v.numero_facture}</td>
                <td>{new Date(v.date).toLocaleString("fr-FR")}</td>
                <td className="num">{Number(v.montant_total).toLocaleString("fr-FR")} FCFA</td>
                <td className="text-right pl-2">
                  {venteEnCours === v.id ? (
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      <button
                        onClick={() => resoudre(v.id)}
                        disabled={envoi}
                        className="text-ok underline text-[11px] disabled:opacity-50"
                      >
                        {envoi ? "..." : "Confirmer"}
                      </button>
                      <button onClick={() => setVenteEnCours(null)} className="text-ink/45 underline text-[11px]">
                        Retour
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setVenteEnCours(v.id)}
                      className="text-signal hover:text-ink underline text-[11px]"
                    >
                      Résoudre
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {erreur && <p className="text-[11px] text-signal mt-2">{erreur}</p>}
    </div>
  );
}
