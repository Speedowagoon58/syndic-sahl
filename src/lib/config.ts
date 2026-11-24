/**
 * Centralized configuration for SyndicSahl.
 * Edit this file to customize your brand name, pricing, and Moroccan payout details.
 */

export const APP_NAME = "SyndicSahl";
export const APP_NAME_AR = "سانديك ساهل";
export const APP_TAGLINE_FR = "Gestion transparente de copropriété au Maroc";
export const APP_TAGLINE_AR = "تسيير شفاف ومبسط لاتحاد الملاك بالمغرب";

export const FREE_LOT_LIMIT = 0;
export const TRIAL_DAYS = 30;

export const PLANS = {
  semi_annual: {
    id: "semi_annual" as const,
    months: 6,
    priceMAD: 700,
    labelFr: "Semestriel (6 mois)",
    labelAr: "نصف سنوي (6 أشهر)",
  },
  annual: {
    id: "annual" as const,
    months: 12,
    priceMAD: 1200,
    labelFr: "Annuel (12 mois)",
    labelAr: "سنوي (12 شهراً)",
  },
};

// TODO: Replace these placeholder details with your real Moroccan bank / CashPlus / WhatsApp details before launching publicly.
export const FOUNDER_BANK_NAME = "CIH Bank (Exemple — à remplacer)";
export const FOUNDER_ACCOUNT_HOLDER = "SyndicSahl / Nom du Fondateur";
export const FOUNDER_RIB = "230 780 0000000000000000 00";
export const FOUNDER_CASHPLUS_NAME = "Nom & Prénom du Fondateur (CIN à configurer)";
export const FOUNDER_WHATSAPP = "212600000000";

export const STORAGE_KEY = "syndicsahl_data_v1";
