"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const TAILLE_PAGE = 30;

/**
 * Découpe une liste en pages de 30 éléments. Se réinitialise à la page 1
 * si la liste change de taille (ex: recherche/filtre appliqué) pour éviter
 * de se retrouver sur une page vide.
 */
export function usePagination<T>(items: T[], taillePage: number = TAILLE_PAGE) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / taillePage));

  useEffect(() => {
    setPage(1);
  }, [items.length]);

  const pageEffective = Math.min(page, totalPages);
  const itemsPage = useMemo(
    () => items.slice((pageEffective - 1) * taillePage, pageEffective * taillePage),
    [items, pageEffective, taillePage]
  );

  return { page: pageEffective, setPage, totalPages, itemsPage, total: items.length, taillePage };
}

export default function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  // Affiche au maximum 10 numéros de page à la fois (comme demandé), avec
  // des flèches précédent/suivant. Si plus de 10 pages, on centre la
  // fenêtre autour de la page courante.
  const maxNumeros = 10;
  let debut = Math.max(1, page - Math.floor(maxNumeros / 2));
  let fin = Math.min(totalPages, debut + maxNumeros - 1);
  debut = Math.max(1, fin - maxNumeros + 1);
  const numeros = Array.from({ length: fin - debut + 1 }, (_, i) => debut + i);

  return (
    <div className="flex items-center justify-center gap-1 pt-3">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="p-1.5 rounded-md text-ink/55 hover:text-lime-deep hover:bg-lime/5 disabled:opacity-30 disabled:hover:bg-transparent"
        aria-label="Page précédente"
      >
        <ChevronLeft size={14} />
      </button>
      {debut > 1 && (
        <>
          <button onClick={() => onChange(1)} className="w-7 h-7 rounded-md text-xs text-ink/62 hover:bg-lime/5">1</button>
          {debut > 2 && <span className="text-ink/45 text-xs px-0.5">…</span>}
        </>
      )}
      {numeros.map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`w-7 h-7 rounded-md text-xs font-semibold ${
            n === page ? "bg-lime text-white" : "text-ink/62 hover:bg-lime/5"
          }`}
        >
          {n}
        </button>
      ))}
      {fin < totalPages && (
        <>
          {fin < totalPages - 1 && <span className="text-ink/45 text-xs px-0.5">…</span>}
          <button onClick={() => onChange(totalPages)} className="w-7 h-7 rounded-md text-xs text-ink/62 hover:bg-lime/5">
            {totalPages}
          </button>
        </>
      )}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        className="p-1.5 rounded-md text-ink/55 hover:text-lime-deep hover:bg-lime/5 disabled:opacity-30 disabled:hover:bg-transparent"
        aria-label="Page suivante"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
