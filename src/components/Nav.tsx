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
  UserCog,
  CreditCard,
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
  { href: "/credits", label: "Crédits", icon: CreditCard, roles: ["proprietaire"] as Role[] },
  { href: "/approvisionnement", label: "Approvisionnement", icon: Truck, roles: ["proprietaire"] as Role[] },
  { href: "/rapports", label: "Rapports & Analytics", icon: BarChart3, roles: ["proprietaire"] as Role[] },
  { href: "/utilisateurs", label: "Utilisateurs", icon: UserCog, roles: ["proprietaire"] as Role[] },
];

export default function Nav({ role }: { role: Role }) {
  const pathname = usePathname();
  const links = ALL_LINKS.filter((l) => l.roles.includes(role));
  const [ouvert, setOuvert] = useState(false);
  const actif = links.find((l) => l.href === pathname);

  return (
    <>
      {/* Mobile (< md) : bouton qui ouvre un menu plein écran, écran par écran empilé */}
      <div className="md:hidden bg-ink border-t border-white/10">
        <button
          onClick={() => setOuvert(true)}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white/80"
        >
          <Menu size={16} />
          {actif ? actif.label : "Menu"}
        </button>
      </div>

      {ouvert && (
        <div className="md:hidden fixed inset-0 z-[60] bg-ink flex flex-col">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10">
            <span className="text-white font-display font-semibold text-sm">Menu</span>
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

      {/* Desktop (>= md) : barre horizontale classique */}
      <nav className="hidden md:flex gap-1 bg-ink px-4 sm:px-6 overflow-x-auto">
        {links.map((l) => {
          const active = pathname === l.href;
          const Icon = l.icon;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2.5 whitespace-nowrap
                border-b-2 transition-colors duration-150
                ${
                  active
                    ? "text-lime border-lime"
                    : "text-white/55 border-transparent hover:text-white/85 hover:border-white/20"
                }`}
            >
              <Icon size={14} strokeWidth={2.25} />
              {l.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
