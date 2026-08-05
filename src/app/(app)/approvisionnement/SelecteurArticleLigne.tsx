"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";

type ArticleLite = { id: string; code_article: string; nom: string };

export default function SelecteurArticleLigne({
  articles,
  valeurSelectionnee,
  onSelectionner,
}: {
  articles: ArticleLite[];
  valeurSelectionnee: string;
  onSelectionner: (id: string) => void;
}) {
  const articleActuel = articles.find((a) => a.id === valeurSelectionnee);
  const [recherche, setRecherche] = useState(articleActuel ? `${articleActuel.code_article} — ${articleActuel.nom}` : "");
  const [ouvert, setOuvert] = useState(false);

  // Garde le texte affiché synchronisé si la sélection change de l'extérieur
  // (ex: après création d'un nouvel article depuis cette même ligne).
  useEffect(() => {
    if (articleActuel) setRecherche(`${articleActuel.code_article} — ${articleActuel.nom}`);
  }, [valeurSelectionnee]); // eslint-disable-line react-hooks/exhaustive-deps

  const q = recherche.trim().toLowerCase();
  const resultats = (
    q.length > 0
      ? articles.filter((a) => a.code_article.toLowerCase().includes(q) || a.nom.toLowerCase().includes(q))
      : articles
  ).slice(0, 8);

  return (
    <div className="relative w-full sm:flex-1 sm:w-auto min-w-0">
      <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/40 pointer-events-none" />
      <input
        value={recherche}
        onChange={(e) => {
          setRecherche(e.target.value);
          setOuvert(true);
          if (valeurSelectionnee) onSelectionner("");
        }}
        onFocus={() => setOuvert(true)}
        onBlur={() => setTimeout(() => setOuvert(false), 150)}
        placeholder="Rechercher (code ou nom)..."
        className="w-full border border-ink/15 rounded-md pl-7 pr-2 py-1.5 text-xs"
      />
      {ouvert && (
        <div className="absolute z-10 bg-white border border-argent/25 rounded-md mt-1 w-full shadow-lg max-h-52 overflow-y-auto">
          {resultats.length === 0 && <p className="px-3 py-2 text-xs text-ink/45 italic">Aucun article trouvé</p>}
          {resultats.map((a) => (
            <button
              key={a.id}
              type="button"
              onMouseDown={() => {
                onSelectionner(a.id);
                setRecherche(`${a.code_article} — ${a.nom}`);
                setOuvert(false);
              }}
              className="block w-full text-left px-3 py-2 text-xs hover:bg-lime/10 transition-colors"
            >
              {a.code_article} — {a.nom}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
