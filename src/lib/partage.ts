// Coordonnées de l'entreprise à afficher sur les factures/reçus, et petit
// utilitaire de partage WhatsApp réutilisé partout où on affiche un
// document imprimable (facture de vente, reçu de paiement de crédit).

export const TELEPHONE_ENTREPRISE = "+223 68 68 55 14";

/**
 * Partage un texte via WhatsApp. Utilise l'API native de partage du
 * téléphone/navigateur quand elle est disponible (meilleure intégration,
 * fonctionne aussi avec d'autres apps) ; sinon ouvre directement WhatsApp
 * (app ou web.whatsapp.com) avec le texte pré-rempli.
 */
export async function partagerWhatsApp(texte: string, titre = "Lime-électronique") {
  if (typeof navigator !== "undefined" && "share" in navigator) {
    try {
      await navigator.share({ title: titre, text: texte });
      return;
    } catch {
      // L'utilisateur a annulé le partage natif, ou l'API n'a pas marché —
      // on retombe sur le lien WhatsApp direct ci-dessous.
    }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(texte)}`, "_blank");
}
