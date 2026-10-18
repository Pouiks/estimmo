import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname),
    },
  },
  test: {
    include: ["lib/**/*.test.ts", "scripts/**/*.test.ts", "messages/**/*.test.ts"],
    environment: "node",
    // next-intl importe next/server sans extension : on le laisse à Vite.
    server: { deps: { inline: ["next-intl"] } },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["lib/**/*.ts", "messages/**/*.ts"],
      exclude: [
        "**/*.test.ts",
        "**/*.d.ts",
        // Accès réseau / base : couverts par les tests E2E, pas unitaires.
        "lib/supabase/**",
        "lib/estimation/repository.ts",
        "lib/seo/communes.ts",
        "lib/seo/barometre.ts",
    "lib/seo/sitemap-source.ts",
        "lib/quartier.ts",
        "lib/crm/sync.ts",
      ],
    },
  },
});
