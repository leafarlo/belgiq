import { useState, useEffect, useRef } from "react";

// ─── STATIC DATA ────────────────────────────────────────────────────────────

const COMMUNES = [
  { id: "beersel", name: "Beersel", region: "flemish", province: "Vlaams-Brabant", nl: true, fr: false },
  { id: "brussels", name: "Brussel / Bruxelles", region: "brussels", province: "Brussels Capital", nl: true, fr: true },
  { id: "liege", name: "Luik / Liège", region: "walloon", province: "Liège", nl: false, fr: true },
  { id: "gent", name: "Gent", region: "flemish", province: "Oost-Vlaanderen", nl: true, fr: false },
  { id: "antwerp", name: "Antwerpen", region: "flemish", province: "Antwerpen", nl: true, fr: false },
  { id: "namur", name: "Namen / Namur", region: "walloon", province: "Namen", nl: false, fr: true },
];

const LOCAL_GOVERNMENTS = {
  beersel: {
    commune: { nl: "Gemeente Beersel", fr: "Commune de Beersel" },
    province: { nl: "Provincie Vlaams-Brabant", fr: "Province du Brabant Flamand" },
    communeBudget: 28400000,
    provinceBudget: 412000000,
    communeCoalition: ["N-VA", "CD&V", "Open Vld"],
    provinceCoalition: ["N-VA", "CD&V", "Vooruit"],
    burgemeester: { name: "Hugo Vandaele", party: "N-VA", nl: "Burgemeester", fr: "Bourgmestre" },
    gouverneur: { name: "Lodewijk De Witte", party: "Onafhankelijk", nl: "Gouverneur", fr: "Gouverneur" },
    communeCompetences: {
      nl: ["Lokale wegen", "Afvalophaling", "Brandweer", "Lokale subsidies", "Ruimtelijke vergunningen", "Lokale belastingen"],
      fr: ["Routes locales", "Collecte déchets", "Pompiers", "Subventions locales", "Permis urbanisme", "Taxes locales"]
    },
    provinceCompetences: {
      nl: ["Provinciale wegen", "Welzijn (deels)", "Toerisme", "Landbouwbegeleiding", "Provinciale scholen"],
      fr: ["Routes provinciales", "Bien-être (part.)", "Tourisme", "Accompagnement agricole", "Écoles provinciales"]
    },
    localTaxes: {
      aanvullende_personenbelasting: 7.5,
      opcentiemen_onroerende_voorheffing: 870,
      nl: "7,5% aanvullende personenbelasting · 870 opcentiemen onroerende voorheffing",
      fr: "7,5% d'impôt additionnel · 870 centimes additionnels précompte immobilier"
    },
    budgetFlow: [
      { level: "federal", amount: 142300000000, toNext: 8200000000, label: { nl: "Naar Vlaanderen (dotaties)", fr: "Vers Flandre (dotations)" } },
      { level: "flemish", amount: 53200000000, toNext: 412000000, label: { nl: "Naar Vl.-Brabant (provincie)", fr: "Vers Br. Flamand (province)" } },
      { level: "province", amount: 412000000, toNext: 28400000, label: { nl: "Naar Beersel (gemeentefonds)", fr: "Vers Beersel (fonds communes)" } },
      { level: "commune", amount: 28400000, toNext: null, label: null },
    ]
  },
  brussels: {
    commune: { nl: "Stad Brussel", fr: "Ville de Bruxelles" },
    province: { nl: "Brussels Hoofdstedelijk Gewest", fr: "Région de Bruxelles-Capitale" },
    communeBudget: 892000000,
    provinceBudget: 7800000000,
    communeCoalition: ["PS", "MR", "DéFI"],
    provinceCoalition: ["PS", "MR", "Ecolo", "DéFI"],
    burgemeester: { name: "Philippe Close", party: "PS", nl: "Burgemeester", fr: "Bourgmestre" },
    gouverneur: { name: "N/A (Brussels Gewest)", party: "", nl: "Minister-President", fr: "Ministre-Président" },
    communeCompetences: {
      nl: ["Lokale veiligheid", "Stedenbouw", "Stadsreiniging", "Sociale bijstand (OCMW)", "Lokale cultuur"],
      fr: ["Sécurité locale", "Urbanisme", "Propreté urbaine", "Aide sociale (CPAS)", "Culture locale"]
    },
    provinceCompetences: {
      nl: ["Mobiliteit", "Economie", "Leefmilieu", "Tewerkstelling", "Huisvesting"],
      fr: ["Mobilité", "Économie", "Environnement", "Emploi", "Logement"]
    },
    localTaxes: {
      aanvullende_personenbelasting: 8.5,
      opcentiemen_onroerende_voorheffing: 2800,
      nl: "8,5% aanvullende personenbelasting · 2.800 opcentiemen onroerende voorheffing",
      fr: "8,5% d'impôt additionnel · 2.800 centimes additionnels précompte immobilier"
    },
    budgetFlow: [
      { level: "federal", amount: 142300000000, toNext: 4800000000, label: { nl: "Naar Brussels Gewest", fr: "Vers Région bruxelloise" } },
      { level: "brussels_region", amount: 7800000000, toNext: 892000000, label: { nl: "Naar Stad Brussel", fr: "Vers Ville de Bruxelles" } },
      { level: "commune", amount: 892000000, toNext: null, label: null },
    ]
  },
  gent: {
    commune: { nl: "Stad Gent", fr: "Ville de Gand" },
    province: { nl: "Provincie Oost-Vlaanderen", fr: "Province de Flandre Orientale" },
    communeBudget: 1240000000,
    provinceBudget: 623000000,
    communeCoalition: ["Vooruit", "Groen", "N-VA"],
    provinceCoalition: ["N-VA", "CD&V", "Vooruit"],
    burgemeester: { name: "Mathias De Clercq", party: "Open Vld", nl: "Burgemeester", fr: "Bourgmestre" },
    gouverneur: { name: "An Christiaens", party: "CD&V", nl: "Gouverneur", fr: "Gouverneur" },
    communeCompetences: {
      nl: ["Stedelijk mobiliteitsplan", "Sociale woningbouw", "Lokale belastingen", "OCMW", "Stadsvernieuwing"],
      fr: ["Plan mobilité urbaine", "Logement social", "Taxes locales", "CPAS", "Rénovation urbaine"]
    },
    provinceCompetences: {
      nl: ["Provinciale infrastructuur", "Welzijn", "Toerisme Oost-Vlaanderen", "Agrarisch beleid"],
      fr: ["Infrastructure provinciale", "Bien-être", "Tourisme F.-Orientale", "Politique agricole"]
    },
    localTaxes: {
      aanvullende_personenbelasting: 8.9,
      opcentiemen_onroerende_voorheffing: 1450,
      nl: "8,9% aanvullende personenbelasting · 1.450 opcentiemen onroerende voorheffing",
      fr: "8,9% d'impôt additionnel · 1.450 centimes additionnels précompte immobilier"
    },
    budgetFlow: [
      { level: "federal", amount: 142300000000, toNext: 8200000000, label: { nl: "Naar Vlaanderen (dotaties)", fr: "Vers Flandre (dotations)" } },
      { level: "flemish", amount: 53200000000, toNext: 623000000, label: { nl: "Naar Oost-Vlaanderen", fr: "Vers Flandre Orientale" } },
      { level: "province", amount: 623000000, toNext: 1240000000, label: { nl: "Naar Gent (gemeentefonds)", fr: "Vers Gand (fonds communes)" } },
      { level: "commune", amount: 1240000000, toNext: null, label: null },
    ]
  },
  antwerp: {
    commune: { nl: "Stad Antwerpen", fr: "Ville d'Anvers" },
    province: { nl: "Provincie Antwerpen", fr: "Province d'Anvers" },
    communeBudget: 2100000000,
    provinceBudget: 784000000,
    communeCoalition: ["N-VA", "Vooruit", "PVDA/PTB"],
    provinceCoalition: ["N-VA", "CD&V", "Vooruit"],
    burgemeester: { name: "Bart De Wever", party: "N-VA", nl: "Burgemeester", fr: "Bourgmestre" },
    gouverneur: { name: "Cathy Berx", party: "CD&V", nl: "Gouverneur", fr: "Gouverneur" },
    communeCompetences: {
      nl: ["Havenbeleid (deels)", "Stedelijke veiligheid", "Lokaal woonbeleid", "OCMW", "Stadsvernieuwing"],
      fr: ["Politique portuaire (part.)", "Sécurité urbaine", "Logement local", "CPAS", "Rénovation urbaine"]
    },
    provinceCompetences: {
      nl: ["Provinciale wegen", "Welzijn", "Ruimtelijke ordening", "Economische ondersteuning"],
      fr: ["Routes provinciales", "Bien-être", "Aménagement territoire", "Soutien économique"]
    },
    localTaxes: {
      aanvullende_personenbelasting: 9.0,
      opcentiemen_onroerende_voorheffing: 1600,
      nl: "9,0% aanvullende personenbelasting · 1.600 opcentiemen onroerende voorheffing",
      fr: "9,0% d'impôt additionnel · 1.600 centimes additionnels précompte immobilier"
    },
    budgetFlow: [
      { level: "federal", amount: 142300000000, toNext: 8200000000, label: { nl: "Naar Vlaanderen (dotaties)", fr: "Vers Flandre (dotations)" } },
      { level: "flemish", amount: 53200000000, toNext: 784000000, label: { nl: "Naar Antwerpen (provincie)", fr: "Vers Anvers (province)" } },
      { level: "province", amount: 784000000, toNext: 2100000000, label: { nl: "Naar Stad Antwerpen", fr: "Vers Ville d'Anvers" } },
      { level: "commune", amount: 2100000000, toNext: null, label: null },
    ]
  },
  liege: {
    commune: { nl: "Stad Luik", fr: "Ville de Liège" },
    province: { nl: "Provincie Luik", fr: "Province de Liège" },
    communeBudget: 680000000,
    provinceBudget: 521000000,
    communeCoalition: ["PS", "MR"],
    provinceCoalition: ["PS", "MR", "Les Engagés"],
    burgemeester: { name: "Willy Demeyer", party: "PS", nl: "Burgemeester", fr: "Bourgmestre" },
    gouverneur: { name: "Hervé Jamar", party: "MR", nl: "Gouverneur", fr: "Gouverneur" },
    communeCompetences: {
      nl: ["Stedelijke mobiliteit", "Sociale huisvesting", "OCMW", "Economische revitalisering"],
      fr: ["Mobilité urbaine", "Logement social", "CPAS", "Revitalisation économique"]
    },
    provinceCompetences: {
      nl: ["Provinciale scholen", "Welzijn", "Toerisme Luik", "Infrastructuur"],
      fr: ["Écoles provinciales", "Bien-être", "Tourisme Liège", "Infrastructure"]
    },
    localTaxes: {
      aanvullende_personenbelasting: 9.5,
      opcentiemen_onroerende_voorheffing: 3200,
      nl: "9,5% aanvullende personenbelasting · 3.200 opcentiemen onroerende voorheffing",
      fr: "9,5% d'impôt additionnel · 3.200 centimes additionnels précompte immobilier"
    },
    budgetFlow: [
      { level: "federal", amount: 142300000000, toNext: 5100000000, label: { nl: "Naar Wallonië (dotaties)", fr: "Vers Wallonie (dotations)" } },
      { level: "walloon", amount: 18600000000, toNext: 521000000, label: { nl: "Naar Provincie Luik", fr: "Vers Province de Liège" } },
      { level: "province", amount: 521000000, toNext: 680000000, label: { nl: "Naar Stad Luik", fr: "Vers Ville de Liège" } },
      { level: "commune", amount: 680000000, toNext: null, label: null },
    ]
  },
  namur: {
    commune: { nl: "Stad Namen", fr: "Ville de Namur" },
    province: { nl: "Provincie Namen", fr: "Province de Namur" },
    communeBudget: 312000000,
    provinceBudget: 389000000,
    communeCoalition: ["MR", "Les Engagés"],
    provinceCoalition: ["MR", "Les Engagés", "PS"],
    burgemeester: { name: "Maxime Prévot", party: "Les Engagés", nl: "Burgemeester", fr: "Bourgmestre" },
    gouverneur: { name: "Denis Mathen", party: "Onafhankelijk", nl: "Gouverneur", fr: "Gouverneur" },
    communeCompetences: {
      nl: ["Lokaal toerisme", "Stadsvernieuwing", "OCMW", "Lokale mobiliteit"],
      fr: ["Tourisme local", "Rénovation urbaine", "CPAS", "Mobilité locale"]
    },
    provinceCompetences: {
      nl: ["Provinciale wegen", "Welzijn", "Provinciale scholen", "Economie"],
      fr: ["Routes provinciales", "Bien-être", "Écoles provinciales", "Économie"]
    },
    localTaxes: {
      aanvullende_personenbelasting: 8.0,
      opcentiemen_onroerende_voorheffing: 2100,
      nl: "8,0% aanvullende personenbelasting · 2.100 opcentiemen onroerende voorheffing",
      fr: "8,0% d'impôt additionnel · 2.100 centimes additionnels précompte immobilier"
    },
    budgetFlow: [
      { level: "federal", amount: 142300000000, toNext: 5100000000, label: { nl: "Naar Wallonië (dotaties)", fr: "Vers Wallonie (dotations)" } },
      { level: "walloon", amount: 18600000000, toNext: 389000000, label: { nl: "Naar Provincie Namen", fr: "Vers Province de Namur" } },
      { level: "province", amount: 389000000, toNext: 312000000, label: { nl: "Naar Stad Namen", fr: "Vers Ville de Namur" } },
      { level: "commune", amount: 312000000, toNext: null, label: null },
    ]
  }
};

const GOVERNMENTS = {
  federal: {
    id: "federal",
    name: { nl: "Federale Overheid", fr: "Gouvernement Fédéral" },
    color: "#1a3a5c",
    icon: "🏛️",
    competences: {
      nl: ["Sociale zekerheid", "Defensie", "Justitie", "Fiscaliteit", "Buitenlandse zaken", "Volksgezondheid (deels)"],
      fr: ["Sécurité sociale", "Défense", "Justice", "Fiscalité", "Affaires étrangères", "Santé publique (part.)"]
    },
    budget: 142300000000,
    coalition: ["MR", "N-VA", "Les Engagés", "Vooruit", "CD&V"],
    pm: "pol1",
    regions: ["flemish", "walloon", "brussels"]
  },
  flemish: {
    id: "flemish",
    name: { nl: "Vlaamse Overheid", fr: "Gouvernement Flamand" },
    color: "#f5c842",
    textColor: "#1a1a1a",
    icon: "🦁",
    competences: {
      nl: ["Onderwijs", "Wonen", "Welzijn", "Ruimtelijke ordening", "Landbouw", "Openbare werken"],
      fr: ["Enseignement", "Logement", "Bien-être", "Aménagement territoire", "Agriculture", "Travaux publics"]
    },
    budget: 53200000000,
    coalition: ["N-VA", "Vooruit", "CD&V"],
    pm: "pol2",
    regions: ["flemish"]
  },
  brussels: {
    id: "brussels",
    name: { nl: "Brussels Hoofdstedelijk Gewest", fr: "Région de Bruxelles-Capitale" },
    color: "#003f8a",
    icon: "🏙️",
    competences: {
      nl: ["Mobiliteit", "Economie", "Leefmilieu", "Tewerkstelling", "Huisvesting"],
      fr: ["Mobilité", "Économie", "Environnement", "Emploi", "Logement"]
    },
    budget: 7800000000,
    coalition: ["PS", "MR", "Ecolo", "DéFI"],
    pm: "pol3",
    regions: ["brussels"]
  },
  walloon: {
    id: "walloon",
    name: { nl: "Waals Gewest", fr: "Région Wallonne" },
    color: "#c0392b",
    icon: "🐓",
    competences: {
      nl: ["Economie", "Tewerkstelling", "Landbouw", "Energie", "Transport"],
      fr: ["Économie", "Emploi", "Agriculture", "Énergie", "Transport"]
    },
    budget: 18600000000,
    coalition: ["PS", "MR", "Les Engagés"],
    pm: "pol4",
    regions: ["walloon"]
  },
  french_community: {
    id: "french_community",
    name: { nl: "Franse Gemeenschap (FWB)", fr: "Fédération Wallonie-Bruxelles" },
    color: "#8e44ad",
    icon: "📚",
    competences: {
      nl: ["Onderwijs (Fr)", "Cultuur (Fr)", "Jeugd (Fr)", "Sport (Fr)"],
      fr: ["Enseignement (Fr)", "Culture (Fr)", "Jeunesse (Fr)", "Sport (Fr)"]
    },
    budget: 12400000000,
    coalition: ["PS", "MR", "Les Engagés"],
    pm: "pol5",
    regions: ["walloon", "brussels"]
  }
};

const POLITICIANS = {
  pol1: {
    id: "pol1", name: "Alexander De Croo", party: "Open Vld", role: { nl: "Eerste Minister (2020-2024)", fr: "Premier Ministre (2020-2024)" },
    photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Alexander_De_Croo_2019.jpg/440px-Alexander_De_Croo_2019.jpg",
    costScore: 68, consistencyScore: 52, commotionScore: 38,
    annualCost: 287400,
    costBreakdown: [
      { label: { nl: "Brutoloon", fr: "Salaire brut" }, amount: 198000, source: "Kamer.be – Vergoedingen" },
      { label: { nl: "Kabinetskosten", fr: "Frais de cabinet" }, amount: 54000, source: "Begroting 2023 – Primaire Minister" },
      { label: { nl: "Representatiekosten", fr: "Frais de représentation" }, amount: 22400, source: "CDVU Jaarverslag 2023" },
      { label: { nl: "Mandatenvergoedingen", fr: "Indemnités de mandat" }, amount: 13000, source: "Belgisch Staatsblad" }
    ],
    consistencyEvents: [
      { promise: { nl: "Kernenergie afbouwen", fr: "Sortir du nucléaire" }, action: { nl: "Stemde voor 10-jaar verlenging kernenergie", fr: "A voté pour prolongation 10 ans du nucléaire" }, verdict: "broken", source: "Kamer stemmingen 2023-03-16" },
      { promise: { nl: "Begrotingsevenwicht 2024", fr: "Équilibre budgétaire 2024" }, action: { nl: "Tekort liep op tot 5,1% BBP", fr: "Déficit monté à 5,1% PIB" }, verdict: "broken", source: "NBB Economisch Tijdschrift Q4 2023" },
      { promise: { nl: "Btw verlagen op elektriciteit", fr: "Réduire TVA sur électricité" }, action: { nl: "BTW verlaagd naar 6% (tijdelijk)", fr: "TVA réduite à 6% (temporaire)" }, verdict: "partial", source: "Ministerraad beslissing 2022-09-30" }
    ],
    commotionEvents: [
      { type: "audit", description: { nl: "Rekenhof: tekortkomingen in corona-uitgaven beheer", fr: "Cour des Comptes: lacunes gestion dépenses corona" }, severity: 3, source: "Rekenhof Rapport 2022, nr. 2022/01" },
      { type: "media", description: { nl: "Energiecrisis communicatie mislukkingen", fr: "Échecs communication crise énergétique" }, severity: 2, source: "De Standaard, 14/10/2022" }
    ],
    governments: ["federal"],
    region: "flemish"
  },
  pol2: {
    id: "pol2", name: "Matthias Diependaele", party: "N-VA", role: { nl: "Minister-President Vlaanderen", fr: "Ministre-Président Flandre" },
    photo: null,
    costScore: 55, consistencyScore: 71, commotionScore: 22,
    annualCost: 241000,
    costBreakdown: [
      { label: { nl: "Brutoloon", fr: "Salaire brut" }, amount: 172000, source: "Vlaams Parlement – Bezoldigingen" },
      { label: { nl: "Kabinetskosten", fr: "Frais de cabinet" }, amount: 48000, source: "Vlaamse Begroting 2024" },
      { label: { nl: "Representatiekosten", fr: "Frais de représentation" }, amount: 21000, source: "CDVU Jaarverslag 2023" }
    ],
    consistencyEvents: [
      { promise: { nl: "Woonbonus afschaffen", fr: "Supprimer le bonus logement" }, action: { nl: "Woonbonus geleidelijk afgebouwd", fr: "Bonus logement progressivement supprimé" }, verdict: "kept", source: "Vlaams Parlement, Decreet 2019" },
      { promise: { nl: "Investeringen in Vlaamse wegen", fr: "Investissements routes flamandes" }, action: { nl: "Budget verhoogd met 12%", fr: "Budget augmenté de 12%" }, verdict: "kept", source: "Vlaamse Begroting 2023-2024" }
    ],
    commotionEvents: [
      { type: "media", description: { nl: "Discussie rond Vlaamse dotaties aan culturele instellingen", fr: "Débat sur dotations flamandes aux institutions culturelles" }, severity: 1, source: "Knack, 03/2023" }
    ],
    governments: ["flemish"],
    region: "flemish"
  },
  pol3: {
    id: "pol3", name: "David Clarinval", party: "MR", role: { nl: "Brussels Minister-President", fr: "Ministre-Président de Bruxelles" },
    photo: null,
    costScore: 61, consistencyScore: 44, commotionScore: 55,
    annualCost: 258000,
    costBreakdown: [
      { label: { nl: "Brutoloon", fr: "Salaire brut" }, amount: 181000, source: "Parlement Bruxellois – Rémunérations" },
      { label: { nl: "Kabinetskosten", fr: "Frais de cabinet" }, amount: 52000, source: "Budget RBC 2024" },
      { label: { nl: "Representatiekosten", fr: "Frais de représentation" }, amount: 25000, source: "CDVU 2023" }
    ],
    consistencyEvents: [
      { promise: { nl: "Brussels mobiliteitsplan verbeteren", fr: "Améliorer plan mobilité bruxellois" }, action: { nl: "Plan vertraagd, uitvoering gedeeltelijk", fr: "Plan retardé, exécution partielle" }, verdict: "partial", source: "Audit Brussel Mobiliteit 2023" }
    ],
    commotionEvents: [
      { type: "audit", description: { nl: "Rekenhof: onregelmatigheden in subsidies aan Brusselse vzw's", fr: "Cour des Comptes: irrégularités dans subventions aux ASBL bruxelloises" }, severity: 4, source: "Rekenhof 2023, Rapport Brussel" },
      { type: "ethics", description: { nl: "Cumulatie van mandaten, 3 betaalde functies gelijktijdig", fr: "Cumul de mandats, 3 fonctions rémunérées simultanément" }, severity: 3, source: "Federale Deontologische Commissie 2022" }
    ],
    governments: ["brussels"],
    region: "brussels"
  },
  pol4: {
    id: "pol4", name: "Elio Di Rupo", party: "PS", role: { nl: "Minister-President Wallonië", fr: "Ministre-Président de Wallonie" },
    photo: null,
    costScore: 72, consistencyScore: 38, commotionScore: 71,
    annualCost: 298000,
    costBreakdown: [
      { label: { nl: "Brutoloon", fr: "Salaire brut" }, amount: 198000, source: "Parlement Wallon – Rémunérations" },
      { label: { nl: "Kabinetskosten", fr: "Frais de cabinet" }, amount: 62000, source: "Budget Wallonie 2024" },
      { label: { nl: "Representatiekosten", fr: "Frais de représentation" }, amount: 38000, source: "CDVU 2023" }
    ],
    consistencyEvents: [
      { promise: { nl: "Waals industriebeleid versterken", fr: "Renforcer politique industrielle wallonne" }, action: { nl: "SAM-deal geleid tot 2.000 verloren jobs", fr: "Deal SAM ayant causé 2.000 pertes d'emplois" }, verdict: "broken", source: "Apache, 2023; Le Soir 14/09/2023" },
      { promise: { nl: "Transparantie in subsidies", fr: "Transparence dans les subventions" }, action: { nl: "Geen centraal subsidieregister gecreëerd", fr: "Aucun registre central de subventions créé" }, verdict: "broken", source: "Rekenhof Waals Rapport 2022" }
    ],
    commotionEvents: [
      { type: "audit", description: { nl: "Rekenhof: €450M niet-verantwoorde uitgaven in Wallonië (2019-2022)", fr: "Cour des Comptes: €450M dépenses non justifiées en Wallonie (2019-2022)" }, severity: 5, source: "Rekenhof Jaarverslag Wallonië 2022" },
      { type: "judicial", description: { nl: "Dossier Publifin: politieke connecties onderzocht", fr: "Dossier Publifin: connexions politiques enquêtées" }, severity: 5, source: "Le Vif, Apache 2021" },
      { type: "media", description: { nl: "SAM-debacle: Waalse steun aan failliete autofabriek", fr: "Débâcle SAM: aide wallonne à l'usine auto en faillite" }, severity: 4, source: "RTBF, Le Soir, 2023" }
    ],
    governments: ["walloon", "french_community"],
    region: "walloon"
  },
  pol5: {
    id: "pol5", name: "Françoise Bertieaux", party: "MR", role: { nl: "Minister FWB", fr: "Ministre FWB" },
    photo: null,
    costScore: 48, consistencyScore: 62, commotionScore: 18,
    annualCost: 231000,
    costBreakdown: [
      { label: { nl: "Brutoloon", fr: "Salaire brut" }, amount: 168000, source: "Parlement FWB – Rémunérations" },
      { label: { nl: "Kabinetskosten", fr: "Frais de cabinet" }, amount: 45000, source: "Budget FWB 2024" },
      { label: { nl: "Representatiekosten", fr: "Frais de représentation" }, amount: 18000, source: "CDVU 2023" }
    ],
    consistencyEvents: [
      { promise: { nl: "Onderwijskwaliteit verbeteren", fr: "Améliorer qualité de l'enseignement" }, action: { nl: "Pacte d'excellence gedeeltelijk uitgevoerd", fr: "Pacte d'excellence partiellement exécuté" }, verdict: "partial", source: "Rapport annuel FWB 2023" }
    ],
    commotionEvents: [],
    governments: ["french_community"],
    region: "walloon"
  }
};

const PARTIES = {
  "N-VA": { color: "#f5c518", textColor: "#000" },
  "MR": { color: "#0057a8", textColor: "#fff" },
  "PS": { color: "#e2001a", textColor: "#fff" },
  "Vooruit": { color: "#FF6B00", textColor: "#fff" },
  "CD&V": { color: "#f07d00", textColor: "#fff" },
  "Ecolo": { color: "#3aaa35", textColor: "#fff" },
  "Open Vld": { color: "#003d99", textColor: "#fff" },
  "Les Engagés": { color: "#1fa37e", textColor: "#fff" },
  "DéFI": { color: "#e8a800", textColor: "#000" },
  "Vlaams Belang": { color: "#ffe000", textColor: "#000" },
  "PVDA/PTB": { color: "#cc0000", textColor: "#fff" },
};

const BILLS = [
  {
    id: "bill_001",
    number: "3974/001",
    source: "federal",
    date: "2025-03-12",
    status: "passed",
    theme: "fiscal",
    themeColor: "#1a3a5c",
    title: { nl: "Wet tot hervorming van de personenbelasting – tax shift middenklasse", fr: "Loi portant réforme de l'impôt des personnes physiques – tax shift classe moyenne" },
    summary: { nl: "Verlaging van de belastingvrije som met €1.200 extra voor inkomens onder €60.000. Financiering via verhoging roerende voorheffing van 30% naar 33%.", fr: "Augmentation de la quotité exemptée de €1.200 pour revenus sous €60.000. Financement via hausse du précompte mobilier de 30% à 33%." },
    introduced_by: { name: "Alexia Bertrand", party: "MR" },
    url: "https://www.lachambre.be/kvvcr/showpage.cfm?section=flwb&language=nl&cfm=flwbn.cfm?lang=N&legislat=56&dossierID=3974",
    votes: {
      yes: [
        { name: "Alexia Bertrand", party: "MR" }, { name: "Alexander De Croo", party: "Open Vld" },
        { name: "Melissa Depraetere", party: "Vooruit" }, { name: "Nathalie Muylle", party: "CD&V" },
        { name: "Theo Francken", party: "N-VA" },
      ],
      no: [
        { name: "Peter De Roover", party: "Vlaams Belang" }, { name: "Raoul Hedebouw", party: "PVDA/PTB" },
        { name: "Georges-Louis Bouchez", party: "MR" },
      ],
      abstain: [{ name: "Sophie Claes", party: "CD&V" }],
    },
    consistency_alerts: [
      { politician: "Georges-Louis Bouchez", party: "MR", type: "against_party", nl: "Stemde tegen zijn eigen partijlijn", fr: "A voté contre sa propre ligne de parti" }
    ],
    impact: { nl: "Raakt 4,2 miljoen Belgische gezinnen. Gemiddelde nettobesparing: €38/maand voor middeninkomens.", fr: "Touche 4,2 millions de ménages belges. Économie nette moyenne: €38/mois pour revenus moyens." }
  },
  {
    id: "bill_002",
    number: "3891/003",
    source: "federal",
    date: "2025-02-28",
    status: "passed",
    theme: "migration",
    themeColor: "#c2410c",
    title: { nl: "Wet tot hervorming van de asielprocedure – snellere doorlooptijden", fr: "Loi portant réforme de la procédure d'asile – délais accélérés" },
    summary: { nl: "Maximale behandelingstermijn voor asielverzoeken teruggebracht van 18 naar 9 maanden. Versterking van CGVS met 120 extra medewerkers.", fr: "Délai maximum de traitement des demandes d'asile réduit de 18 à 9 mois. Renforcement du CGRA avec 120 agents supplémentaires." },
    introduced_by: { name: "Nicole de Moor", party: "CD&V" },
    url: "https://www.lachambre.be/kvvcr/showpage.cfm?section=flwb&language=nl&cfm=flwbn.cfm?lang=N&legislat=56&dossierID=3891",
    votes: {
      yes: [
        { name: "Nicole de Moor", party: "CD&V" }, { name: "Theo Francken", party: "N-VA" },
        { name: "Alexia Bertrand", party: "MR" }, { name: "Melissa Depraetere", party: "Vooruit" },
      ],
      no: [
        { name: "Raoul Hedebouw", party: "PVDA/PTB" }, { name: "Samuel Cogolati", party: "Ecolo" },
      ],
      abstain: [],
    },
    consistency_alerts: [],
    impact: { nl: "Verkorting van gemiddelde wachttijd voor asielzoekers. Verwachte besparing van €180M/jaar in opvangkosten.", fr: "Réduction du temps d'attente moyen pour demandeurs d'asile. Économie prévue de €180M/an en frais d'accueil." }
  },
  {
    id: "bill_003",
    number: "3812/001",
    source: "federal",
    date: "2025-02-14",
    status: "committee",
    theme: "energy",
    themeColor: "#065f46",
    title: { nl: "Wetsvoorstel betreffende de uitbreiding van kernenergie tot 2045", fr: "Proposition de loi relative à l'extension du nucléaire jusqu'en 2045" },
    summary: { nl: "Voorstel om de exploitatievergunning van Doel 4 en Tihange 3 te verlengen tot 2045, en twee nieuwe SMR-reactoren te bouwen. Geschatte kostprijs: €14,7 miljard.", fr: "Proposition de prolonger l'autorisation d'exploitation de Doel 4 et Tihange 3 jusqu'en 2045, et de construire deux nouveaux réacteurs SMR. Coût estimé: €14,7 milliards." },
    introduced_by: { name: "Theo Francken", party: "N-VA" },
    url: "https://www.lachambre.be/kvvcr/showpage.cfm?section=flwb&language=nl&cfm=flwbn.cfm?lang=N&legislat=56&dossierID=3812",
    votes: null,
    consistency_alerts: [
      { politician: "Alexander De Croo", party: "Open Vld", type: "flip", nl: "Beloofde uitstap kernenergie in 2019, steunt nu verlenging", fr: "Avait promis la sortie du nucléaire en 2019, soutient maintenant la prolongation" }
    ],
    impact: { nl: "Mogelijke verlaging van elektriciteitsfactuur met €180-240/jaar per gezin tegen 2030. Klimaatimpact controversieel.", fr: "Réduction possible de la facture électrique de €180-240/an par ménage d'ici 2030. Impact climatique controversé." }
  },
  {
    id: "bill_004",
    number: "3756/002",
    source: "flemish",
    date: "2025-01-30",
    status: "passed",
    theme: "housing",
    themeColor: "#f5c518",
    themeTextColor: "#000",
    title: { nl: "Decreet betreffende de hervorming van de Vlaamse huurpremie", fr: "Décret portant réforme de la prime locative flamande" },
    summary: { nl: "Verhoging van de huurpremie voor lage inkomens van €150 naar €210/maand. Uitbreiding van de doelgroep tot alleenstaanden met inkomen onder €22.000/jaar.", fr: "Augmentation de la prime locative pour bas revenus de €150 à €210/mois. Extension du groupe cible aux isolés avec revenu sous €22.000/an." },
    introduced_by: { name: "Matthias Diependaele", party: "N-VA" },
    url: "https://docs.vlaamsparlement.be/pfile?id=2054892",
    votes: {
      yes: [
        { name: "Matthias Diependaele", party: "N-VA" }, { name: "Annick De Ridder", party: "N-VA" },
        { name: "Freya Van den Bossche", party: "Vooruit" }, { name: "Katrien Schryvers", party: "CD&V" },
      ],
      no: [{ name: "Chris Janssen", party: "Vlaams Belang" }],
      abstain: [{ name: "Björn Rzoska", party: "Groen" }],
    },
    consistency_alerts: [],
    impact: { nl: "Raakt ±84.000 Vlaamse huurders. Extra overheidsuitgave: €51M/jaar.", fr: "Touche ±84.000 locataires flamands. Dépense publique supplémentaire: €51M/an." }
  },
  {
    id: "bill_005",
    number: "3698/001",
    source: "federal",
    date: "2025-01-15",
    status: "rejected",
    theme: "social",
    themeColor: "#7c3aed",
    title: { nl: "Wetsvoorstel tot invoering van een basisinkomen van €1.000/maand", fr: "Proposition de loi instaurant un revenu de base de €1.000/mois" },
    summary: { nl: "Voorstel van PVDA/PTB voor een universeel basisinkomen van €1.000/maand voor alle Belgische inwoners. Geraamde jaarlijkse kostprijs: €87 miljard.", fr: "Proposition du PTB/PVDA pour un revenu universel de base de €1.000/mois pour tous les résidents belges. Coût annuel estimé: €87 milliards." },
    introduced_by: { name: "Raoul Hedebouw", party: "PVDA/PTB" },
    url: "https://www.lachambre.be/kvvcr/showpage.cfm?section=flwb&language=nl&cfm=flwbn.cfm?lang=N&legislat=56&dossierID=3698",
    votes: {
      yes: [{ name: "Raoul Hedebouw", party: "PVDA/PTB" }, { name: "Samuel Cogolati", party: "Ecolo" }],
      no: [
        { name: "Alexia Bertrand", party: "MR" }, { name: "Theo Francken", party: "N-VA" },
        { name: "Nathalie Muylle", party: "CD&V" }, { name: "Melissa Depraetere", party: "Vooruit" },
        { name: "Peter De Roover", party: "Vlaams Belang" },
      ],
      abstain: [],
    },
    consistency_alerts: [],
    impact: { nl: "Verworpen met 118 stemmen tegen, 14 voor. Geen budgettaire impact.", fr: "Rejeté par 118 voix contre, 14 pour. Aucun impact budgétaire." }
  },
  {
    id: "bill_006",
    number: "3921/001",
    source: "federal",
    date: "2025-03-20",
    status: "introduced",
    theme: "healthcare",
    themeColor: "#0369a1",
    title: { nl: "Wetsvoorstel tot uitbreiding van de maximumfactuur in de gezondheidszorg", fr: "Proposition de loi élargissant le maximum à facturer dans les soins de santé" },
    summary: { nl: "Verlaging van de maximumfactuur voor chronisch zieken van €450 naar €300/jaar. Uitbreiding tot tandzorg en kinesitherapie voor 65-plussers.", fr: "Réduction du maximum à facturer pour malades chroniques de €450 à €300/an. Extension aux soins dentaires et kinésithérapie pour les +65 ans." },
    introduced_by: { name: "Frank Vandenbroucke", party: "Vooruit" },
    url: "https://www.lachambre.be/kvvcr/showpage.cfm?section=flwb&language=nl&cfm=flwbn.cfm?lang=N&legislat=56&dossierID=3921",
    votes: null,
    consistency_alerts: [],
    impact: { nl: "Raakt 1,1 miljoen chronisch zieken. Geraamde kost: €340M/jaar. In behandeling bij commissie Volksgezondheid.", fr: "Touche 1,1 million de malades chroniques. Coût estimé: €340M/an. En cours d'examen à la commission Santé publique." }
  }
];

const TAX_BREAKDOWN = [
  {
    id: "social", label: { nl: "Sociale zekerheid", fr: "Sécurité sociale" }, pct: 31.2, color: "#1a3a5c", amount: 72400000000,
    party: ["PS", "Vooruit", "CD&V"],
    children: [
      { id: "pensions", label: { nl: "Pensioenen", fr: "Pensions" }, pct: 43, color: "#1e4d80", amount: 31100000000, children: [] },
      { id: "healthcare_ss", label: { nl: "Ziekteverzekering", fr: "Assurance maladie" }, pct: 35, color: "#2563a8", amount: 25300000000, children: [] },
      { id: "unemployment", label: { nl: "Werkloosheid", fr: "Chômage" }, pct: 14, color: "#3d7fc4", amount: 10100000000, children: [] },
      { id: "other_ss", label: { nl: "Overige sociale", fr: "Autres social" }, pct: 8, color: "#5a9fd4", amount: 5900000000, children: [] },
    ]
  },
  {
    id: "debt", label: { nl: "Staatsschuld aflossing", fr: "Remboursement dette" }, pct: 18.7, color: "#7f1d1d", amount: 43400000000,
    party: ["MR", "N-VA"],
    children: []
  },
  {
    id: "education", label: { nl: "Onderwijs", fr: "Enseignement" }, pct: 12.4, color: "#065f46", amount: 28800000000,
    party: ["CD&V", "Les Engagés", "PS"],
    children: [
      { id: "primary", label: { nl: "Lager onderwijs", fr: "Enseignement primaire" }, pct: 38, color: "#047857", amount: 10900000000, children: [] },
      { id: "secondary", label: { nl: "Secundair onderwijs", fr: "Enseignement secondaire" }, pct: 34, color: "#059669", amount: 9800000000, children: [] },
      { id: "higher", label: { nl: "Hoger onderwijs", fr: "Enseignement supérieur" }, pct: 28, color: "#10b981", amount: 8100000000, children: [] },
    ]
  },
  {
    id: "subsidies", label: { nl: "Subsidies & dotaties", fr: "Subventions & dotations" }, pct: 9.8, color: "#7c3aed", amount: 22700000000,
    party: ["PS", "Ecolo", "Vooruit"],
    children: [
      {
        id: "ngo", label: { nl: "NGO's & vzw's", fr: "ONG & ASBL" }, pct: 28, color: "#8b5cf6", amount: 6400000000,
        children: [
          { id: "11_11_11", label: { nl: "11.11.11", fr: "11.11.11" }, pct: 12, color: "#a78bfa", amount: 768000000, children: [] },
          { id: "rode_kruis", label: { nl: "Rode Kruis", fr: "Croix-Rouge" }, pct: 18, color: "#a78bfa", amount: 1152000000, children: [] },
          { id: "other_ngo", label: { nl: "Overige NGO's (2.400+)", fr: "Autres ONG (2.400+)" }, pct: 70, color: "#c4b5fd", amount: 4480000000, children: [] },
        ]
      },
      { id: "media", label: { nl: "Mediabedrijven & pers", fr: "Médias & presse" }, pct: 18, color: "#9d6efa", amount: 4086000000, children: [] },
      { id: "culture", label: { nl: "Cultuur & sport", fr: "Culture & sport" }, pct: 22, color: "#a855f7", amount: 4994000000, children: [] },
      { id: "business", label: { nl: "Bedrijfssubsidies", fr: "Subventions entreprises" }, pct: 32, color: "#c026d3", amount: 7264000000, children: [] },
    ]
  },
  {
    id: "migration", label: { nl: "Migratie & asiel", fr: "Migration & asile" }, pct: 4.2, color: "#c2410c", amount: 9700000000,
    party: ["PS", "Ecolo", "Vooruit"],
    children: [
      { id: "fedasil", label: { nl: "Opvangcentra (Fedasil)", fr: "Centres d'accueil (Fedasil)" }, pct: 38, color: "#ea580c", amount: 3686000000, children: [] },
      { id: "integration", label: { nl: "Inburgeringstrajecten", fr: "Parcours d'intégration" }, pct: 24, color: "#f97316", amount: 2328000000, children: [] },
      { id: "social_migration", label: { nl: "Sociale steun nieuwkomers", fr: "Aide sociale nouveaux arrivants" }, pct: 38, color: "#fb923c", amount: 3686000000, children: [] },
    ]
  },
  {
    id: "defense", label: { nl: "Defensie", fr: "Défense" }, pct: 4.8, color: "#374151", amount: 11100000000, party: ["N-VA", "MR"], children: [] },
  {
    id: "infrastructure", label: { nl: "Infrastructuur", fr: "Infrastructure" }, pct: 6.3, color: "#0369a1", amount: 14600000000,
    party: ["N-VA", "CD&V"],
    children: []
  },
  {
    id: "other", label: { nl: "Overige uitgaven", fr: "Autres dépenses" }, pct: 12.6, color: "#6b7280", amount: 29200000000, party: [], children: [] }
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const fmt = (n) => new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const fmtB = (n) => n >= 1e9 ? `€${(n / 1e9).toFixed(1)}Mrd` : `€${(n / 1e6).toFixed(0)}M`;

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function CiviQ() {
  const [lang, setLang] = useState("nl");
  const [activeTab, setActiveTab] = useState("government");
  const [selectedCommune, setSelectedCommune] = useState(null);
  const [searchVal, setSearchVal] = useState("");
  const [selectedPolitician, setSelectedPolitician] = useState(null);
  const [pieHistory, setPieHistory] = useState([TAX_BREAKDOWN]);
  const [hoveredPie, setHoveredPie] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  const t = (obj) => typeof obj === "object" ? (obj[lang] || obj.nl) : obj;

  const filteredCommunes = COMMUNES.filter(c =>
    c.name.toLowerCase().includes(searchVal.toLowerCase())
  );

  const currentGovs = selectedCommune
    ? Object.values(GOVERNMENTS).filter(g => g.regions.includes(selectedCommune.region))
    : [];

  return (
    <div style={{
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      background: "#f0f2f5",
      minHeight: "100vh",
      color: "#0f1923"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #e5e7eb; } ::-webkit-scrollbar-thumb { background: #9ca3af; border-radius: 3px; }
        .fade-in { animation: fadeIn 0.5s ease forwards; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(12px);} to { opacity:1; transform:translateY(0);} }
        .tab-btn { background: none; border: none; cursor: pointer; font-family: inherit; transition: all 0.2s; }
        .score-bar { height: 6px; border-radius: 3px; background: #e5e7eb; overflow: hidden; }
        .score-fill { height: 100%; border-radius: 3px; transition: width 1s ease; }
        .commune-btn { background: white; border: 1.5px solid #e5e7eb; padding: 8px 14px; border-radius: 8px; cursor: pointer; font-family: inherit; font-size: 13px; transition: all 0.15s; }
        .commune-btn:hover { border-color: #1a3a5c; background: #f8fafc; }
        .commune-btn.active { border-color: #1a3a5c; background: #1a3a5c; color: white; }
        .pol-card { background: white; border-radius: 12px; border: 1.5px solid #e5e7eb; padding: 16px; cursor: pointer; transition: all 0.2s; }
        .pol-card:hover { border-color: #1a3a5c; box-shadow: 0 4px 16px rgba(26,58,92,0.12); transform: translateY(-2px); }
        .gov-card { background: white; border-radius: 14px; border: 1.5px solid #e5e7eb; padding: 20px; transition: all 0.2s; }
        .pill { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
        .verdict-kept { background: #d1fae5; color: #065f46; }
        .verdict-partial { background: #fef3c7; color: #92400e; }
        .verdict-broken { background: #fee2e2; color: #991b1b; }
        .source-link { font-size: 11px; color: #6b7280; text-decoration: underline; cursor: pointer; }
        .pie-segment { cursor: pointer; transition: opacity 0.15s; }
        .pie-segment:hover { opacity: 0.85; }
        input { font-family: inherit; }
      `}</style>

      {/* ── HEADER ── */}
      <header style={{ background: "#0f1923", color: "white", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 12px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#2563eb,#1a3a5c)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🏛</div>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 900, letterSpacing: -0.5 }}>BelgiQ</span>
          <span style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>BETA</span>
        </div>
        <nav style={{ display: "flex", gap: 4 }}>
          {[
            { id: "government", icon: "🗺️", nl: "Mijn Overheid", fr: "Mon Gouvernement" },
            { id: "taxmoney", icon: "💰", nl: "Mijn Belastingen", fr: "Mes Impôts" },
            { id: "partymatch", icon: "🎯", nl: "Partijmatch", fr: "Match de Parti" },
            { id: "promises", icon: "📋", nl: "Beloftes", fr: "Promesses" },
            { id: "bills", icon: "⚖️", nl: "Wetgeving", fr: "Législation" },
          ].map(tab => (
            <button key={tab.id} className="tab-btn" onClick={() => setActiveTab(tab.id)} style={{
              padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
              color: activeTab === tab.id ? "white" : "#9ca3af",
              background: activeTab === tab.id ? "#1e3a5f" : "transparent"
            }}>
              <span style={{ marginRight: 6 }}>{tab.icon}</span>{t(tab)}
            </button>
          ))}
        </nav>
        <div style={{ display: "flex", gap: 4 }}>
          {["nl", "fr"].map(l => (
            <button key={l} className="tab-btn" onClick={() => setLang(l)} style={{
              padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700, textTransform: "uppercase",
              background: lang === l ? "#2563eb" : "transparent",
              color: lang === l ? "white" : "#6b7280"
            }}>{l}</button>
          ))}
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>

        {/* ── MY GOVERNMENT TAB ── */}
        {activeTab === "government" && (
          <div className="fade-in">
            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 38, fontWeight: 900, lineHeight: 1.1, marginBottom: 8 }}>
                {lang === "nl" ? <>Welke overheden <span style={{ color: "#2563eb" }}>regeren jou?</span></> : <>Quels gouvernements <span style={{ color: "#2563eb" }}>vous gouvernent?</span></>}
              </h1>
              <p style={{ color: "#6b7280", fontSize: 15 }}>
                {lang === "nl" ? "Voer je gemeente in om te zien welke overheden jouw leven beïnvloeden." : "Entrez votre commune pour voir quels gouvernements influencent votre vie."}
              </p>
            </div>

            {/* Commune search */}
            <div style={{ background: "white", borderRadius: 16, border: "1.5px solid #e5e7eb", padding: 24, marginBottom: 28 }}>
              <div style={{ position: "relative", marginBottom: 16 }}>
                <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "#9ca3af" }}>🔍</span>
                <input
                  value={searchVal}
                  onChange={e => setSearchVal(e.target.value)}
                  placeholder={lang === "nl" ? "Zoek je gemeente..." : "Cherchez votre commune..."}
                  style={{ width: "100%", padding: "10px 14px 10px 40px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 15, outline: "none" }}
                />
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {filteredCommunes.map(c => (
                  <button key={c.id} className={`commune-btn ${selectedCommune?.id === c.id ? "active" : ""}`} onClick={() => setSelectedCommune(c)}>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Government cards */}
            {selectedCommune ? (
              <>
                <div style={{ marginBottom: 16 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1 }}>
                    {lang === "nl" ? `Overheden die ${selectedCommune.name} besturen` : `Gouvernements administrant ${selectedCommune.name}`}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16, marginBottom: 32 }}>
                  {currentGovs.map(gov => {
                    const pm = gov.pm ? POLITICIANS[gov.pm] : null;
                    return (
                      <div key={gov.id} className="gov-card">
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                          <div style={{ width: 44, height: 44, borderRadius: 12, background: gov.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{gov.icon}</div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 15 }}>{t(gov.name)}</div>
                            <div style={{ fontSize: 12, color: "#6b7280" }}>{fmtB(gov.budget)} {lang === "nl" ? "jaarbudget" : "budget annuel"}</div>
                          </div>
                        </div>

                        {/* Coalition */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 14 }}>
                          {gov.coalition.map(p => (
                            <span key={p} className="pill" style={{ background: PARTIES[p]?.color || "#e5e7eb", color: PARTIES[p]?.textColor || "#000" }}>{p}</span>
                          ))}
                        </div>

                        {/* Competences */}
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", marginBottom: 6, letterSpacing: 0.5 }}>
                            {lang === "nl" ? "Bevoegdheden" : "Compétences"}
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {t(gov.competences).map(c => (
                              <span key={c} style={{ fontSize: 11, background: "#f3f4f6", color: "#374151", padding: "2px 8px", borderRadius: 6 }}>{c}</span>
                            ))}
                          </div>
                        </div>

                        {/* Minister-President */}
                        {pm && (
                          <div
                            className="pol-card"
                            onClick={() => setSelectedPolitician(pm)}
                            style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}
                          >
                            <div style={{ width: 38, height: 38, borderRadius: 10, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, overflow: "hidden", flexShrink: 0 }}>
                              {pm.photo ? <img src={pm.photo} alt={pm.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, fontSize: 13 }}>{pm.name}</div>
                              <div style={{ fontSize: 11, color: "#6b7280" }}>{t(pm.role)}</div>
                            </div>
                            <ScoreChips politician={pm} mini />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Budget & Power Flow */}
                {LOCAL_GOVERNMENTS[selectedCommune.id] && (
                  <BudgetFlowSection
                    lang={lang} t={t}
                    local={LOCAL_GOVERNMENTS[selectedCommune.id]}
                    commune={selectedCommune}
                    govs={GOVERNMENTS}
                  />
                )}

                {/* All politicians for this region */}
                <div style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1 }}>
                    {lang === "nl" ? "Alle politici die jou beïnvloeden" : "Tous les politiciens vous influençant"}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
                  {Object.values(POLITICIANS)
                    .filter(p => p.governments.some(g => currentGovs.find(cg => cg.id === g)))
                    .map(pol => <PoliticianCard key={pol.id} pol={pol} lang={lang} t={t} onClick={() => setSelectedPolitician(pol)} />)}
                </div>
              </>
            ) : (
              <div style={{ background: "white", borderRadius: 16, border: "1.5px dashed #d1d5db", padding: 60, textAlign: "center", color: "#9ca3af" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🗺️</div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{lang === "nl" ? "Kies je gemeente hierboven" : "Choisissez votre commune ci-dessus"}</div>
                <div style={{ fontSize: 13, marginTop: 6 }}>{lang === "nl" ? "Dan tonen we welke overheden invloed hebben op jouw leven." : "Nous vous montrerons quels gouvernements influencent votre vie."}</div>
              </div>
            )}
          </div>
        )}

        {/* ── TAX MONEY TAB ── */}
        {activeTab === "taxmoney" && (
          <div className="fade-in">
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 38, fontWeight: 900, lineHeight: 1.1, marginBottom: 8 }}>
                {lang === "nl" ? <>Waar gaat <span style={{ color: "#7c3aed" }}>jouw belastinggeld</span> naartoe?</> : <>Où va <span style={{ color: "#7c3aed" }}>votre argent</span>?</>}
              </h1>
              <p style={{ color: "#6b7280", fontSize: 15 }}>
                {lang === "nl" ? "Klik op een segment om verder in te zoomen. Gecombineerd federaal + regionaal budget." : "Cliquez sur un segment pour zoomer. Budget fédéral + régional combiné."}
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 24, alignItems: "start" }}>
              {/* Pie chart */}
              <div style={{ background: "white", borderRadius: 16, border: "1.5px solid #e5e7eb", padding: 28 }}>
                {/* Breadcrumb */}
                {pieHistory.length > 1 && (
                  <button
                    onClick={() => setPieHistory(h => h.slice(0, -1))}
                    style={{ background: "#f3f4f6", border: "none", cursor: "pointer", padding: "6px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16, fontFamily: "inherit", color: "#374151" }}
                  >← {lang === "nl" ? "Terug" : "Retour"}</button>
                )}
                <SvgPie
                  data={pieHistory[pieHistory.length - 1]}
                  lang={lang}
                  t={t}
                  onSegmentClick={(seg) => { if (seg.children && seg.children.length > 0) setPieHistory(h => [...h, seg.children]); }}
                  onHover={setHoveredPie}
                  hovered={hoveredPie}
                />
                <div style={{ textAlign: "center", marginTop: 12, fontSize: 12, color: "#9ca3af" }}>
                  {lang === "nl" ? "Klik op een segment om details te zien" : "Cliquez sur un segment pour voir les détails"}
                </div>
              </div>

              {/* Legend + detail */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {pieHistory[pieHistory.length - 1].map(item => (
                  <div
                    key={item.id}
                    onClick={() => { if (item.children && item.children.length > 0) setPieHistory(h => [...h, item.children]); setHoveredPie(item.id); }}
                    style={{
                      background: hoveredPie === item.id ? "#f8fafc" : "white",
                      border: `1.5px solid ${hoveredPie === item.id ? item.color : "#e5e7eb"}`,
                      borderRadius: 12, padding: "12px 14px", cursor: item.children?.length ? "pointer" : "default",
                      transition: "all 0.15s"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: item.color, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{t(item.label)}</div>
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>{fmtB(item.amount)} — {item.pct}%</div>
                      </div>
                      {item.children?.length > 0 && <span style={{ fontSize: 11, color: "#9ca3af" }}>▶</span>}
                    </div>
                    {item.party && item.party.length > 0 && (
                      <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
                        {item.party.map(p => (
                          <span key={p} className="pill" style={{ background: PARTIES[p]?.color || "#e5e7eb", color: PARTIES[p]?.textColor || "#000", fontSize: 10 }}>{p}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Mismanagement callout */}
            <div style={{ marginTop: 24, background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: 14, padding: 20 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ fontSize: 24 }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                    {lang === "nl" ? "Slecht beheerd overheidsgeld" : "Argent public mal géré"}
                  </div>
                  <div style={{ fontSize: 13, color: "#92400e", lineHeight: 1.6 }}>
                    {lang === "nl"
                      ? "Het Rekenhof rapporteerde in 2022-2023 over ±€2,4 miljard aan onregelmatig bestede middelen verspreid over alle beleidsniveaus. Dit omvat €450M in Wallonië, €380M in federale corona-uitgaven, en €280M in Brusselse vzw-subsidies zonder adequate controle."
                      : "La Cour des Comptes a rapporté en 2022-2023 environ €2,4 milliards de fonds irrégulièrement dépensés sur tous les niveaux de gouvernement. Cela inclut €450M en Wallonie, €380M en dépenses corona fédérales et €280M en subventions ASBL bruxelloises sans contrôle adéquat."}
                  </div>
                  <div style={{ fontSize: 11, color: "#c2410c", marginTop: 6 }}>
                    📎 <span className="source-link">Rekenhof Jaarverslag 2022 · 2023</span> &nbsp;
                    📎 <span className="source-link">Apache.be Dossier Overheidsuitgaven</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── PARTY MATCH TAB ── */}
        {activeTab === "partymatch" && (
          <div className="fade-in">
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 38, fontWeight: 900, lineHeight: 1.1, marginBottom: 8 }}>
                {lang === "nl" ? <>Welke partij <span style={{ color: "#065f46" }}>werkt voor jou?</span></> : <>Quel parti <span style={{ color: "#065f46" }}>travaille pour vous?</span></>}
              </h1>
              <p style={{ color: "#6b7280", fontSize: 15 }}>
                {lang === "nl" ? "Gebaseerd op beloftes én trackrecord. Voer je inkomensprofiel in." : "Basé sur les promesses ET le bilan. Entrez votre profil de revenu."}
              </p>
            </div>
            <PartyMatchModule lang={lang} t={t} />
          </div>
        )}

        {/* ── PROMISE TRACKER TAB ── */}
        {activeTab === "promises" && (
          <div className="fade-in">
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 38, fontWeight: 900, lineHeight: 1.1, marginBottom: 8 }}>
                {lang === "nl" ? <>Hoe goed houden partijen <span style={{ color: "#c2410c" }}>hun beloftes?</span></> : <>Les partis tiennent-ils <span style={{ color: "#c2410c" }}>leurs promesses?</span></>}
              </h1>
              <p style={{ color: "#6b7280", fontSize: 15 }}>
                {lang === "nl" ? "Analyse van beloftes per partij, 2019 – 2024, per thema." : "Analyse des promesses par parti, 2019 – 2024, par thème."}
              </p>
            </div>
            <PromiseTracker lang={lang} t={t} politicians={POLITICIANS} />
          </div>
        )}

        {/* ── BILLS TAB ── */}
        {activeTab === "bills" && (
          <div className="fade-in">
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 38, fontWeight: 900, lineHeight: 1.1, marginBottom: 8 }}>
                {lang === "nl" ? <>Recente <span style={{ color: "#0369a1" }}>wetgeving & stemmingen</span></> : <>Législation <span style={{ color: "#0369a1" }}>& votes récents</span></>}
              </h1>
              <p style={{ color: "#6b7280", fontSize: 15 }}>
                {lang === "nl" ? "Federaal · Vlaams parlement · Wie stemde wat?" : "Fédéral · Parlement flamand · Qui a voté quoi?"}
              </p>
            </div>
            <BillsModule lang={lang} t={t} bills={BILLS} />
          </div>
        )}

      </main>

      {/* ── POLITICIAN MODAL ── */}
      {selectedPolitician && (
        <PoliticianModal pol={selectedPolitician} lang={lang} t={t} onClose={() => setSelectedPolitician(null)} />
      )}
    </div>
  );
}

// ─── SCORE CHIPS ─────────────────────────────────────────────────────────────

function ScoreChips({ politician: p, mini }) {
  const size = mini ? 28 : 36;
  const fs = mini ? 10 : 11;
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[
        { label: "€", score: p.costScore, color: p.costScore > 65 ? "#c2410c" : p.costScore > 40 ? "#d97706" : "#059669" },
        { label: "✓", score: p.consistencyScore, color: p.consistencyScore > 65 ? "#059669" : p.consistencyScore > 40 ? "#d97706" : "#c2410c" },
        { label: "⚡", score: p.commotionScore, color: p.commotionScore > 65 ? "#c2410c" : p.commotionScore > 40 ? "#d97706" : "#059669" },
      ].map(s => (
        <div key={s.label} style={{ width: size, height: size, borderRadius: size / 3, background: s.color + "18", border: `1.5px solid ${s.color}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: fs - 1, color: s.color }}>{s.label}</span>
          <span style={{ fontSize: fs, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.score}</span>
        </div>
      ))}
    </div>
  );
}

// ─── POLITICIAN CARD ──────────────────────────────────────────────────────────

function PoliticianCard({ pol, lang, t, onClick }) {
  return (
    <div className="pol-card" onClick={onClick}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, overflow: "hidden", flexShrink: 0 }}>
          {pol.photo ? <img src={pol.photo} alt={pol.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{pol.name}</div>
          <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>{t(pol.role)}</div>
          <span className="pill" style={{ background: PARTIES[pol.party]?.color || "#e5e7eb", color: PARTIES[pol.party]?.textColor || "#000", fontSize: 10 }}>{pol.party}</span>
        </div>
      </div>
      <ScoreChips politician={pol} />
      <div style={{ marginTop: 10, fontSize: 12, color: "#374151", fontWeight: 500 }}>
        💸 {fmt(pol.annualCost)} / {lang === "nl" ? "jaar" : "an"}
      </div>
    </div>
  );
}

// ─── SVG PIE CHART ────────────────────────────────────────────────────────────

function SvgPie({ data, lang, t, onSegmentClick, onHover, hovered }) {
  const total = data.reduce((s, d) => s + d.pct, 0);
  const cx = 180, cy = 180, r = 150, ir = 70;
  let cumAngle = -Math.PI / 2;
  const segments = data.map(d => {
    const angle = (d.pct / total) * 2 * Math.PI;
    const start = cumAngle;
    cumAngle += angle;
    const end = cumAngle;
    const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
    const ix1 = cx + ir * Math.cos(start), iy1 = cy + ir * Math.sin(start);
    const ix2 = cx + ir * Math.cos(end), iy2 = cy + ir * Math.sin(end);
    const large = angle > Math.PI ? 1 : 0;
    const midA = start + angle / 2;
    const lx = cx + (r * 0.7) * Math.cos(midA), ly = cy + (r * 0.7) * Math.sin(midA);
    return { ...d, path: `M ${ix1} ${iy1} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${ir} ${ir} 0 ${large} 0 ${ix1} ${iy1} Z`, lx, ly };
  });
  const hov = hovered ? data.find(d => d.id === hovered) : null;

  return (
    <svg viewBox="0 0 360 360" style={{ width: "100%", maxWidth: 360, display: "block", margin: "0 auto" }}>
      {segments.map(seg => (
        <path
          key={seg.id}
          className="pie-segment"
          d={seg.path}
          fill={seg.color}
          stroke="white"
          strokeWidth={2}
          opacity={hovered && hovered !== seg.id ? 0.6 : 1}
          onClick={() => onSegmentClick(seg)}
          onMouseEnter={() => onHover(seg.id)}
          onMouseLeave={() => onHover(null)}
        />
      ))}
      {/* Center text */}
      <text x={cx} y={cy - 10} textAnchor="middle" fontSize={11} fill="#6b7280">{hov ? t(hov.label) : (lang === "nl" ? "Totaal" : "Total")}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize={15} fontWeight="700" fill="#0f1923">
        {hov ? fmtB(hov.amount) : "€232Mrd"}
      </text>
      {hov && <text x={cx} y={cy + 28} textAnchor="middle" fontSize={12} fill="#6b7280">{hov.pct}%</text>}
    </svg>
  );
}

// ─── POLITICIAN MODAL ─────────────────────────────────────────────────────────

function PoliticianModal({ pol, lang, t, onClose }) {
  const [activeSection, setActiveSection] = useState("overview");

  const verdictMap = {
    kept: { nl: "Gehouden", fr: "Tenue", cls: "verdict-kept", icon: "✅" },
    partial: { nl: "Gedeeltelijk", fr: "Partielle", cls: "verdict-partial", icon: "⚠️" },
    broken: { nl: "Verbroken", fr: "Brisée", cls: "verdict-broken", icon: "❌" }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: "white", borderRadius: 20, maxWidth: 680, width: "100%", maxHeight: "88vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>

        {/* Modal header */}
        <div style={{ background: "#0f1923", borderRadius: "20px 20px 0 0", padding: "24px 28px", color: "white", display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={{ width: 60, height: 60, borderRadius: 14, background: "#1e3a5f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, overflow: "hidden", flexShrink: 0 }}>
            {pol.photo ? <img src={pol.photo} alt={pol.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 900 }}>{pol.name}</div>
            <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>{t(pol.role)}</div>
            <span className="pill" style={{ background: PARTIES[pol.party]?.color || "#e5e7eb", color: PARTIES[pol.party]?.textColor || "#000", marginTop: 8, fontSize: 11 }}>{pol.party}</span>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        {/* Score overview */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, background: "#e5e7eb" }}>
          {[
            { key: "cost", label: { nl: "Kostprijs", fr: "Coût" }, score: pol.costScore, val: fmt(pol.annualCost), color: pol.costScore > 65 ? "#c2410c" : pol.costScore > 40 ? "#d97706" : "#059669", note: { nl: "per jaar", fr: "par an" } },
            { key: "consistency", label: { nl: "Consistentie", fr: "Cohérence" }, score: pol.consistencyScore, val: `${pol.consistencyScore}/100`, color: pol.consistencyScore > 65 ? "#059669" : pol.consistencyScore > 40 ? "#d97706" : "#c2410c", note: { nl: "stem vs. belofte", fr: "vote vs. promesse" } },
            { key: "commotion", label: { nl: "Controverse", fr: "Controverse" }, score: pol.commotionScore, val: `${pol.commotionScore}/100`, color: pol.commotionScore > 65 ? "#c2410c" : pol.commotionScore > 40 ? "#d97706" : "#059669", note: { nl: "issues gevonden", fr: "problèmes trouvés" } },
          ].map(s => (
            <div key={s.key} style={{ background: "white", padding: "18px 20px" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{t(s.label)}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{t(s.note)}</div>
              <div className="score-bar" style={{ marginTop: 8 }}>
                <div className="score-fill" style={{ width: `${s.score}%`, background: s.color }} />
              </div>
            </div>
          ))}
        </div>

        {/* Section tabs */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #e5e7eb", padding: "0 28px" }}>
          {[
            { id: "overview", nl: "💰 Kosten", fr: "💰 Coûts" },
            { id: "consistency", nl: "📋 Beloftes", fr: "📋 Promesses" },
            { id: "commotion", nl: "⚡ Controverse", fr: "⚡ Controverse" }
          ].map(s => (
            <button key={s.id} className="tab-btn" onClick={() => setActiveSection(s.id)} style={{
              padding: "12px 16px", fontSize: 13, fontWeight: 500, borderBottom: activeSection === s.id ? "2px solid #1a3a5c" : "2px solid transparent",
              color: activeSection === s.id ? "#1a3a5c" : "#9ca3af"
            }}>{lang === "nl" ? s.nl : s.fr}</button>
          ))}
        </div>

        <div style={{ padding: 28 }}>
          {activeSection === "overview" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {lang === "nl" ? "Kostenverdeling" : "Répartition des coûts"}
              </div>
              {pol.costBreakdown.map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{t(item.label)}</div>
                    <span className="source-link">📎 {item.source}</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{fmt(item.amount)}</div>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", marginTop: 4 }}>
                <div style={{ fontWeight: 700 }}>{lang === "nl" ? "Totaal per jaar" : "Total par an"}</div>
                <div style={{ fontWeight: 800, fontSize: 16, color: "#1a3a5c" }}>{fmt(pol.annualCost)}</div>
              </div>
            </div>
          )}

          {activeSection === "consistency" && (
            <div>
              {pol.consistencyEvents.length === 0 ? (
                <div style={{ color: "#9ca3af", fontSize: 13 }}>{lang === "nl" ? "Geen data beschikbaar." : "Aucune donnée disponible."}</div>
              ) : pol.consistencyEvents.map((ev, i) => {
                const v = verdictMap[ev.verdict];
                return (
                  <div key={i} style={{ borderLeft: "3px solid " + (ev.verdict === "kept" ? "#10b981" : ev.verdict === "partial" ? "#f59e0b" : "#ef4444"), paddingLeft: 16, marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                      {lang === "nl" ? "📢 Belofte: " : "📢 Promesse: "}{t(ev.promise)}
                    </div>
                    <div style={{ fontSize: 13, color: "#374151", marginBottom: 8 }}>
                      {lang === "nl" ? "✏️ Actie: " : "✏️ Action: "}{t(ev.action)}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className={`pill ${v.cls}`}>{v.icon} {lang === "nl" ? v.nl : v.fr}</span>
                      <span className="source-link">📎 {ev.source}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeSection === "commotion" && (
            <div>
              {pol.commotionEvents.length === 0 ? (
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: 16, fontSize: 13, color: "#065f46" }}>
                  {lang === "nl" ? "✅ Geen controverses gevonden in onze bronnen." : "✅ Aucune controverse trouvée dans nos sources."}
                </div>
              ) : pol.commotionEvents.map((ev, i) => {
                const typeMap = { audit: { icon: "🔍", nl: "Audit", fr: "Audit" }, media: { icon: "📰", nl: "Media", fr: "Presse" }, judicial: { icon: "⚖️", nl: "Juridisch", fr: "Judiciaire" }, ethics: { icon: "🚨", nl: "Deontologie", fr: "Déontologie" } };
                const tp = typeMap[ev.type] || { icon: "❗", nl: ev.type, fr: ev.type };
                return (
                  <div key={i} style={{ background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: 12, padding: 16, marginBottom: 12 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 20 }}>{tp.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#92400e", textTransform: "uppercase" }}>{lang === "nl" ? tp.nl : tp.fr}</span>
                          <span style={{ fontSize: 11, color: "#c2410c" }}>{"🔴".repeat(ev.severity)}</span>
                        </div>
                        <div style={{ fontSize: 13, color: "#374151", marginBottom: 6 }}>{t(ev.description)}</div>
                        <span className="source-link">📎 {ev.source}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PARTY MATCH MODULE ───────────────────────────────────────────────────────

function PartyMatchModule({ lang, t }) {
  const [income, setIncome] = useState(3500);
  const [commune, setCommune] = useState("beersel");
  const [kids, setKids] = useState(0);
  const [homeowner, setHomeowner] = useState(true);

  const selectedCommune = COMMUNES.find(c => c.id === commune);
  const region = selectedCommune?.region || "flemish";

  const partyImpacts = [
    { party: "N-VA", monthlyImpact: 87, promiseScore: 68, trackScore: 71, total: 75, color: "#f5c518", tc: "#000", pros: { nl: ["Lagere personenbelasting", "Vlaamse autonomie", "Strengere migratie"], fr: ["Impôt sur revenus réduit", "Autonomie flamande", "Migration stricte"] }, cons: { nl: ["Minder sociale uitkeringen", "Besparingen in zorg"], fr: ["Moins d'allocations sociales", "Économies dans les soins"] } },
    { party: "MR", monthlyImpact: 64, promiseScore: 51, trackScore: 44, total: 48, color: "#0057a8", tc: "#fff", pros: { nl: ["Lagere belastingen KMO's", "Economische vrijheid"], fr: ["Moins d'impôts PME", "Liberté économique"] }, cons: { nl: ["Minder herverdelende maatregelen"], fr: ["Moins de mesures redistributives"] } },
    { party: "PS", monthlyImpact: -42, promiseScore: 38, trackScore: 32, total: 35, color: "#e2001a", tc: "#fff", pros: { nl: ["Hogere sociale uitkeringen", "Meer publieke diensten"], fr: ["Allocations sociales plus élevées", "Plus de services publics"] }, cons: { nl: ["Hogere belastingen (middenklasse)", "Historisch slecht trackrecord (SAM, Publifin)"], fr: ["Impôts plus élevés (classe moyenne)", "Mauvais bilan historique (SAM, Publifin)"] } },
    { party: "Vooruit", monthlyImpact: 18, promiseScore: 55, trackScore: 52, total: 54, color: "#FF6B00", tc: "#fff", pros: { nl: ["Belastingverschuiving naar vermogen", "Hogere minimumlonen"], fr: ["Fiscalité sur le capital", "Salaires minimums plus élevés"] }, cons: { nl: ["Onzekere financiering", "Middenklasse draagt meer bij"], fr: ["Financement incertain", "La classe moyenne contribue plus"] } },
    { party: "CD&V", monthlyImpact: 31, promiseScore: 62, trackScore: 65, total: 64, color: "#f07d00", tc: "#fff", pros: { nl: ["Gezinspolitiek, kindergeld", "Stabiel bestuur"], fr: ["Politique familiale, allocations enfant", "Gouvernance stable"] }, cons: { nl: ["Beperkte hervormingen", "Hoge partijdotaties"], fr: ["Réformes limitées", "Dotations partisanes élevées"] } },
    { party: "Vlaams Belang", monthlyImpact: 112, promiseScore: 71, trackScore: null, total: null, color: "#ffe000", tc: "#000", pros: { nl: ["Laagste belastingbelofte", "Streng migratie = lagere kosten"], fr: ["Promesse d'impôt la plus basse", "Migration stricte = coûts réduits"] }, cons: { nl: ["Nooit in bestuur geweest (trackrecord onbekend)", "Sociale zekerheid onzeker"], fr: ["Jamais au gouvernement (bilan inconnu)", "Sécurité sociale incertaine"] } },
  ].filter(p => {
    if (region === "walloon" || region === "brussels") return !["N-VA", "CD&V", "Vlaams Belang"].includes(p.party);
    if (region === "flemish") return !["PS", "Les Engagés"].includes(p.party);
    return true;
  }).sort((a, b) => (b.monthlyImpact + income * 0.001) - (a.monthlyImpact + income * 0.001));

  const maxImpact = Math.max(...partyImpacts.map(p => Math.abs(p.monthlyImpact)));

  return (
    <div>
      {/* Inputs */}
      <div style={{ background: "white", borderRadius: 16, border: "1.5px solid #e5e7eb", padding: 24, marginBottom: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 8 }}>
              {lang === "nl" ? "Netto maandinkomen" : "Revenu net mensuel"}
            </label>
            <input type="range" min={1000} max={8000} step={100} value={income} onChange={e => setIncome(+e.target.value)} style={{ width: "100%", marginBottom: 4 }} />
            <div style={{ fontWeight: 700, fontSize: 18, color: "#1a3a5c" }}>{fmt(income)}</div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 8 }}>
              {lang === "nl" ? "Gemeente" : "Commune"}
            </label>
            <select value={commune} onChange={e => setCommune(e.target.value)} style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontFamily: "inherit", fontSize: 14 }}>
              {COMMUNES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 8 }}>
              {lang === "nl" ? "Kinderen" : "Enfants"}
            </label>
            <div style={{ display: "flex", gap: 6 }}>
              {[0, 1, 2, 3].map(n => (
                <button key={n} onClick={() => setKids(n)} style={{ flex: 1, padding: "8px 0", border: `1.5px solid ${kids === n ? "#1a3a5c" : "#e5e7eb"}`, borderRadius: 8, background: kids === n ? "#1a3a5c" : "white", color: kids === n ? "white" : "#374151", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, fontSize: 14 }}>{n}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 8 }}>
              {lang === "nl" ? "Eigenaar" : "Propriétaire"}
            </label>
            <div style={{ display: "flex", gap: 6 }}>
              {[{ v: true, nl: "Ja", fr: "Oui" }, { v: false, nl: "Nee", fr: "Non" }].map(opt => (
                <button key={String(opt.v)} onClick={() => setHomeowner(opt.v)} style={{ flex: 1, padding: "8px 0", border: `1.5px solid ${homeowner === opt.v ? "#1a3a5c" : "#e5e7eb"}`, borderRadius: 8, background: homeowner === opt.v ? "#1a3a5c" : "white", color: homeowner === opt.v ? "white" : "#374151", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, fontSize: 14 }}>{lang === "nl" ? opt.nl : opt.fr}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Party rankings */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {partyImpacts.map((p, idx) => (
          <div key={p.party} style={{ background: "white", borderRadius: 14, border: "1.5px solid #e5e7eb", padding: 20, position: "relative", overflow: "hidden" }}>
            {idx === 0 && (
              <div style={{ position: "absolute", top: 12, right: 12, background: "#065f46", color: "white", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, textTransform: "uppercase" }}>
                {lang === "nl" ? "Beste match" : "Meilleur match"}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span className="pill" style={{ background: p.color, color: p.tc, fontSize: 13, fontWeight: 700, padding: "6px 14px" }}>{p.party}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{ flex: 1, height: 8, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 4, background: p.monthlyImpact >= 0 ? "#059669" : "#ef4444", width: `${Math.abs(p.monthlyImpact) / maxImpact * 100}%`, transition: "width 0.8s ease" }} />
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: p.monthlyImpact >= 0 ? "#059669" : "#ef4444", minWidth: 80, textAlign: "right" }}>
                    {p.monthlyImpact >= 0 ? "+" : ""}{fmt(p.monthlyImpact)}/{lang === "nl" ? "mnd" : "mois"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                  <span style={{ color: "#6b7280" }}>📢 {lang === "nl" ? "Belofte" : "Promesse"}: <span style={{ fontWeight: 700, color: "#0f1923" }}>{p.promiseScore}/100</span></span>
                  <span style={{ color: "#6b7280" }}>📊 {lang === "nl" ? "Trackrecord" : "Bilan"}: <span style={{ fontWeight: 700, color: "#0f1923" }}>{p.trackScore !== null ? `${p.trackScore}/100` : "N/A"}</span></span>
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#059669", marginBottom: 4 }}>✅ {lang === "nl" ? "Voordelen" : "Avantages"}</div>
                {t(p.pros).map((pro, i) => <div key={i} style={{ fontSize: 12, color: "#374151", marginBottom: 2 }}>• {pro}</div>)}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#ef4444", marginBottom: 4 }}>⚠️ {lang === "nl" ? "Nadelen" : "Inconvénients"}</div>
                {t(p.cons).map((con, i) => <div key={i} style={{ fontSize: 12, color: "#374151", marginBottom: 2 }}>• {con}</div>)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PROMISE TRACKER ──────────────────────────────────────────────────────────

function PromiseTracker({ lang, t, politicians }) {
  const [selectedParty, setSelectedParty] = useState("N-VA");

  const allEvents = Object.values(politicians).flatMap(p =>
    p.consistencyEvents.map(e => ({ ...e, politician: p }))
  ).filter(e => e.politician.party === selectedParty);

  const kept = allEvents.filter(e => e.verdict === "kept").length;
  const partial = allEvents.filter(e => e.verdict === "partial").length;
  const broken = allEvents.filter(e => e.verdict === "broken").length;
  const total = allEvents.length;
  const pct = total > 0 ? Math.round(kept / total * 100) : 0;

  const parties = [...new Set(Object.values(politicians).map(p => p.party))];

  return (
    <div>
      {/* Party selector */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
        {parties.map(p => (
          <button key={p} onClick={() => setSelectedParty(p)} style={{
            padding: "6px 16px", borderRadius: 20, border: `2px solid ${selectedParty === p ? PARTIES[p]?.color || "#1a3a5c" : "#e5e7eb"}`,
            background: selectedParty === p ? PARTIES[p]?.color || "#1a3a5c" : "white",
            color: selectedParty === p ? PARTIES[p]?.textColor || "white" : "#374151",
            cursor: "pointer", fontFamily: "inherit", fontWeight: 600, fontSize: 13, transition: "all 0.15s"
          }}>{p}</button>
        ))}
      </div>

      {/* Summary */}
      <div style={{ background: "white", borderRadius: 14, border: "1.5px solid #e5e7eb", padding: 24, marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
          {[
            { label: { nl: "Gehouden", fr: "Tenues" }, val: kept, color: "#059669", bg: "#d1fae5" },
            { label: { nl: "Gedeeltelijk", fr: "Partielles" }, val: partial, color: "#d97706", bg: "#fef3c7" },
            { label: { nl: "Verbroken", fr: "Brisées" }, val: broken, color: "#ef4444", bg: "#fee2e2" },
            { label: { nl: "Score", fr: "Score" }, val: `${pct}%`, color: pct > 60 ? "#059669" : pct > 40 ? "#d97706" : "#ef4444", bg: "#f3f4f6" },
          ].map(s => (
            <div key={s.label.nl} style={{ background: s.bg, borderRadius: 12, padding: 16, textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{t(s.label)}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: "#9ca3af" }}>
          📅 {lang === "nl" ? "Periode: 2019 – 2024 · Federaal niveau" : "Période: 2019 – 2024 · Niveau fédéral"}
        </div>
      </div>

      {/* Events */}
      {allEvents.length === 0 ? (
        <div style={{ background: "#f3f4f6", borderRadius: 12, padding: 32, textAlign: "center", color: "#9ca3af" }}>
          {lang === "nl" ? "Geen gegevens voor deze partij in onze dataset." : "Aucune donnée pour ce parti dans notre base."}
        </div>
      ) : allEvents.map((ev, i) => {
        const verdictColors = { kept: "#059669", partial: "#d97706", broken: "#ef4444" };
        const verdictLabels = { kept: { nl: "Gehouden ✅", fr: "Tenue ✅" }, partial: { nl: "Gedeeltelijk ⚠️", fr: "Partielle ⚠️" }, broken: { nl: "Verbroken ❌", fr: "Brisée ❌" } };
        return (
          <div key={i} style={{ background: "white", borderRadius: 12, border: "1.5px solid #e5e7eb", padding: 18, marginBottom: 10, borderLeft: `4px solid ${verdictColors[ev.verdict]}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: "#6b7280" }}>👤 {ev.politician.name}</div>
              <span className={`pill verdict-${ev.verdict}`}>{t(verdictLabels[ev.verdict])}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>📢 {t(ev.promise)}</div>
            <div style={{ fontSize: 13, color: "#374151", marginBottom: 8 }}>↳ {t(ev.action)}</div>
            <span className="source-link">📎 {ev.source}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── BILLS MODULE ─────────────────────────────────────────────────────────────

function BillsModule({ lang, t, bills }) {
  const [filterTheme, setFilterTheme] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedBill, setExpandedBill] = useState(null);

  const themes = ["all", ...new Set(bills.map(b => b.theme))];
  const sources = ["all", "federal", "flemish"];
  const statuses = ["all", "passed", "rejected", "committee", "introduced"];

  const statusMeta = {
    passed:     { nl: "Aangenomen", fr: "Adopté",       color: "#059669", bg: "#d1fae5" },
    rejected:   { nl: "Verworpen",  fr: "Rejeté",       color: "#ef4444", bg: "#fee2e2" },
    committee:  { nl: "In commissie", fr: "En commission", color: "#d97706", bg: "#fef3c7" },
    introduced: { nl: "Ingediend",  fr: "Déposé",       color: "#6366f1", bg: "#ede9fe" },
  };

  const sourceMeta = {
    federal: { nl: "Federaal", fr: "Fédéral", icon: "🏛️" },
    flemish: { nl: "Vlaams",   fr: "Flamand", icon: "🦁" },
  };

  const themeMeta = {
    fiscal:     { nl: "Fiscaliteit", fr: "Fiscalité" },
    migration:  { nl: "Migratie",    fr: "Migration" },
    energy:     { nl: "Energie",     fr: "Énergie" },
    housing:    { nl: "Wonen",       fr: "Logement" },
    social:     { nl: "Sociaal",     fr: "Social" },
    healthcare: { nl: "Gezondheid",  fr: "Santé" },
  };

  const filtered = bills.filter(b =>
    (filterTheme  === "all" || b.theme  === filterTheme) &&
    (filterSource === "all" || b.source === filterSource) &&
    (filterStatus === "all" || b.status === filterStatus)
  );

  const FilterBar = ({ options, value, onChange, labelFn }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map(opt => (
        <button key={opt} onClick={() => onChange(opt)} style={{
          padding: "5px 12px", borderRadius: 20, border: `1.5px solid ${value === opt ? "#1a3a5c" : "#e5e7eb"}`,
          background: value === opt ? "#1a3a5c" : "white",
          color: value === opt ? "white" : "#374151",
          cursor: "pointer", fontFamily: "inherit", fontWeight: 500, fontSize: 12, transition: "all 0.15s"
        }}>{labelFn(opt)}</button>
      ))}
    </div>
  );

  return (
    <div>
      {/* Filters */}
      <div style={{ background: "white", borderRadius: 14, border: "1.5px solid #e5e7eb", padding: 20, marginBottom: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{lang === "nl" ? "Thema" : "Thème"}</div>
            <FilterBar options={themes} value={filterTheme} onChange={setFilterTheme}
              labelFn={o => o === "all" ? (lang === "nl" ? "Alle" : "Tous") : t(themeMeta[o] || { nl: o, fr: o })} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{lang === "nl" ? "Parlement" : "Parlement"}</div>
            <FilterBar options={sources} value={filterSource} onChange={setFilterSource}
              labelFn={o => o === "all" ? (lang === "nl" ? "Alle" : "Tous") : `${sourceMeta[o]?.icon} ${t(sourceMeta[o])}`} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{lang === "nl" ? "Status" : "Statut"}</div>
            <FilterBar options={statuses} value={filterStatus} onChange={setFilterStatus}
              labelFn={o => o === "all" ? (lang === "nl" ? "Alle" : "Tous") : t(statusMeta[o])} />
          </div>
        </div>
        <div style={{ fontSize: 12, color: "#9ca3af" }}>
          {filtered.length} {lang === "nl" ? "wetsvoorstellen gevonden" : "propositions trouvées"} · {lang === "nl" ? "Bron: Kamer.be, docs.vlaamsparlement.be" : "Source: Kamer.be, docs.vlaamsparlement.be"}
        </div>
      </div>

      {/* Bills list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map(bill => {
          const sm = statusMeta[bill.status];
          const src = sourceMeta[bill.source];
          const isExpanded = expandedBill === bill.id;
          const totalVotes = bill.votes ? bill.votes.yes.length + bill.votes.no.length + bill.votes.abstain.length : 0;
          const yesPct = totalVotes > 0 ? Math.round(bill.votes.yes.length / totalVotes * 100) : 0;

          return (
            <div key={bill.id} style={{ background: "white", borderRadius: 14, border: "1.5px solid #e5e7eb", overflow: "hidden", transition: "all 0.2s" }}>
              {/* Bill header */}
              <div
                onClick={() => setExpandedBill(isExpanded ? null : bill.id)}
                style={{ padding: 20, cursor: "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  {/* Theme color bar */}
                  <div style={{ width: 4, background: bill.themeColor, borderRadius: 4, alignSelf: "stretch", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "#9ca3af" }}>{src?.icon} {t(src)} · {bill.number} · {bill.date}</span>
                      <span className="pill" style={{ background: sm?.bg, color: sm?.color, fontSize: 10 }}>{t(sm)}</span>
                      <span className="pill" style={{ background: bill.themeColor + "18", color: bill.themeColor, fontSize: 10 }}>{t(themeMeta[bill.theme] || { nl: bill.theme, fr: bill.theme })}</span>
                      {bill.consistency_alerts?.length > 0 && (
                        <span className="pill" style={{ background: "#fff7ed", color: "#c2410c", fontSize: 10 }}>⚡ {bill.consistency_alerts.length} {lang === "nl" ? "alert" : "alerte"}{bill.consistency_alerts.length > 1 ? "s" : ""}</span>
                      )}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.4, marginBottom: 6 }}>{t(bill.title)}</div>
                    <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>{t(bill.summary)}</div>

                    {/* Quick vote bar if voted */}
                    {bill.votes && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ display: "flex", gap: 2, height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 4 }}>
                          <div style={{ flex: bill.votes.yes.length, background: "#10b981" }} />
                          <div style={{ flex: bill.votes.abstain.length, background: "#d1d5db" }} />
                          <div style={{ flex: bill.votes.no.length, background: "#ef4444" }} />
                        </div>
                        <div style={{ display: "flex", gap: 14, fontSize: 11, color: "#6b7280" }}>
                          <span style={{ color: "#059669" }}>✅ {bill.votes.yes.length} {lang === "nl" ? "voor" : "pour"}</span>
                          <span style={{ color: "#9ca3af" }}>⬜ {bill.votes.abstain.length} {lang === "nl" ? "onthouding" : "abstention"}</span>
                          <span style={{ color: "#ef4444" }}>❌ {bill.votes.no.length} {lang === "nl" ? "tegen" : "contre"}</span>
                        </div>
                      </div>
                    )}
                    {!bill.votes && (
                      <div style={{ marginTop: 8, fontSize: 11, color: "#9ca3af", fontStyle: "italic" }}>
                        {lang === "nl" ? "Stemming nog niet plaatsgevonden" : "Vote pas encore eu lieu"}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 18, color: "#9ca3af", flexShrink: 0 }}>{isExpanded ? "▲" : "▼"}</span>
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div style={{ borderTop: "1px solid #f3f4f6", padding: 20, background: "#fafafa" }}>

                  {/* Impact */}
                  <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: 14, marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#1e40af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>💡 {lang === "nl" ? "Impact voor jou" : "Impact pour vous"}</div>
                    <div style={{ fontSize: 13, color: "#1e3a8a" }}>{t(bill.impact)}</div>
                  </div>

                  {/* Consistency alerts */}
                  {bill.consistency_alerts?.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#c2410c", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>⚡ {lang === "nl" ? "Consistentie-alerts" : "Alertes de cohérence"}</div>
                      {bill.consistency_alerts.map((alert, i) => (
                        <div key={i} style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, padding: 10, marginBottom: 6, fontSize: 12 }}>
                          <span className="pill" style={{ background: PARTIES[alert.party]?.color, color: PARTIES[alert.party]?.textColor, marginRight: 8, fontSize: 10 }}>{alert.party}</span>
                          <strong>{alert.politician}</strong>: {lang === "nl" ? alert.nl : alert.fr}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Vote breakdown */}
                  {bill.votes && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                      {[
                        { label: { nl: "Voor", fr: "Pour" }, voters: bill.votes.yes, color: "#059669", bg: "#d1fae5", icon: "✅" },
                        { label: { nl: "Onthoudingen", fr: "Abstentions" }, voters: bill.votes.abstain, color: "#9ca3af", bg: "#f3f4f6", icon: "⬜" },
                        { label: { nl: "Tegen", fr: "Contre" }, voters: bill.votes.no, color: "#ef4444", bg: "#fee2e2", icon: "❌" },
                      ].map(group => (
                        <div key={group.icon} style={{ background: group.bg, borderRadius: 10, padding: 12 }}>
                          <div style={{ fontWeight: 700, fontSize: 12, color: group.color, marginBottom: 8 }}>{group.icon} {t(group.label)} ({group.voters.length})</div>
                          {group.voters.map((v, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                              <span className="pill" style={{ background: PARTIES[v.party]?.color || "#e5e7eb", color: PARTIES[v.party]?.textColor || "#000", fontSize: 9, padding: "2px 6px" }}>{v.party}</span>
                              <span style={{ fontSize: 11, color: "#374151" }}>{v.name}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Introduced by + source link */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#6b7280" }}>
                    <span>
                      {lang === "nl" ? "Ingediend door" : "Déposé par"}: <strong>{bill.introduced_by.name}</strong>
                      <span className="pill" style={{ background: PARTIES[bill.introduced_by.party]?.color || "#e5e7eb", color: PARTIES[bill.introduced_by.party]?.textColor || "#000", marginLeft: 6, fontSize: 10 }}>{bill.introduced_by.party}</span>
                    </span>
                    <a href={bill.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#2563eb", textDecoration: "underline" }}>
                      📎 {lang === "nl" ? "Volledige tekst" : "Texte complet"} →
                    </a>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── BUDGET FLOW SECTION ──────────────────────────────────────────────────────

function BudgetFlowSection({ lang, t, local, commune, govs }) {
  const [expandedLevel, setExpandedLevel] = useState(null);

  const LEVEL_META = {
    federal: {
      icon: "🏛️", color: "#1a3a5c", textColor: "#fff",
      name: { nl: "Federale Overheid", fr: "Gouvernement Fédéral" },
      description: { nl: "Heft federale belastingen en verdeelt via dotaties naar de gewesten en gemeenschappen.", fr: "Perçoit les impôts fédéraux et distribue via dotations aux régions et communautés." }
    },
    flemish: {
      icon: "🦁", color: "#f5c518", textColor: "#000",
      name: { nl: "Vlaamse Overheid", fr: "Gouvernement Flamand" },
      description: { nl: "Ontvangt dotaties van federaal niveau. Belast eigen Vlaamse belastingen. Verdeelt via het Gemeentefonds naar provincies en gemeenten.", fr: "Reçoit dotations du fédéral. Lève ses propres impôts flamands. Distribue via le Fonds des Communes." }
    },
    walloon: {
      icon: "🐓", color: "#c0392b", textColor: "#fff",
      name: { nl: "Waals Gewest", fr: "Région Wallonne" },
      description: { nl: "Ontvangt dotaties van federaal. Verdeelt naar Waalse provincies via het Gemeentefonds.", fr: "Reçoit dotations du fédéral. Distribue vers provinces wallonnes via le Fonds des Communes." }
    },
    brussels_region: {
      icon: "🏙️", color: "#003f8a", textColor: "#fff",
      name: { nl: "Brussels Hoofdstedelijk Gewest", fr: "Région de Bruxelles-Capitale" },
      description: { nl: "Gecombineerd gewest/gemeente niveau. Ontvangt federale dotaties en eigen belastinginkomsten.", fr: "Niveau région/commune combiné. Reçoit dotations fédérales et propres recettes fiscales." }
    },
    province: {
      icon: "🗂️", color: "#6366f1", textColor: "#fff",
      name: local.province,
      description: { nl: "Intermediair bestuursniveau. Ontvangt opcentiemen en gewestdotaties. Financiert provinciale scholen, wegen en welzijn.", fr: "Niveau de gouvernement intermédiaire. Reçoit centimes additionnels et dotations régionales." }
    },
    commune: {
      icon: "🏘️", color: "#059669", textColor: "#fff",
      name: local.commune,
      description: { nl: "Jouw gemeente. Heft aanvullende personenbelasting en opcentiemen op de onroerende voorheffing bovenop de federale/gewestelijke belastingen.", fr: "Votre commune. Lève un impôt additionnel et des centimes additionnels sur le précompte immobilier." }
    },
  };

  const flow = local.budgetFlow;
  const maxBudget = flow[0].amount;

  return (
    <div style={{ marginBottom: 36 }}>
      {/* Section header */}
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1 }}>
          {lang === "nl" ? "Budget & machtsstroom" : "Flux budgétaire & de pouvoir"}
        </span>
        <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>
          {lang === "nl"
            ? `Hoe belastinggeld stroomt van federaal niveau naar ${commune.name}`
            : `Comment l'argent fiscal circule du niveau fédéral vers ${commune.name}`}
        </p>
      </div>

      <div style={{ background: "white", borderRadius: 16, border: "1.5px solid #e5e7eb", padding: 28 }}>

        {/* Flow diagram */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {flow.map((step, idx) => {
            const meta = LEVEL_META[step.level] || LEVEL_META.commune;
            const isLast = idx === flow.length - 1;
            const isExpanded = expandedLevel === step.level;
            const barWidth = Math.max(12, Math.round((step.amount / maxBudget) * 100));

            // Extra info for province and commune levels
            const isProvince = step.level === "province";
            const isCommune = step.level === "commune";

            return (
              <div key={step.level}>
                {/* Level block */}
                <div
                  onClick={() => setExpandedLevel(isExpanded ? null : step.level)}
                  style={{
                    display: "flex", alignItems: "stretch", gap: 16, cursor: "pointer",
                    padding: "14px 16px", borderRadius: 12, transition: "background 0.15s",
                    background: isExpanded ? meta.color + "10" : "transparent",
                    border: isExpanded ? `1.5px solid ${meta.color}40` : "1.5px solid transparent",
                  }}
                >
                  {/* Icon + color stripe */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, width: 44, flexShrink: 0 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: meta.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                      {meta.icon}
                    </div>
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{t(meta.name)}</div>
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>
                          {isProvince ? t(local.province) : isCommune ? t(local.commune) : ""}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                        <div style={{ fontWeight: 800, fontSize: 16, color: meta.color }}>{fmtB(step.amount)}</div>
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>{lang === "nl" ? "jaarbudget" : "budget annuel"}</div>
                      </div>
                    </div>

                    {/* Budget bar */}
                    <div style={{ height: 6, background: "#f3f4f6", borderRadius: 3, overflow: "hidden", marginBottom: 4 }}>
                      <div style={{ height: "100%", width: `${barWidth}%`, background: meta.color, borderRadius: 3, transition: "width 0.8s ease" }} />
                    </div>

                    {/* Coalition pills */}
                    {(isProvince || isCommune) && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                        {(isCommune ? local.communeCoalition : local.provinceCoalition).map(p => (
                          <span key={p} className="pill" style={{ background: PARTIES[p]?.color || "#e5e7eb", color: PARTIES[p]?.textColor || "#000", fontSize: 10 }}>{p}</span>
                        ))}
                        {isCommune && local.burgemeester && (
                          <span style={{ fontSize: 11, color: "#6b7280", display: "flex", alignItems: "center", gap: 4 }}>
                            👤 {local.burgemeester.name}
                            <span className="pill" style={{ background: PARTIES[local.burgemeester.party]?.color || "#e5e7eb", color: PARTIES[local.burgemeester.party]?.textColor || "#000", fontSize: 9 }}>{local.burgemeester.party}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: 14, color: "#9ca3af", display: "flex", alignItems: "center" }}>
                    {isExpanded ? "▲" : "▼"}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{ marginLeft: 60, marginBottom: 8, background: "#f8fafc", borderRadius: 10, padding: 14, border: `1px solid ${meta.color}30` }}>
                    <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, marginBottom: 10 }}>{t(meta.description)}</p>

                    {isCommune && (
                      <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: 10, fontSize: 12, color: "#92400e" }}>
                        💸 <strong>{lang === "nl" ? "Lokale belastingen in " : "Taxes locales à "}{commune.name}:</strong>&nbsp;
                        {lang === "nl" ? local.localTaxes.nl : local.localTaxes.fr}
                      </div>
                    )}

                    {isProvince && local.gouverneur && (
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                        👤 <strong>{lang === "nl" ? "Gouverneur" : "Gouverneur"}:</strong> {local.gouverneur.name}
                        {local.gouverneur.party && <span className="pill" style={{ background: PARTIES[local.gouverneur.party]?.color || "#e5e7eb", color: PARTIES[local.gouverneur.party]?.textColor || "#000", marginLeft: 6, fontSize: 9 }}>{local.gouverneur.party}</span>}
                      </div>
                    )}

                    {isProvince && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{lang === "nl" ? "Provinciale bevoegdheden" : "Compétences provinciales"}</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {t(local.provinceCompetences).map(c => (
                            <span key={c} style={{ fontSize: 11, background: "#e0e7ff", color: "#3730a3", padding: "2px 8px", borderRadius: 6 }}>{c}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {isCommune && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{lang === "nl" ? "Gemeentelijke bevoegdheden" : "Compétences communales"}</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {t(local.communeCompetences).map(c => (
                            <span key={c} style={{ fontSize: 11, background: "#d1fae5", color: "#065f46", padding: "2px 8px", borderRadius: 6 }}>{c}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Arrow connector between levels */}
                {!isLast && step.toNext && (
                  <div style={{ marginLeft: 22, display: "flex", alignItems: "center", gap: 8, padding: "4px 0 4px 22px" }}>
                    <div style={{ width: 2, height: 24, background: "#e5e7eb", borderRadius: 1, marginLeft: 0 }} />
                    <div style={{ fontSize: 11, color: "#9ca3af", background: "#f3f4f6", padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>
                      ↓ {fmtB(step.toNext)} {t(step.label)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Per-citizen breakdown */}
        <div style={{ marginTop: 20, padding: "16px 20px", background: "#f0fdf4", borderRadius: 12, border: "1px solid #bbf7d0" }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#065f46", marginBottom: 8 }}>
            💡 {lang === "nl" ? `Wat betekent dit per inwoner van ${commune.name}?` : `Qu'est-ce que cela signifie par habitant de ${commune.name}?`}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
            {flow.map(step => {
              const meta = LEVEL_META[step.level];
              const population = { beersel: 25800, brussels: 185000, gent: 265000, antwerp: 543000, liege: 197000, namur: 113000 };
              const pop = population[commune.id] || 50000;
              const perCapita = Math.round(step.amount / pop);
              return (
                <div key={step.level} style={{ background: "white", borderRadius: 8, padding: "10px 12px", border: `1px solid ${meta.color}30` }}>
                  <div style={{ fontSize: 10, color: meta.color, fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>{meta.icon} {t(meta.name).split(" ")[0]}</div>
                  <div style={{ fontWeight: 800, fontSize: 17, color: "#0f1923" }}>{fmt(perCapita)}</div>
                  <div style={{ fontSize: 10, color: "#9ca3af" }}>{lang === "nl" ? "per inwoner/jaar" : "par habitant/an"}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
