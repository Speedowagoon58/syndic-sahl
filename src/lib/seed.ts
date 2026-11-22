import { getCurrentMonthKey, shiftMonthKey } from "./calculations";
import type {
  Apartment,
  AppData,
  Building,
  Expense,
  Payment,
  SubscriptionRequest,
} from "./types";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function createDemoReceiptSvg(params: {
  vendor: string;
  title: string;
  amount: string;
  date: string;
  ref: string;
}): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="360" viewBox="0 0 520 360">
    <rect width="520" height="360" fill="#F8FAFC"/>
    <rect x="24" y="20" width="472" height="320" rx="14" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2"/>
    <rect x="24" y="20" width="472" height="62" rx="14" fill="#0F766E"/>
    <rect x="24" y="64" width="472" height="18" fill="#0F766E"/>
    <text x="46" y="58" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#FFFFFF">${escapeXml(params.vendor)}</text>
    <text x="474" y="57" text-anchor="end" font-family="monospace" font-size="13" fill="#CCFBF1">${escapeXml(params.ref)}</text>
    <text x="46" y="122" font-family="Arial, sans-serif" font-size="15" font-weight="bold" fill="#0F172A">${escapeXml(params.title)}</text>
    <text x="46" y="150" font-family="Arial, sans-serif" font-size="13" fill="#64748B">Date : ${escapeXml(params.date)}</text>
    <line x1="46" y1="172" x2="474" y2="172" stroke="#E2E8F0" stroke-dasharray="6 4" stroke-width="2"/>
    <text x="46" y="212" font-family="Arial, sans-serif" font-size="14" fill="#475569">Montant réglé TTC</text>
    <text x="474" y="216" text-anchor="end" font-family="Arial, sans-serif" font-size="26" font-weight="bold" fill="#0F766E">${escapeXml(params.amount)}</text>
    <rect x="46" y="252" width="170" height="44" rx="8" fill="#ECFDF5" stroke="#10B981" stroke-width="1.5"/>
    <text x="131" y="279" text-anchor="end" dx="48" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#047857">PAYÉ / ACQUITTÉ</text>
    <text x="474" y="316" text-anchor="end" font-family="Arial, sans-serif" font-size="11" fill="#94A3B8">Justificatif SyndicSahl — Maroc</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function createSeedData(now: Date = new Date()): AppData {
  const m0 = getCurrentMonthKey(now);
  const m1 = shiftMonthKey(m0, -1);
  const m2 = shiftMonthKey(m0, -2);

  const trialEnds = new Date(now.getTime() + 24 * 24 * 60 * 60 * 1000).toISOString();
  const created = new Date(now.getTime() - 65 * 24 * 60 * 60 * 1000).toISOString();

  const b1Id = "bld-atlas-casa";
  const b2Id = "bld-majorelle-kech";

  const buildings: Building[] = [
    {
      id: b1Id,
      name: "Résidence Atlas",
      city: "Casablanca — Maârif",
      defaultMonthlyFee: 250,
      openingBalance: 6400,
      startMonth: m2,
      rib: "230 780 1245896321458700 42",
      shareSlug: "residence-atlas",
      sharePin: "",
      showNamesPublicly: false,
      planStatus: "trial",
      trialEndsAt: trialEnds,
      planExpiresAt: null,
      createdAt: created,
    },
    {
      id: b2Id,
      name: "Immeuble Majorelle",
      city: "Marrakech — Guéliz",
      defaultMonthlyFee: 180,
      openingBalance: 2900,
      startMonth: m1,
      rib: "007 450 0009182736451200 18",
      shareSlug: "immeuble-majorelle",
      sharePin: "1234",
      showNamesPublicly: true,
      planStatus: "trial",
      trialEndsAt: trialEnds,
      planExpiresAt: null,
      createdAt: created,
    },
  ];

  const atlasResidents: {
    label: string;
    name: string;
    phone: string;
    fee: number;
    cycle?: Apartment["billingCycle"];
  }[] = [
    { label: "Apt 1", name: "M. Karim Benali", phone: "0661234501", fee: 250 },
    { label: "Apt 2", name: "Mme Nadia El Fassi", phone: "0661234502", fee: 250 },
    { label: "Apt 3", name: "M. Youssef Tazi", phone: "0662345603", fee: 250, cycle: "quarterly" },
    { label: "Apt 4", name: "M. Rachid Berrada", phone: "0663456704", fee: 250 },
    { label: "Apt 5", name: "Mme Salma Chraïbi", phone: "0664567805", fee: 250 },
    { label: "Apt 6", name: "M. Omar Kettani", phone: "0665678906", fee: 250 },
    { label: "Apt 7", name: "M. Mehdi Lahlou", phone: "0666789007", fee: 250 },
    { label: "Apt 8", name: "Mme Houda Alaoui", phone: "0667890108", fee: 250 },
    { label: "Apt 9", name: "M. Tariq Bennani", phone: "0668901209", fee: 250 },
    { label: "Apt 10", name: "Mme Imane Sefrioui", phone: "0669012310", fee: 250 },
    { label: "Apt 11", name: "M. Hamza Ouazzani", phone: "0670123411", fee: 250 },
    { label: "Magasin RDC", name: "Pharmacie Al Amal", phone: "0661987612", fee: 400, cycle: "annual" },
  ];

  const majorelleResidents = [
    { label: "Apt 1", name: "M. Samir Mansouri", phone: "0661112201", fee: 180 },
    { label: "Apt 2", name: "Mme Leila Idrissi", phone: "0661112202", fee: 180 },
    { label: "Apt 3", name: "M. Adil Filali", phone: "0661112203", fee: 180 },
    { label: "Apt 4", name: "Mme Zineb Zniber", phone: "0661112204", fee: 180 },
    { label: "Apt 5", name: "M. Driss Skalli", phone: "0661112205", fee: 180 },
    { label: "Apt 6", name: "Mme Kenza Touimi", phone: "0661112206", fee: 180 },
  ];

  const apartments: Apartment[] = [
    ...atlasResidents.map((r, idx) => ({
      id: `apt-atlas-${idx + 1}`,
      buildingId: b1Id,
      unitLabel: r.label,
      residentName: r.name,
      phone: r.phone,
      monthlyFee: r.fee,
      billingCycle: r.cycle ?? "monthly",
      active: true,
      sortOrder: idx + 1,
    })),
    ...majorelleResidents.map((r, idx) => ({
      id: `apt-maj-${idx + 1}`,
      buildingId: b2Id,
      unitLabel: r.label,
      residentName: r.name,
      phone: r.phone,
      monthlyFee: r.fee,
      billingCycle: "monthly" as const,
      active: true,
      sortOrder: idx + 1,
    })),
  ];

  const payments: Payment[] = [];
  let seq = 1;
  const yearPrefix = m0.slice(0, 4);

  const pushPayment = (
    buildingId: string,
    apartmentId: string,
    monthKey: string,
    amount: number,
    method: Payment["method"],
    dayOffset: number,
    note: string
  ) => {
    const receiptNumber = `REC-${yearPrefix}-${String(seq).padStart(4, "0")}`;
    seq += 1;
    payments.push({
      id: `pay-${seq}`,
      buildingId,
      apartmentId,
      monthKey,
      amount,
      method,
      receiptNumber,
      note,
      paidAt: `${monthKey}-${String(Math.min(28, Math.max(2, dayOffset))).padStart(2, "0")}T10:30:00.000Z`,
    });
  };

  // Atlas: realistic collection across m2, m1, m0
  // Apt 7 & 11 unpaid all 3 months; Apt 4 unpaid m1 & m0; Apt 9 unpaid m0
  atlasResidents.forEach((r, idx) => {
    const aptId = `apt-atlas-${idx + 1}`;
    const method: Payment["method"] = idx % 3 === 0 ? "virement" : "cash";
    if (idx !== 6 && idx !== 10) {
      pushPayment(b1Id, aptId, m2, r.fee, method, 4 + idx, "");
    }
    if (idx !== 3 && idx !== 6 && idx !== 10) {
      pushPayment(b1Id, aptId, m1, r.fee, method, 5 + idx, "");
    }
    if (idx !== 3 && idx !== 6 && idx !== 8 && idx !== 10) {
      pushPayment(
        b1Id,
        aptId,
        m0,
        r.fee,
        idx === 11 ? "cheque" : method,
        3 + idx,
        idx === 11 ? "Chèque remis au syndic" : ""
      );
    }
  });

  // Majorelle: 5 of 6 paid in m1 & m0
  majorelleResidents.forEach((r, idx) => {
    const aptId = `apt-maj-${idx + 1}`;
    if (idx !== 4) {
      pushPayment(b2Id, aptId, m1, r.fee, "cash", 6 + idx, "");
    }
    if (idx !== 2 && idx !== 4) {
      pushPayment(b2Id, aptId, m0, r.fee, idx % 2 === 0 ? "virement" : "cash", 4 + idx, "");
    }
  });

  const expenses: Expense[] = [
    {
      id: "exp-1",
      buildingId: b1Id,
      category: "gardiennage",
      amount: 1800,
      expenseDate: `${m0}-02`,
      description: "Salaire gardien — M. Ahmed",
      receiptPhotoUrl: createDemoReceiptSvg({
        vendor: "Reçu Salaire Gardien",
        title: "Indemnité mensuelle — M. Ahmed",
        amount: "1 800 MAD",
        date: `${m0}-02`,
        ref: "GARD-01",
      }),
      createdAt: `${m0}-02T09:00:00.000Z`,
    },
    {
      id: "exp-2",
      buildingId: b1Id,
      category: "eau_electricite",
      amount: 485,
      expenseDate: `${m0}-06`,
      description: "Facture Lydec — Eau & Électricité parties communes",
      receiptPhotoUrl: createDemoReceiptSvg({
        vendor: "LYDEC Casablanca",
        title: "Électricité & Eau Communs",
        amount: "485 MAD",
        date: `${m0}-06`,
        ref: "LYD-88421",
      }),
      createdAt: `${m0}-06T14:15:00.000Z`,
    },
    {
      id: "exp-3",
      buildingId: b1Id,
      category: "ascenseur",
      amount: 650,
      expenseDate: `${m1}-14`,
      description: "Contrat maintenance mensuelle ascenseur",
      receiptPhotoUrl: createDemoReceiptSvg({
        vendor: "Maghreb Elevators SARL",
        title: "Visite préventive mensuelle",
        amount: "650 MAD",
        date: `${m1}-14`,
        ref: "FAC-2026-19",
      }),
      createdAt: `${m1}-14T11:20:00.000Z`,
    },
    {
      id: "exp-4",
      buildingId: b1Id,
      category: "nettoyage",
      amount: 320,
      expenseDate: `${m1}-18`,
      description: "Produits d'entretien & nettoyage escaliers",
      receiptPhotoUrl: createDemoReceiptSvg({
        vendor: "Droguerie Al Maârif",
        title: "Javel, détergent sol, balais",
        amount: "320 MAD",
        date: `${m1}-18`,
        ref: "TICKET-409",
      }),
      createdAt: `${m1}-18T16:40:00.000Z`,
    },
    {
      id: "exp-5",
      buildingId: b1Id,
      category: "reparation",
      amount: 290,
      expenseDate: `${m2}-22`,
      description: "Remplacement ampoules LED & serrure porte hall",
      receiptPhotoUrl: createDemoReceiptSvg({
        vendor: "Électricité & Quincaillerie",
        title: "6 LED + cylindre porte entrée",
        amount: "290 MAD",
        date: `${m2}-22`,
        ref: "BON-712",
      }),
      createdAt: `${m2}-22T17:10:00.000Z`,
    },
    {
      id: "exp-6",
      buildingId: b2Id,
      category: "eau_electricite",
      amount: 240,
      expenseDate: `${m0}-05`,
      description: "Facture RADEEMA — Minuterie & cour",
      receiptPhotoUrl: createDemoReceiptSvg({
        vendor: "RADEEMA Marrakech",
        title: "Éclairage parties communes",
        amount: "240 MAD",
        date: `${m0}-05`,
        ref: "RAD-5530",
      }),
      createdAt: `${m0}-05T10:00:00.000Z`,
    },
    {
      id: "exp-7",
      buildingId: b2Id,
      category: "nettoyage",
      amount: 350,
      expenseDate: `${m1}-20`,
      description: "Nettoyage hebdomadaire escaliers & terrasse",
      receiptPhotoUrl: null,
      createdAt: `${m1}-20T12:00:00.000Z`,
    },
  ];

  const subscriptionRequests: SubscriptionRequest[] = [
    {
      id: "subreq-demo-1",
      buildingId: b1Id,
      buildingName: "Résidence Atlas",
      referenceCode: "SYN-SCASA",
      plan: "annual",
      amountMAD: 1200,
      channel: "virement",
      proofPhotoUrl: createDemoReceiptSvg({
        vendor: "CIH Mobile — Virement",
        title: "Réf: SYN-SCASA (Résidence Atlas)",
        amount: "1 200 MAD",
        date: `${m0}-08`,
        ref: "VIR-90234",
      }),
      note: "Exemple de demande en attente de validation dans /admin",
      status: "pending",
      createdAt: `${m0}-08T15:00:00.000Z`,
    },
  ];

  return {
    locale: "fr",
    theme: "light",
    whatsappLang: "darija",
    activeBuildingId: b1Id,
    buildings,
    apartments,
    payments,
    expenses,
    subscriptionRequests,
  };
}
