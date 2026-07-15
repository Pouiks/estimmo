import type { Metadata } from "next";
import { EstimationForm } from "@/components/estimation/estimation-form";
import { MENTIONS } from "@/lib/config";

export const metadata: Metadata = {
  title: "Estimation gratuite de votre bien",
  description:
    "Estimez le prix de vente ou le loyer de votre appartement ou maison en 4 étapes, sur la base des données officielles DVF et ANIL.",
};

export default function EstimationPage() {
  return (
    <div
      className="dcx"
      style={{
        minHeight: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 18px",
        color: "#0C1F1C",
        background:
          "radial-gradient(1200px 600px at 15% -10%,#E9F3EE 0%,rgba(233,243,238,0) 55%),radial-gradient(1000px 620px at 110% 10%,#E6EEF6 0%,rgba(230,238,246,0) 50%),linear-gradient(180deg,#F5F8F6 0%,#EFF3F1 100%)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 660 }}>
        <EstimationForm />
        <p
          style={{
            textAlign: "center",
            margin: "16px auto 0",
            maxWidth: 520,
            fontSize: 12,
            color: "#9BA8A4",
            lineHeight: 1.5,
          }}
        >
          {MENTIONS.disclaimer}
        </p>
      </div>
    </div>
  );
}
