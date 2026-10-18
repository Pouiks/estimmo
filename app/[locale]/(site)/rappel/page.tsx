import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CheckCircle2, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SITE } from "@/lib/config";
import { localeDeParams } from "@/lib/i18n/server";
import { verifyRappelToken } from "@/lib/leads/rappel-token";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ lead?: string; t?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeDeParams(params);
  const t = await getTranslations({ locale, namespace: "rappel" });
  return { title: t("meta.titre"), robots: { index: false } };
}

/**
 * Landing du lien « être rappelé » des emails. Vérifie le jeton signé, pose
 * le flag demande_rappel (RGPD : demande de contact explicite, horodatée),
 * puis affiche une confirmation. Idempotent.
 */
export default async function RappelPage({ params, searchParams }: Props) {
  const locale = await localeDeParams(params);
  const t = await getTranslations({ locale, namespace: "rappel" });
  const { lead, t: jeton } = await searchParams;

  let prenom = "";
  let enregistre = false;

  if (lead && jeton && verifyRappelToken(lead, jeton)) {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("leads")
      .update({
        demande_rappel: true,
        demande_rappel_at: new Date().toISOString(),
      })
      .eq("id", lead)
      .select("prenom")
      .maybeSingle();
    if (data) {
      enregistre = true;
      prenom = data.prenom ?? "";
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
      <Card className="w-full">
        <CardContent className="space-y-4 pt-6">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="size-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {enregistre && prenom
              ? t("titreAvecPrenom", { prenom })
              : t("titre")}
          </h1>
          <p className="text-muted-foreground">
            {t.rich("texte", {
              agent: SITE.agent.name,
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>
          <p className="text-sm text-muted-foreground">{t("direct")}</p>
          <Button size="lg" render={<a href={SITE.agent.phoneHref} />}>
            <PhoneCall className="size-4" />{" "}
            {t("appeler", { telephone: SITE.agent.phone })}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
