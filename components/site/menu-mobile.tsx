"use client";

import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/lib/i18n/navigation";

export interface LienMenu {
  href: string;
  libelle: string;
}

interface Props {
  /** Mêmes liens que la barre de navigation, traduits côté serveur. */
  liens: LienMenu[];
  ariaLabel: string;
}

/** Menu replié des petits écrans (< md) : la barre masque ses liens en dessous. */
export function MenuMobile({ liens, ariaLabel }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={ariaLabel}
            className="md:hidden"
          />
        }
      >
        <MenuIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {liens.map((lien) => (
          <DropdownMenuItem
            key={lien.href}
            render={<Link href={lien.href} />}
            className="cursor-pointer px-2 py-1.5"
          >
            {lien.libelle}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
