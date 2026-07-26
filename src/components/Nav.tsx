"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Wallet,
  Package,
  Users,
  Truck,
  UserCog,
  CreditCard,
  BarChart3,
} from "lucide-react";
import type { Role } from "@/types/database.types";

const ALL_LINKS = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, roles: ["proprietaire"] as Role[] },
  { href: "/caisse", label: "Caisse", icon: ShoppingCart, roles: ["proprietaire", "caisse"] as Role[] },
  { href: "/session-caisse", label: "Session de caisse", icon: Wallet, roles: ["proprietaire", "caisse"] as Role[] },
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

  return (
    <nav className="flex gap-1 bg-ink px-4 sm:px-6 overflow-x-auto">
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
  );
}
