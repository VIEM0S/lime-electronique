"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/types/database.types";

const ALL_LINKS = [
  { href: "/dashboard", label: "Tableau de bord", roles: ["proprietaire"] as Role[] },
  { href: "/caisse", label: "Caisse / Vente", roles: ["proprietaire", "caisse"] as Role[] },
  { href: "/session-caisse", label: "Session de caisse", roles: ["proprietaire", "caisse"] as Role[] },
  { href: "/catalogue", label: "Catalogue", roles: ["proprietaire"] as Role[] },
  { href: "/clients", label: "Clients & créances", roles: ["proprietaire"] as Role[] },
  { href: "/approvisionnement", label: "Approvisionnement", roles: ["proprietaire"] as Role[] },
  { href: "/utilisateurs", label: "Utilisateurs", roles: ["proprietaire"] as Role[] },
];

export default function Nav({ role }: { role: Role }) {
  const pathname = usePathname();
  const links = ALL_LINKS.filter((l) => l.roles.includes(role));

  return (
    <nav className="flex gap-1 bg-gray-300 px-6 pt-2 overflow-x-auto">
      {links.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`text-xs font-semibold px-4 py-2 rounded-t whitespace-nowrap ${
              active ? "bg-white text-accent" : "bg-gray-200 text-gray-600"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
