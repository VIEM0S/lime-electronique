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

/**
 * Convertit un élément du DOM (la facture/le reçu affiché à l'écran) en
 * vraie image PNG, puis la partage — sur WhatsApp ça arrive comme une
 * photo fixe, pas un message modifiable. Sur téléphone (Android/iPhone),
 * utilise le partage natif avec fichier ; sur PC (qui n'a pas cette
 * capacité), télécharge l'image à la place pour un envoi manuel.
 */
export async function partagerImageWhatsApp(element: HTMLElement | null, nomFichier: string, legende?: string) {
  if (!element) return;

  const html2canvas = (await import("html2canvas")).default;
  const canvas = await html2canvas(element, {
    scale: 2, // netteté correcte à l'écran comme à l'impression
    backgroundColor: "#ffffff",
    useCORS: true,
  });

  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return;

  const fichier = new File([blob], `${nomFichier}.png`, { type: "image/png" });

  if (
    typeof navigator !== "undefined" &&
    "share" in navigator &&
    "canShare" in navigator &&
    navigator.canShare({ files: [fichier] })
  ) {
    try {
      await navigator.share({ files: [fichier], title: nomFichier, text: legende });
      return;
    } catch {
      // Annulé par l'utilisateur, ou navigateur qui a menti sur canShare —
      // on retombe sur le téléchargement plutôt que de ne rien faire.
    }
  }

  // PC ou navigateur sans partage de fichier : téléchargement direct, à
  // envoyer manuellement en pièce jointe/photo sur WhatsApp Web.
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = `${nomFichier}.png`;
  lien.click();
  URL.revokeObjectURL(url);
}
