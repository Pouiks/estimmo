"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapImage from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Loader2,
  Quote,
  Redo2,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn, slugify } from "@/lib/utils";
import {
  saveArticle,
  uploadArticleImage,
} from "@/app/(admin)/admin/(protected)/blog/actions";

export interface ArticleData {
  id?: string;
  titre: string;
  slug: string;
  meta_description: string | null;
  contenu: unknown;
  image_cover: string | null;
  statut: "brouillon" | "publie";
}

function ToolbarButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        active && "bg-primary/10 text-primary"
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const fileRef = useRef<HTMLInputElement>(null);

  async function onImagePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    toast.promise(
      uploadArticleImage(formData).then((res) => {
        if (!res.ok || !res.url) throw new Error(res.message);
        editor.chain().focus().setImage({ src: res.url }).run();
      }),
      {
        loading: "Envoi de l'image…",
        success: "Image insérée",
        error: (err) => (err as Error).message,
      }
    );
  }

  function toggleLink() {
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const url = window.prompt("URL du lien :", "https://");
    if (!url) return;
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-t-xl border-x border-t bg-muted/40 p-1.5">
      <ToolbarButton
        label="Titre de section"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Sous-titre"
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
      <ToolbarButton label="Insérer une image" onClick={() => fileRef.current?.click()}>
        <ImagePlus className="size-4" />
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton label="Annuler" onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Rétablir" onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 className="size-4" />
      </ToolbarButton>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={onImagePicked}
      />
    </div>
  );
}

export function ArticleEditor({ article }: { article: ArticleData | null }) {
  const router = useRouter();
  const [titre, setTitre] = useState(article?.titre ?? "");
  const [slug, setSlug] = useState(article?.slug ?? "");
  const [slugTouche, setSlugTouche] = useState(Boolean(article));
  const [metaDescription, setMetaDescription] = useState(
    article?.meta_description ?? ""
  );
  const [imageCover, setImageCover] = useState(article?.image_cover ?? null);
  const [pending, startTransition] = useTransition();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false },
      }),
      TiptapImage,
      Placeholder.configure({
        placeholder: "Écrivez votre article ici…",
      }),
    ],
    content: (article?.contenu as object) ?? "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-neutral max-w-none min-h-80 rounded-b-xl border bg-background p-4 focus:outline-none " +
          "prose-headings:font-semibold prose-img:rounded-lg [&_a]:text-primary [&_a]:underline",
      },
    },
  });

  function submit(statut: "brouillon" | "publie") {
    if (!editor) return;
    startTransition(async () => {
      const result = await saveArticle({
        id: article?.id,
        titre,
        slug: slug || slugify(titre),
        metaDescription,
        contenu: JSON.stringify(editor.getJSON()),
        imageCover,
        statut,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      if (!article?.id && result.id) {
        router.replace(`/admin/blog/${result.id}`);
      } else {
        router.refresh();
      }
    });
  }

  async function onCoverPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    const res = await uploadArticleImage(formData);
    if (!res.ok || !res.url) {
      toast.error(res.message ?? "Échec de l'envoi");
      return;
    }
    setImageCover(res.url);
    toast.success("Image de couverture mise à jour");
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Label htmlFor="titre" className="text-base font-semibold">
          Titre
        </Label>
        <Input
          id="titre"
          value={titre}
          onChange={(e) => {
            setTitre(e.target.value);
            if (!slugTouche) setSlug(slugify(e.target.value));
          }}
          placeholder="Comment bien estimer son appartement en 2026 ?"
          className="mt-2 h-11 text-lg"
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <Label htmlFor="slug" className="text-base font-semibold">
            Slug (URL)
          </Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => {
              setSlugTouche(true);
              setSlug(e.target.value);
            }}
            className="mt-2 font-mono text-sm"
          />
          <p className="mt-1 text-xs text-muted-foreground">/blog/{slug || "…"}</p>
        </div>
        <div>
          <Label htmlFor="meta" className="text-base font-semibold">
            Meta description (SEO)
          </Label>
          <Textarea
            id="meta"
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            rows={2}
            maxLength={180}
            className="mt-2"
            placeholder="Résumé de 150-160 caractères affiché dans Google."
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {metaDescription.length}/160
          </p>
        </div>
      </div>

      <div>
        <Label className="text-base font-semibold">Image de couverture</Label>
        <div className="mt-2 flex items-center gap-3">
          {imageCover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageCover}
              alt="Couverture"
              className="h-20 w-32 rounded-lg border object-cover"
            />
          )}
          <label className="cursor-pointer rounded-md border px-3 py-2 text-sm hover:bg-muted">
            {imageCover ? "Remplacer" : "Choisir une image"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={onCoverPicked}
            />
          </label>
          {imageCover && (
            <Button variant="ghost" size="sm" onClick={() => setImageCover(null)}>
              Retirer
            </Button>
          )}
        </div>
      </div>

      <div>
        <Label className="text-base font-semibold">Contenu</Label>
        <div className="mt-2">
          {editor ? (
            <>
              <Toolbar editor={editor} />
              <EditorContent editor={editor} />
            </>
          ) : (
            <div className="flex h-80 items-center justify-center rounded-xl border">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 border-t pt-6">
        <Button
          variant="outline"
          disabled={pending || !titre}
          onClick={() => submit("brouillon")}
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          Enregistrer le brouillon
        </Button>
        <Button disabled={pending || !titre} onClick={() => submit("publie")}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Publier
        </Button>
        {article?.statut === "publie" && (
          <a
            href={`/blog/${article.slug}`}
            target="_blank"
            className="ml-auto text-sm text-primary hover:underline"
          >
            Voir l'article →
          </a>
        )}
      </div>
    </div>
  );
}
