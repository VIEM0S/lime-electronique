// Route Handler protégée — changement direct du mot de passe d'un utilisateur.
// Remplace resetPasswordForEmail() : les comptes utilisent des domaines fictifs
// (@lime-electronique.ml) qui ne reçoivent jamais l'email de réinitialisation.
// Le propriétaire définit donc le nouveau mot de passe lui-même, en direct.
//
// Variable d'environnement requise (serveur uniquement) : SUPABASE_SERVICE_ROLE_KEY

import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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

  const { motDePasse } = await req.json();

  if (!motDePasse || String(motDePasse).length < 6) {
    return NextResponse.json(
      { error: "Le mot de passe doit contenir au moins 6 caractères." },
      { status: 400 }
    );
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY non configurée côté serveur." },
      { status: 500 }
    );
  }

  const admin = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await admin.auth.admin.updateUserById(params.id, {
    password: motDePasse,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
