// Edge Function : notifier-session-caisse
//
// Appelée par un trigger Postgres (pg_net) à l'ouverture et à la fermeture
// d'une session de caisse. Envoie une vraie notification push (navigateur/
// téléphone, via le protocole Web Push standard — pas de SMS/WhatsApp,
// aucun coût par message) à tous les comptes "propriétaire" abonnés.

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;

webpush.setVapidDetails(
  "mailto:contact@lime-electronique.example",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

function formaterFCFA(montant: number | null): string {
  if (montant === null || montant === undefined) return "0 FCFA";
  return Math.round(montant).toLocaleString("fr-FR") + " FCFA";
}

function construireMessage(payload: any): { title: string; body: string; urgent: boolean } {
  if (payload.type === "ouverture") {
    return {
      title: "Lime-électronique — Session ouverte",
      body: `Fonds initial : ${formaterFCFA(payload.montant_ouverture)}.`,
      urgent: false,
    };
  }

  // fermeture
  const ecart = Number(payload.ecart ?? 0);
  if (ecart < 0) {
    return {
      title: "⚠ Lime-électronique — Écart de caisse NÉGATIF",
      body: `Théorique ${formaterFCFA(payload.montant_theorique)}, compté ${formaterFCFA(
        payload.montant_fermeture_declare
      )} — manque ${formaterFCFA(Math.abs(ecart))}.`,
      urgent: true,
    };
  }
  return {
    title: "Lime-électronique — Session fermée",
    body: `Écart : ${formaterFCFA(ecart)}. Théorique ${formaterFCFA(payload.montant_theorique)}, compté ${formaterFCFA(
      payload.montant_fermeture_declare
    )}.`,
    urgent: false,
  };
}

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json();
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Cible : tous les comptes propriétaire (pas seulement celui qui a
    // ouvert/fermé la session, pour couvrir le cas où un caissier agit).
    const { data: proprietaires, error: errProprios } = await supabase
      .from("profils")
      .select("id")
      .eq("role", "proprietaire");

    if (errProprios) throw errProprios;
    const ids = (proprietaires ?? []).map((p) => p.id);
    if (ids.length === 0) {
      return new Response(JSON.stringify({ ok: true, envoyes: 0, raison: "aucun propriétaire" }), { status: 200 });
    }

    const { data: abonnements, error: errAbos } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .in("utilisateur_id", ids);

    if (errAbos) throw errAbos;
    if (!abonnements || abonnements.length === 0) {
      return new Response(JSON.stringify({ ok: true, envoyes: 0, raison: "aucun abonnement" }), { status: 200 });
    }

    const { title, body, urgent } = construireMessage(payload);
    const notifPayload = JSON.stringify({
      title,
      body,
      url: "/session-caisse",
      urgent,
    });

    let envoyes = 0;
    const abonnementsExpires: string[] = [];

    await Promise.all(
      abonnements.map(async (abo) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: abo.endpoint,
              keys: { p256dh: abo.p256dh, auth: abo.auth },
            },
            notifPayload
          );
          envoyes++;
        } catch (err: any) {
          // 404/410 = l'abonnement n'est plus valide côté navigateur (app
          // désinstallée, permission retirée...) — on le nettoie.
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            abonnementsExpires.push(abo.id);
          }
        }
      })
    );

    if (abonnementsExpires.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", abonnementsExpires);
    }

    return new Response(JSON.stringify({ ok: true, envoyes, nettoyes: abonnementsExpires.length }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: String(err?.message ?? err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
