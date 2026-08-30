// Export CSV générique (rapports, factures). Délimiteur `;` plutôt que `,` :
// Excel en locale française attend `;` par défaut (la virgule y est déjà le
// séparateur décimal), sinon tout s'ouvre dans une seule colonne.
function champCSV(valeur: string | number): string {
  const s = String(valeur);
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Formate une date/heure pour un export CSV destiné à Excel — évite
// `toLocaleString` : Excel essaie souvent de réinterpréter une valeur qui
// *ressemble* à une date, et selon ses réglages régionaux (pas forcément
// français, même sur un fichier généré en français) peut la lire de travers
// ou l'afficher vide plutôt que planter franchement (rapporté par le
// client sur l'export Factures). Enveloppée en `="..."` : c'est la
// technique standard reconnue par Excel/LibreOffice/Google Sheets pour
// forcer une cellule à garder EXACTEMENT ce texte, jamais réinterprétée
// comme une date ou un nombre.
export function dateHeureCSV(iso: string): string {
  const d = new Date(iso);
  const p2 = (n: number) => String(n).padStart(2, "0");
  const texte = `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
  return `="${texte}"`;
}

export function telechargerCSV(nomFichier: string, lignes: (string | number)[][]) {
  const contenu = lignes.map((ligne) => ligne.map(champCSV).join(";")).join("\r\n");
  // BOM UTF-8 : sans lui, Excel affiche les accents (é, è, à...) mal décodés.
  const blob = new Blob(["﻿" + contenu], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = nomFichier;
  lien.click();
  URL.revokeObjectURL(url);
}
