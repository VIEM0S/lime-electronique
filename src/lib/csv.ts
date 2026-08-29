// Export CSV générique (rapports). Délimiteur `;` plutôt que `,` : Excel en
// locale française attend `;` par défaut (la virgule y est déjà le
// séparateur décimal), sinon tout s'ouvre dans une seule colonne.
function champCSV(valeur: string | number): string {
  const s = String(valeur);
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
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
