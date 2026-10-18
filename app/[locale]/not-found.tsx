import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-24 text-center">
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        {t("titre")}
      </h1>
      <p className="text-muted-foreground">{t("texte")}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button render={<Link href="/" />}>{t("retour")}</Button>
        <Button variant="outline" render={<Link href="/estimation" />}>
          {t("estimer")}
        </Button>
      </div>
    </div>
  );
}
