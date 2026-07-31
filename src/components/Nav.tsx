"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Truck,
  Settings,
  BarChart3,
  Menu,
  X,
  FileText,
} from "lucide-react";
import type { Role } from "@/types/database.types";

const ALL_LINKS = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, roles: ["proprietaire"] as Role[] },
  { href: "/caisse", label: "Caisse", icon: ShoppingCart, roles: ["proprietaire", "caisse"] as Role[] },
  { href: "/factures", label: "Factures", icon: FileText, roles: ["proprietaire", "caisse"] as Role[] },
  { href: "/catalogue", label: "Catalogue", icon: Package, roles: ["proprietaire"] as Role[] },
  { href: "/clients", label: "Clients & créances", icon: Users, roles: ["proprietaire"] as Role[] },
  { href: "/approvisionnement", label: "Approvisionnement", icon: Truck, roles: ["proprietaire"] as Role[] },
  { href: "/rapports", label: "Rapports & Analytics", icon: BarChart3, roles: ["proprietaire"] as Role[] },
  { href: "/parametres", label: "Paramètres", icon: Settings, roles: ["proprietaire"] as Role[] },
];

// Barre desktop, pensée pour être insérée à l'intérieur de l'en-tête (une
// seule barre sombre au lieu de deux empilées) plutôt que dans sa propre ligne.
export function NavLinksDesktop({ role }: { role: Role }) {
  const pathname = usePathname();
  const links = ALL_LINKS.filter((l) => l.roles.includes(role));

  return (
    <nav className="hidden md:flex items-center gap-0.5 overflow-x-auto">
      {links.map((l) => {
        const active = pathname === l.href;
        const Icon = l.icon;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-md whitespace-nowrap transition-colors duration-150 ${
              active ? "text-lime bg-white/10" : "text-white/68 hover:text-white/90 hover:bg-white/5"
            }`}
          >
            <Icon size={13} strokeWidth={2.25} />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

// Bouton hamburger + menu plein écran pour mobile — remplace l'ancienne
// deuxième barre "Menu" séparée : le déclencheur vit maintenant dans l'en-tête.
export function NavMobileMenuButton({ role }: { role: Role }) {
  const pathname = usePathname();
  const links = ALL_LINKS.filter((l) => l.roles.includes(role));
  const [ouvert, setOuvert] = useState(false);
  const actif = links.find((l) => l.href === pathname);

  return (
    <>
      <button
        onClick={() => setOuvert(true)}
        aria-label="Menu"
        className="md:hidden flex items-center gap-1.5 text-white/85 p-1.5 -mr-1.5"
      >
        <Menu size={19} />
      </button>

      {ouvert && (
        <div className="md:hidden fixed inset-0 z-[60] bg-ink flex flex-col">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10">
            <span className="text-white font-display font-semibold text-sm">
              {actif ? actif.label : "Menu"}
            </span>
            <button onClick={() => setOuvert(false)} aria-label="Fermer" className="text-white/70 p-1">
              <X size={18} />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto py-2">
            {links.map((l) => {
              const active = pathname === l.href;
              const Icon = l.icon;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOuvert(false)}
                  className={`flex items-center gap-3 px-5 py-3.5 text-sm font-semibold border-l-4 transition-colors ${
                    active ? "text-lime border-lime bg-lime/5" : "text-white/70 border-transparent"
                  }`}
                >
                  <Icon size={16} strokeWidth={2.25} />
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}
