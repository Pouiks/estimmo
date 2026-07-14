import { CheckCircle2, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SITE } from "@/lib/config";
import { verifyRappelToken } from "@/lib/leads/rappel-token";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Demande de rappel",
  robots: { index: false },
};

/**
 * Landing du lien « être rappelé » des emails. Vérifie le jeton signé, pose
 * le flag demande_rappel (RGPD : demande de contact explicite, horodatée),
 * puis affiche une confirmation. Idempotent.
 */
export default async function RappelPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string; t?: string }>;
}) {
  const { lead, t } = await searchParams;

  let prenom = "";
  let enregistre = false;

  if (lead && t && verifyRappelToken(lead, t)) {
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
              ? `C'est noté, ${prenom} !`
              : "C'est noté !"}
          </h1>
          <p className="text-muted-foreground">
            Votre demande de rappel a bien été enregistrée.{" "}
            <strong>{SITE.agent.name}</strong> vous rappelle très vite au numéro
            que vous avez indiqué pour affiner votre estimation et répondre à
            toutes vos questions.
          </p>
          <p className="text-sm text-muted-foreground">
            Vous préférez appeler directement&nbsp;?
          </p>
          <Button size="lg" render={<a href={SITE.agent.phoneHref} />}>
            <PhoneCall className="size-4" /> Appeler {SITE.agent.phone}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
