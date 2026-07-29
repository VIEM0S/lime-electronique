// Edge Function : notifier-session-caisse
//
// Appelée par un trigger Postgres (pg_net) à l'ouverture et à la fermeture
// d'une session de caisse. Envoie une vraie notification push (navigateur/
// téléphone, via le protocole Web Push standard — pas de SMS/WhatsApp,
// aucun coût par message) à tous les comptes "propriétaire" abonnés.
//
// IMPORTANT : utilise @negrel/webpush (natif Deno / Web Crypto), pas le
// package npm "web-push". Ce dernier signe le JWT VAPID d'une façon que
// Google accepte mais qu'Apple rejette systématiquement avec une erreur
// "BadJwtToken" (403) sous Deno — bug connu du shim crypto Node de ce
// package quand il tourne hors Node.js.

import { createClient } from "npm:@supabase/supabase-js@2";
import * as webpush from "jsr:@negrel/webpush";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_JWK_PUBLIC = JSON.parse(Deno.env.get("VAPID_JWK_PUBLIC")!);
const VAPID_JWK_PRIVATE = JSON.parse(Deno.env.get("VAPID_JWK_PRIVATE")!);

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

    const vapidKeys = await webpush.importVapidKeys(
      { publicKey: VAPID_JWK_PUBLIC, privateKey: VAPID_JWK_PRIVATE },
      { extractable: true }
    );
    const appServer = await webpush.ApplicationServer.new({
      contactInformation: "mailto:contact@lime-electronique.example",
      vapidKeys,
    });

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
    const notifPayload = JSON.stringify({ title, body, url: "/session-caisse", urgent });

    let envoyes = 0;
    const abonnementsExpires: string[] = [];
    const details: { endpoint: string; ok: boolean; erreur?: string; statusCode?: number }[] = [];

    await Promise.all(
      abonnements.map(async (abo) => {
        const hote = new URL(abo.endpoint).hostname;
        try {
          const sub = appServer.subscribe({
            endpoint: abo.endpoint,
            keys: { p256dh: abo.p256dh, auth: abo.auth },
          } as any);
          await sub.pushTextMessage(notifPayload, {});
          envoyes++;
          details.push({ endpoint: hote, ok: true });
        } catch (err: any) {
          const statusCode = err?.response?.status ?? err?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            abonnementsExpires.push(abo.id);
          }
          details.push({
            endpoint: hote,
            ok: false,
            erreur: String(err?.message ?? err),
            statusCode,
          });
        }
      })
    );

    if (abonnementsExpires.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", abonnementsExpires);
    }

    return new Response(JSON.stringify({ ok: true, envoyes, nettoyes: abonnementsExpires.length, details }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: String(err?.stack ?? err?.message ?? err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
