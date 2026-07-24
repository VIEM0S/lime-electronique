// Route Handler protégée — création d'utilisateur (FR-22).
// Doit tourner côté serveur car supabase.auth.admin.createUser() nécessite
// la clé service_role, qui ne doit JAMAIS être exposée au navigateur.
//
// Variable d'environnement requise (serveur uniquement, PAS de préfixe
// NEXT_PUBLIC_) : SUPABASE_SERVICE_ROLE_KEY
// -> Supabase Dashboard > Project Settings > API Keys > "service_role secret"

import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  // 1. Vérifie que l'appelant est un propriétaire authentifié.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { data: profilAppelant } = await supabase
    .from("profils")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profilAppelant?.role !== "proprietaire") {
    return NextResponse.json({ error: "Réservé au propriétaire." }, { status: 403 });
  }

  const { email, motDePasse, nom, role } = await req.json();

  if (!email || !motDePasse || !nom || !role) {
    return NextResponse.json({ error: "Champs manquants." }, { status: 400 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY non configurée côté serveur." },
      { status: 500 }
    );
  }

  // 2. Client admin (service_role) — jamais envoyé au navigateur.
  const admin = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: nouveauCompte, error: erreurAuth } = await admin.auth.admin.createUser({
    email,
    password: motDePasse,
    email_confirm: true,
  });

  if (erreurAuth || !nouveauCompte.user) {
    return NextResponse.json({ error: erreurAuth?.message ?? "Échec création compte." }, { status: 400 });
  }

  const { error: erreurProfil } = await admin
    .from("profils")
    .insert({ id: nouveauCompte.user.id, nom, role, actif: true });

  if (erreurProfil) {
    // Rollback : évite un compte Auth orphelin sans profil.
    await admin.auth.admin.deleteUser(nouveauCompte.user.id);
    return NextResponse.json({ error: erreurProfil.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: nouveauCompte.user.id });
}
