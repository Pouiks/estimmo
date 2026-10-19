import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "*.supabase.co";

const nextConfig: NextConfig = {
  experimental: {
    // Cache client des pages dynamiques (admin) : retour/avance instantanés
    // pendant 30 s ; une action qui revalide la page passe outre.
    staleTimes: { dynamic: 30 },
    serverActions: {
      // Envoi d'images depuis l'admin (1 Mo par défaut). Le navigateur réduit
      // les photos avant l'envoi ; Vercel plafonne de toute façon à 4,5 Mo.
      bodySizeLimit: "4mb",
    },
  },
  images: {
    // Les images du blog ont des noms uniques (suffixe aléatoire) : chaque
    // variante optimisée peut être conservée longtemps (quota Vercel).
    minimumCacheTTL: 2678400, // 31 jours
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

export default withNextIntl(nextConfig);
