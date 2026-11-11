import { describe, expect, it, vi } from "vitest";
import {
  choisirCommune,
  geocoder,
  libellePhoton,
  suggestionsIgn,
  suggestionsPhoton,
  urlIgn,
  urlPhoton,
  type CommuneCandidate,
  type IgnFeature,
  type PhotonFeature,
} from "./geocodage";

const ignNimes: IgnFeature = {
  geometry: { coordinates: [4.3587, 43.8329] },
  properties: {
    label: "10 Rue de la République 30000 Nîmes",
    citycode: "30189",
    postcode: "30000",
    city: "Nîmes",
    score: 0.9,
    type: "housenumber",
  },
};

const photonNimes: PhotonFeature = {
  geometry: { coordinates: [4.3587293, 43.8328948] },
  properties: {
    type: "house",
    housenumber: "10",
    street: "Rue de la République",
    city: "Nîmes",
    postcode: "30000",
    countrycode: "FR",
  },
};

const photonCalmette: PhotonFeature = {
  geometry: { coordinates: [4.26023, 43.927] },
  properties: { type: "city", name: "La Calmette", postcode: "30190", countrycode: "FR" },
};

const communes30190: CommuneCandidate[] = [
  { code_insee: "30021", nom_commune: "Aubussargues", code_postal: "30190" },
  { code_insee: "30061", nom_commune: "La Calmette", code_postal: "30190" },
  { code_insee: "30241", nom_commune: "Saint-Chaptes", code_postal: "30190" },
];

const base: Record<string, CommuneCandidate[]> = {
  "30000": [{ code_insee: "30189", nom_commune: "Nîmes", code_postal: "30000" }],
  "30190": communes30190,
  "75001": [
    { code_insee: "75101", nom_commune: "Paris 1er Arrondissement", code_postal: "75001" },
  ],
};
const resoudreInsee = async (cp: string, ville: string) =>
  choisirCommune(base[cp] ?? [], ville);

function reponse(status: number, corps?: unknown): Response {
  return new Response(corps === undefined ? "" : JSON.stringify(corps), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("urls des fournisseurs", () => {
  it("IGN : index adresse, autocomplétion, filtre commune optionnel", () => {
    expect(urlIgn("10 rue x")).toContain("index=address");
    expect(urlIgn("10 rue x")).not.toContain("citycode");
    expect(urlIgn("10 rue x", "30189")).toContain("citycode=30189");
  });

  it("Photon : français, biais géographique optionnel", () => {
    expect(urlPhoton("nimes")).toContain("lang=fr");
    expect(urlPhoton("nimes", { lat: 43.8, lon: 4.3 })).toContain("lat=43.8");
  });
});

describe("suggestionsIgn", () => {
  it("convertit les features et ignore celles sans code INSEE", () => {
    const sans = { ...ignNimes, properties: { ...ignNimes.properties, citycode: "" } };
    expect(suggestionsIgn({ features: [ignNimes, sans] })).toEqual([
      {
        label: "10 Rue de la République 30000 Nîmes",
        codeInsee: "30189",
        codePostal: "30000",
        ville: "Nîmes",
        lat: 43.8329,
        lon: 4.3587,
      },
    ]);
  });
});

describe("choisirCommune", () => {
  it("nom exact, sans accents ni ponctuation", () => {
    expect(choisirCommune(communes30190, "la calmette")?.code_insee).toBe("30061");
    expect(choisirCommune(communes30190, "Saint Chaptes")?.code_insee).toBe("30241");
  });

  it("candidate unique même si le nom diffère", () => {
    expect(choisirCommune(base["30000"], "Nimes centre")?.code_insee).toBe("30189");
  });

  it("arrondissement : « Paris » retrouve « Paris 1er Arrondissement »", () => {
    expect(choisirCommune(base["75001"], "Paris")?.code_insee).toBe("75101");
  });

  it("ambigu ou vide → null", () => {
    expect(choisirCommune(communes30190, "Inconnue")).toBeNull();
    expect(choisirCommune([], "Nîmes")).toBeNull();
  });
});

describe("suggestionsPhoton", () => {
  it("résout le code INSEE et construit un libellé lisible", async () => {
    const s = await suggestionsPhoton({ features: [photonNimes, photonCalmette] }, resoudreInsee);
    expect(s).toEqual([
      {
        label: "10 Rue de la République, 30000 Nîmes",
        codeInsee: "30189",
        codePostal: "30000",
        ville: "Nîmes",
        lat: 43.8328948,
        lon: 4.3587293,
      },
      {
        label: "30190 La Calmette",
        codeInsee: "30061",
        codePostal: "30190",
        ville: "La Calmette",
        lat: 43.927,
        lon: 4.26023,
      },
    ]);
  });

  it("ignore l'étranger, les types inutiles et les communes non résolues", async () => {
    const etranger = {
      ...photonNimes,
      properties: { ...photonNimes.properties, countrycode: "BE", postcode: "1000" },
    };
    const poi = { ...photonNimes, properties: { ...photonNimes.properties, type: "other" } };
    const inconnue = {
      ...photonNimes,
      properties: { ...photonNimes.properties, postcode: "99999", city: "Nulle-Part" },
    };
    expect(
      await suggestionsPhoton({ features: [etranger, poi, inconnue] }, resoudreInsee)
    ).toEqual([]);
  });

  it("libellé d'une rue sans numéro", () => {
    expect(
      libellePhoton(
        { type: "street", name: "Rue de la République", postcode: "30000" },
        "Nîmes"
      )
    ).toBe("Rue de la République, 30000 Nîmes");
  });
});

describe("geocoder : relais entre fournisseurs", () => {
  it("IGN disponible → source ign, Photon jamais appelé", async () => {
    const fetchFn = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes("geopf")) return reponse(200, { features: [ignNimes] });
      throw new Error("ne doit pas être appelé");
    });
    const r = await geocoder("10 rue de la république nîmes", { fetch: fetchFn, resoudreInsee });
    expect(r.source).toBe("ign");
    expect(r.suggestions[0].codeInsee).toBe("30189");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("IGN en 504 → Photon prend le relais avec code INSEE résolu", async () => {
    const fetchFn = vi.fn(async (url: RequestInfo | URL) =>
      String(url).includes("geopf")
        ? reponse(504)
        : reponse(200, { features: [photonNimes] })
    );
    const r = await geocoder("10 rue de la république nîmes", { fetch: fetchFn, resoudreInsee });
    expect(r.source).toBe("photon");
    expect(r.suggestions).toHaveLength(1);
    expect(r.suggestions[0]).toMatchObject({ codeInsee: "30189", ville: "Nîmes" });
  });

  it("IGN muet (réponse vide valide) → pas de relais", async () => {
    const fetchFn = vi.fn(async () => reponse(200, { features: [] }));
    const r = await geocoder("zzzz", { fetch: fetchFn, resoudreInsee });
    expect(r).toEqual({ suggestions: [], source: "ign" });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("filtre commune imposée : Photon ne garde que la bonne commune", async () => {
    const garons = {
      ...photonNimes,
      properties: { ...photonNimes.properties, city: "Garons", postcode: "30128" },
    };
    const fetchFn = vi.fn(async (url: RequestInfo | URL) =>
      String(url).includes("geopf")
        ? reponse(503)
        : reponse(200, { features: [garons, photonNimes] })
    );
    const r = await geocoder("10 rue de la république", {
      fetch: fetchFn,
      resoudreInsee,
      citycode: "30189",
    });
    expect(r.suggestions.map((s) => s.codeInsee)).toEqual(["30189"]);
  });

  it("IGN et Photon en panne → communes locales, sinon aucune", async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error("réseau");
    });
    const locales = vi.fn(async () => [
      { label: "Nîmes (30000)", codeInsee: "30189", codePostal: "30000", ville: "Nîmes", lat: 43.8, lon: 4.36 },
    ]);
    const avec = await geocoder("nîmes", { fetch: fetchFn, resoudreInsee, communesLocales: locales });
    expect(avec.source).toBe("communes");
    expect(avec.suggestions[0].codeInsee).toBe("30189");

    const erreur = vi.spyOn(console, "error").mockImplementation(() => {});
    const sans = await geocoder("nîmes", { fetch: fetchFn, resoudreInsee });
    expect(sans).toEqual({ suggestions: [], source: "aucune" });
    erreur.mockRestore();
  });
});
