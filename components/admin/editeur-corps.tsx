"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import {
  Bold,
  Code2,
  Eye,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Lightbulb,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Megaphone,
  Quote,
  Redo2,
  Table2,
  Undo2,
} from "lucide-react";
import { SelecteurMedia } from "@/components/admin/selecteur-media";
import {
  ARetenir,
  CtaEstimation,
  Figcaption,
  Figure,
  ImageEditoriale,
} from "@/components/admin/tiptap-editorial";
import { Textarea } from "@/components/ui/textarea";
import { normaliserHtmlEditeur } from "@/lib/blog/html";
import { cn } from "@/lib/utils";
import type { MediaChoix } from "@/app/admin/(protected)/blog/actions";

type Mode = "visuel" | "html";

function ToolbarButton({
  onClick,
  active,
  label,
  children,
  texte = false,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: React.ReactNode;
  /** Bouton avec libellé (opérations de tableau) plutôt qu'icône seule. */
  texte?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        texte ? "px-2 py-1 text-xs" : "p-2",
        active && "bg-primary/10 text-primary",
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor, onImage }: { editor: Editor; onImage: () => void }) {
  function toggleLink() {
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const url = window.prompt(
      "Adresse du lien (ex. /estimation ou https://…) :",
      "/",
    );
    if (!url || url === "/") return;
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  const dansTableau = editor.isActive("table");

  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-t-xl border-x border-t bg-muted/40 p-1.5">
      <ToolbarButton
        label="Titre de section (h2)"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Sous-titre (h3)"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Gras"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Italique"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Liste à puces"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Liste numérotée"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Citation"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label={editor.isActive("link") ? "Retirer le lien" : "Insérer un lien"}
        active={editor.isActive("link")}
        onClick={toggleLink}
      >
        {editor.isActive("link") ? (
          <Link2Off className="size-4" />
        ) : (
          <Link2 className="size-4" />
        )}
      </ToolbarButton>

      <span className="mx-1 h-5 w-px bg-border" />

      <ToolbarButton
        label="Encadré « À retenir »"
        active={editor.isActive("aRetenir")}
        onClick={() => editor.chain().focus().toggleWrap("aRetenir").run()}
      >
        <Lightbulb className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Bloc appel à l'action"
        active={editor.isActive("ctaEstimation")}
        onClick={() => editor.chain().focus().toggleWrap("ctaEstimation").run()}
      >
        <Megaphone className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Insérer une image de la bibliothèque"
        onClick={onImage}
      >
        <ImagePlus className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Insérer un tableau"
        active={dansTableau}
        onClick={() =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        }
      >
        <Table2 className="size-4" />
      </ToolbarButton>
      {dansTableau && (
        <>
          <ToolbarButton
            texte
            label="Ajouter une ligne"
            onClick={() => editor.chain().focus().addRowAfter().run()}
          >
            + ligne
          </ToolbarButton>
          <ToolbarButton
            texte
            label="Ajouter une colonne"
            onClick={() => editor.chain().focus().addColumnAfter().run()}
          >
            + colonne
          </ToolbarButton>
          <ToolbarButton
            texte
            label="Supprimer la ligne"
            onClick={() => editor.chain().focus().deleteRow().run()}
          >
            − ligne
          </ToolbarButton>
          <ToolbarButton
            texte
            label="Supprimer la colonne"
            onClick={() => editor.chain().focus().deleteColumn().run()}
          >
            − colonne
          </ToolbarButton>
          <ToolbarButton
            texte
            label="Supprimer le tableau"
            onClick={() => editor.chain().focus().deleteTable().run()}
          >
            supprimer le tableau
          </ToolbarButton>
        </>
      )}

      <span className="mx-1 h-5 w-px bg-border" />

      <ToolbarButton
        label="Annuler"
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Rétablir"
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 className="size-4" />
      </ToolbarButton>
    </div>
  );
}

/**
 * Corps d'un article éditorial : éditeur visuel (rendu identique au site via
 * .article-corps) ou HTML brut, au choix. La valeur échangée avec le parent
 * est toujours le HTML éditorial normalisé.
 */
export function EditeurCorps({
  valeur,
  onChange,
  imagesResolues,
}: {
  valeur: string;
  onChange: (html: string) => void;
  /** Chemin logique → URL affichable des images de l'article (emplacements, public/). */
  imagesResolues: Record<string, string>;
}) {
  const [mode, setMode] = useState<Mode>("visuel");
  const [selecteur, setSelecteur] = useState(false);
  // onChange passe par une ref : l'éditeur n'est recréé que si les images
  // résolues changent (après une action sur un emplacement).
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: { levels: [2, 3] },
          // Liens internes : pas de target/rel ajoutés (le site gère les externes au rendu).
          link: {
            openOnClick: false,
            HTMLAttributes: { target: null, rel: null },
          },
        }),
        ImageEditoriale.configure({
          resoudre: (src) =>
            imagesResolues[src] ?? (/^https?:\/\//.test(src) ? src : null),
        }),
        Figure,
        Figcaption,
        ARetenir,
        CtaEstimation,
        TableKit.configure({ table: { resizable: false } }),
      ],
      content: valeur,
      immediatelyRender: false,
      shouldRerenderOnTransaction: true,
      onUpdate: ({ editor }) =>
        onChangeRef.current(normaliserHtmlEditeur(editor.getHTML())),
      editorProps: {
        attributes: {
          class:
            "article-corps min-h-96 rounded-b-xl border bg-background px-5 py-4 focus:outline-none",
        },
      },
    },
    [imagesResolues],
  );

  function basculer(nouveau: Mode) {
    if (nouveau === mode) return;
    if (nouveau === "visuel" && editor) {
      // Le HTML saisi à la main est relu : il peut être légèrement réorganisé.
      editor.commands.setContent(valeur, { emitUpdate: false });
      onChangeRef.current(normaliserHtmlEditeur(editor.getHTML()));
    }
    setMode(nouveau);
  }

  function insererImage(m: MediaChoix) {
    setSelecteur(false);
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent({
        type: "figure",
        content: [
          {
            type: "image",
            attrs: {
              src: m.url,
              alt: m.alt,
              width: m.largeur,
              height: m.hauteur,
              loading: "lazy",
            },
          },
          ...(m.legende
            ? [
                {
                  type: "figcaption",
                  content: [{ type: "text", text: m.legende }],
                },
              ]
            : []),
        ],
      })
      .run();
  }

  return (
    <div className="editeur-corps space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">Corps de l&apos;article</span>
        <div className="flex rounded-md border p-0.5 text-xs">
          {(
            [
              ["visuel", "Visuel", Eye],
              ["html", "HTML", Code2],
            ] as const
          ).map(([m, libelle, Icone]) => (
            <button
              key={m}
              type="button"
              onClick={() => basculer(m)}
              aria-pressed={mode === m}
              className={cn(
                "flex items-center gap-1 rounded px-2.5 py-1",
                mode === m
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icone className="size-3.5" /> {libelle}
            </button>
          ))}
        </div>
      </div>

      {mode === "visuel" ? (
        editor ? (
          <div>
            <Toolbar editor={editor} onImage={() => setSelecteur(true)} />
            <EditorContent editor={editor} />
          </div>
        ) : (
          <div className="min-h-96 rounded-xl border bg-muted/20" />
        )
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Classes : aside.a-retenir, figure.article-image, div.table-wrapper,
            div.cta-estimation. Pas de h1, de script ni d&apos;iframe.
          </p>
          <Textarea
            rows={28}
            spellCheck={false}
            className="font-mono text-xs leading-relaxed"
            value={valeur}
            onChange={(e) => onChange(e.target.value)}
          />
        </>
      )}

      {selecteur && (
        <SelecteurMedia
          onFermer={() => setSelecteur(false)}
          onChoisir={insererImage}
          largeur={1200}
          hauteur={800}
          occupe={false}
        />
      )}
    </div>
  );
}
