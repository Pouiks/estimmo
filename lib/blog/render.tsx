import type { ReactNode } from "react";
import Link from "next/link";

/**
 * Rendu serveur du JSON TipTap → React (sans dépendance).
 * Types de nœuds couverts : ceux produits par l'éditeur de l'admin
 * (paragraph, heading 2-3, listes, blockquote, image, hardBreak, text
 * avec marques bold/italic/link).
 */
interface TiptapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: TiptapMark[];
  text?: string;
}

function renderText(node: TiptapNode, key: number): ReactNode {
  let element: ReactNode = node.text ?? "";
  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") element = <strong key={key}>{element}</strong>;
    else if (mark.type === "italic") element = <em key={key}>{element}</em>;
    else if (mark.type === "link") {
      const href = String(mark.attrs?.href ?? "#");
      const externe = /^https?:\/\//.test(href);
      element = externe ? (
        <a
          key={key}
          href={href}
          rel="noopener noreferrer nofollow"
          target="_blank"
          className="text-primary underline underline-offset-4"
        >
          {element}
        </a>
      ) : (
        <Link key={key} href={href} className="text-primary underline underline-offset-4">
          {element}
        </Link>
      );
    }
  }
  return element;
}

function renderNode(node: TiptapNode, key: number): ReactNode {
  const children = (node.content ?? []).map((child, i) => renderNode(child, i));

  switch (node.type) {
    case "doc":
      return <div key={key}>{children}</div>;
    case "paragraph":
      return (
        <p key={key} className="my-4 leading-relaxed">
          {children.length > 0 ? children : " "}
        </p>
      );
    case "heading": {
      const level = Number(node.attrs?.level ?? 2);
      return level === 3 ? (
        <h3 key={key} className="mt-8 mb-3 text-xl font-semibold">
          {children}
        </h3>
      ) : (
        <h2 key={key} className="mt-10 mb-4 text-2xl font-bold">
          {children}
        </h2>
      );
    }
    case "bulletList":
      return (
        <ul key={key} className="my-4 list-disc space-y-1 pl-6">
          {children}
        </ul>
      );
    case "orderedList":
      return (
        <ol key={key} className="my-4 list-decimal space-y-1 pl-6">
          {children}
        </ol>
      );
    case "listItem":
      return <li key={key}>{children}</li>;
    case "blockquote":
      return (
        <blockquote
          key={key}
          className="my-6 border-l-4 border-primary/40 pl-4 text-muted-foreground italic"
        >
          {children}
        </blockquote>
      );
    case "image": {
      const src = String(node.attrs?.src ?? "");
      if (!src) return null;
      return (
        // Dimensions inconnues dans le JSON TipTap → <img> avec lazy loading.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={key}
          src={src}
          alt={String(node.attrs?.alt ?? "")}
          loading="lazy"
          className="my-6 h-auto w-full rounded-xl"
        />
      );
    }
    case "hardBreak":
      return <br key={key} />;
    case "text":
      return renderText(node, key);
    default:
      return children.length > 0 ? <div key={key}>{children}</div> : null;
  }
}

export function ArticleContent({ contenu }: { contenu: unknown }) {
  if (!contenu || typeof contenu !== "object") return null;
  return <>{renderNode(contenu as TiptapNode, 0)}</>;
}

/** Texte brut (pour extraits / description par défaut). */
export function extraireTexte(contenu: unknown, maxLength = 200): string {
  const morceaux: string[] = [];
  function walk(node: TiptapNode) {
    if (node.text) morceaux.push(node.text);
    node.content?.forEach(walk);
  }
  if (contenu && typeof contenu === "object") walk(contenu as TiptapNode);
  const texte = morceaux.join(" ").replace(/\s+/g, " ").trim();
  return texte.length > maxLength ? `${texte.slice(0, maxLength - 1)}…` : texte;
}
