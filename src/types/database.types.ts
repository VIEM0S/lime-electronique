// Types générés à la main pour correspondre à supabase/schema.sql
// À terme, régénérer avec : supabase gen types typescript --local > src/types/database.types.ts

export type Role = "proprietaire" | "caisse";
export type StatutVente = "payee" | "partielle" | "impayee" | "annulee";
export type ModePaiement = "especes" | "mobile_money" | "virement" | "credit";
export type ModeRemboursement = "especes" | "mobile_money" | "virement";
export type TypeMouvement = "entree" | "sortie";
export type StatutSessionCaisse = "ouverte" | "fermee";

export interface Profil {
  id: string;
  nom: string;
  role: Role;
  actif: boolean;
  created_at: string;
  // Migration 002 — copié depuis auth.users pour affichage/réinitialisation
  email: string | null;
}

export interface Article {
  id: string;
  code_article: string;
  nom: string;
  description: string | null;
  categorie: string | null;
  prix_achat: number | null;
  prix_vente: number;
  quantite_stock: number;
  actif: boolean;
  created_at: string;
}

export interface MouvementStock {
  id: string;
  article_id: string;
  type: TypeMouvement;
  quantite: number;
  motif: string | null;
  date: string;
  utilisateur_id: string | null;
  // Migration 002 — traçabilité avant/après (audit Kafora)
  stock_avant: number | null;
  stock_apres: number | null;
}

export interface Client {
  id: string;
  nom: string;
  telephone: string | null;
  solde_du: number;
  created_at: string;
  // Migration 002 — limite de crédit optionnelle (audit Kafora)
  limite_credit: number | null;
  // Fix 002 — quartier optionnel du client
  quartier: string | null;
}

export interface Vente {
  id: string;
  numero_facture: string;
  client_id: string | null;
  utilisateur_id: string | null;
  date: string;
  montant_total: number;
  statut: StatutVente;
  // FR-30 / BR-07 — annulation (propriétaire uniquement, immuable ensuite)
  motif_annulation: string | null;
  annule_par: string | null;
  date_annulation: string | null;
  // BR-08 / UC-08bis — conflit détecté à la synchronisation hors-ligne
  conflit_sync: boolean;
  // Migration 002 — échéance de la part à crédit (point 3, audit Kafora)
  echeance_credit: string | null;
}

export type StatutCredit = "en_cours" | "en_retard" | "soldee";

// Vue vue_credits_clients (migration_002) — détail des ventes à crédit
// avec échéance, limite et statut.
export interface VueCreditClient {
  vente_id: string;
  numero_facture: string;
  date: string;
  client_id: string;
  client_nom: string;
  client_telephone: string | null;
  limite_credit: number | null;
  montant_total: number;
  echeance_credit: string | null;
  solde_restant: number;
  statut_credit: StatutCredit;
}

export interface VenteLigne {
  id: string;
  vente_id: string;
  article_id: string;
  quantite: number;
  prix_unitaire: number;
  // false uniquement pour une ligne en conflit de synchronisation (BR-08)
  // dont le stock n'a jamais été décrémenté (fix 011).
  stock_decremente: boolean;
}

export interface Paiement {
  id: string;
  vente_id: string;
  mode: ModePaiement;
  montant: number;
  date: string;
}

export interface RemboursementCredit {
  id: string;
  client_id: string;
  montant: number;
  mode: ModeRemboursement;
  date: string;
  utilisateur_id: string | null;
}

export interface Approvisionnement {
  id: string;
  date: string;
  source: string | null;
  cout_transport: number;
  frais_douane: number;
  utilisateur_id: string | null;
}

export interface ApprovisionnementLigne {
  id: string;
  approvisionnement_id: string;
  article_id: string;
  quantite: number;
  cout_unitaire: number;
}

export interface SessionCaisse {
  id: string;
  utilisateur_id: string;
  date_ouverture: string;
  montant_ouverture: number;
  date_fermeture: string | null;
  montant_fermeture_declare: number | null;
  montant_theorique: number | null;
  ecart: number | null;
  statut: StatutSessionCaisse;
  // Fix 005 — commentaire optionnel expliquant l'écart, saisi à la fermeture
  commentaire_fermeture: string | null;
}

// Squelette minimal compatible avec le typage générique de @supabase/ssr.
// À remplacer par le fichier généré automatiquement dès que possible.
export interface Database {
  public: {
    Tables: {
      profils: { Row: Profil; Insert: Partial<Profil>; Update: Partial<Profil> };
      articles: { Row: Article; Insert: Partial<Article>; Update: Partial<Article> };
      mouvements_stock: { Row: MouvementStock; Insert: Partial<MouvementStock>; Update: Partial<MouvementStock> };
      clients: { Row: Client; Insert: Partial<Client>; Update: Partial<Client> };
      ventes: { Row: Vente; Insert: Partial<Vente>; Update: Partial<Vente> };
      ventes_lignes: { Row: VenteLigne; Insert: Partial<VenteLigne>; Update: Partial<VenteLigne> };
      paiements: { Row: Paiement; Insert: Partial<Paiement>; Update: Partial<Paiement> };
      remboursements_credit: { Row: RemboursementCredit; Insert: Partial<RemboursementCredit>; Update: Partial<RemboursementCredit> };
      approvisionnements: { Row: Approvisionnement; Insert: Partial<Approvisionnement>; Update: Partial<Approvisionnement> };
      approvisionnements_lignes: { Row: ApprovisionnementLigne; Insert: Partial<ApprovisionnementLigne>; Update: Partial<ApprovisionnementLigne> };
      sessions_caisse: { Row: SessionCaisse; Insert: Partial<SessionCaisse>; Update: Partial<SessionCaisse> };
    };
  };
}
