import { APP_NAME, PLANS } from "./config";
import { formatMAD, formatMonthLabel } from "./calculations";
import type { PlanDuration, WhatsAppLang } from "./types";

/**
 * Normalizes Moroccan phone numbers to E.164 digits without '+' (e.g. "06 12-34-56-78" -> "212612345678").
 */
export function normalizeMoroccoPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00212")) return digits.slice(2);
  if (digits.startsWith("212")) return digits;
  if (digits.startsWith("0") && digits.length >= 9) {
    return `212${digits.slice(1)}`;
  }
  return digits;
}

export function buildWhatsAppUrl(phone: string | null | undefined, message: string): string {
  const normalized = phone ? normalizeMoroccoPhone(phone) : "";
  const encoded = encodeURIComponent(message);
  if (!normalized) {
    return `https://wa.me/?text=${encoded}`;
  }
  return `https://wa.me/${normalized}?text=${encoded}`;
}

export function buildReceiptMessage(params: {
  lang: WhatsAppLang;
  buildingName: string;
  unitLabel: string;
  residentName: string;
  monthKey: string;
  amount: number;
  receiptNumber: string;
  receiptUrl: string;
}): string {
  const { lang, buildingName, unitLabel, residentName, monthKey, amount, receiptNumber, receiptUrl } =
    params;

  if (lang === "darija") {
    const monthLabel = formatMonthLabel(monthKey, "fr");
    return [
      `Salam ${residentName || unitLabel},`,
      `Tesselna l-cotisation dyal *${monthLabel}* l-*${buildingName}* (${unitLabel}) : *${formatMAD(amount, "fr")}*.`,
      `N° du reçu : *${receiptNumber}*`,
      `Chouf/telechargi l-reçu dyalek hna : ${receiptUrl}`,
      `Chokran bzaf !`,
    ].join("\n");
  }

  if (lang === "ar") {
    const monthLabel = formatMonthLabel(monthKey, "ar");
    return [
      `السلام عليكم ${residentName || unitLabel}،`,
      `نؤكد لكم توصلنا بمساهمة السانديك لشهر *${monthLabel}* لإقامة *${buildingName}* (${unitLabel}) بمبلغ *${formatMAD(amount, "ar")}*.`,
      `رقم الوصل: *${receiptNumber}*`,
      `رابط الوصل الرقمي: ${receiptUrl}`,
      `شكراً على تعاونكم.`,
    ].join("\n");
  }

  const monthLabel = formatMonthLabel(monthKey, "fr");
  return [
    `Bonjour ${residentName || unitLabel},`,
    `Nous confirmons la réception de votre cotisation syndic pour *${monthLabel}* (${buildingName} — ${unitLabel}) d'un montant de *${formatMAD(amount, "fr")}*.`,
    `Reçu N° : *${receiptNumber}*`,
    `Consulter / télécharger votre quittance : ${receiptUrl}`,
    `Merci pour votre ponctualité.`,
  ].join("\n");
}

export function buildReminderMessage(params: {
  lang: WhatsAppLang;
  buildingName: string;
  unitLabel: string;
  residentName: string;
  unpaidMonths: string[];
  totalOwed: number;
  rib: string;
  portalUrl: string;
}): string {
  const { lang, buildingName, unitLabel, residentName, unpaidMonths, totalOwed, rib, portalUrl } =
    params;

  if (lang === "darija") {
    const monthsList = unpaidMonths.map((m) => formatMonthLabel(m, "fr")).join(", ");
    const lines = [
      `Salam ${residentName || unitLabel}, netmennaw tkounou bikhir.`,
      `Tadkir b khoussous l-cotisation dyal *${buildingName}* (${unitLabel}).`,
      `Chhoura li mazal ma tkhelssouch (${unpaidMonths.length}) : ${monthsList}`,
      `Total : *${formatMAD(totalOwed, "fr")}*`,
    ];
    if (rib.trim()) lines.push(`RIB dyal l-immeuble : ${rib.trim()}`);
    lines.push(`Chouf l-hissabat w l-fawatyr dyal l-immeuble hna : ${portalUrl}`);
    lines.push(`Chokran 3la t-ta3awon dyalkom !`);
    return lines.join("\n");
  }

  if (lang === "ar") {
    const monthsList = unpaidMonths.map((m) => formatMonthLabel(m, "ar")).join("، ");
    const lines = [
      `السلام عليكم ${residentName || unitLabel}،`,
      `تذكير ودي بمساهمات السانديك الخاصة بإقامة *${buildingName}* (${unitLabel}).`,
      `الأشهر المستحقة (${unpaidMonths.length}): ${monthsList}`,
      `المبلغ الإجمالي: *${formatMAD(totalOwed, "ar")}*`,
    ];
    if (rib.trim()) lines.push(`رقم الحساب البنكي (RIB): ${rib.trim()}`);
    lines.push(`للاطلاع على حسابات وفواتير الإقامة بشفافية: ${portalUrl}`);
    lines.push(`شكراً لتفهمكم وتعاونكم.`);
    return lines.join("\n");
  }

  const monthsList = unpaidMonths.map((m) => formatMonthLabel(m, "fr")).join(", ");
  const lines = [
    `Bonjour ${residentName || unitLabel},`,
    `Petit rappel amical concernant les cotisations syndic de *${buildingName}* (${unitLabel}).`,
    `Mois en attente (${unpaidMonths.length}) : ${monthsList}`,
    `Total dû : *${formatMAD(totalOwed, "fr")}*`,
  ];
  if (rib.trim()) lines.push(`RIB de la copropriété : ${rib.trim()}`);
  lines.push(`Consulter les comptes et justificatifs de l'immeuble en ligne : ${portalUrl}`);
  lines.push(`Merci d'avance pour votre règlement.`);
  return lines.join("\n");
}

export function buildGroupTransparencyMessage(params: {
  lang: WhatsAppLang;
  buildingName: string;
  portalUrl: string;
  sharePin: string;
  currentBalance: number;
}): string {
  const { lang, buildingName, portalUrl, sharePin, currentBalance } = params;

  if (lang === "darija") {
    const lines = [
      `Salam jiran *${buildingName}* !`,
      `Daba t9edrou tchoufou l-hissabat dyal l-immeuble direct mn had l-lien (bla ma t-telechargiw ta application) :`,
      portalUrl,
    ];
    if (sharePin.trim()) lines.push(`Code PIN : *${sharePin.trim()}*`);
    lines.push(`Solde f sandou9 : *${formatMAD(currentBalance, "fr")}* — kolchi b l-fawatyr w tsawer.`);
    return lines.join("\n");
  }

  if (lang === "ar") {
    const lines = [
      `السلام عليكم جيران *${buildingName}*،`,
      `يمكنكم الآن الاطلاع على حسابات الإقامة، الوضعية الشهرية وصور الفواتير مباشرة عبر هذا الرابط (بدون تحميل أي تطبيق):`,
      portalUrl,
    ];
    if (sharePin.trim()) lines.push(`الرمز السري للدخول: *${sharePin.trim()}*`);
    lines.push(`رصيد الصندوق الحالي: *${formatMAD(currentBalance, "ar")}*`);
    return lines.join("\n");
  }

  const lines = [
    `Bonjour chers voisins de *${buildingName}*,`,
    `Voici le lien pour suivre les comptes de l'immeuble en toute transparence (solde, paiements à jour et photos de toutes les factures — sans application à installer) :`,
    portalUrl,
  ];
  if (sharePin.trim()) lines.push(`Code PIN : *${sharePin.trim()}*`);
  lines.push(`Solde actuel de la caisse : *${formatMAD(currentBalance, "fr")}*`);
  return lines.join("\n");
}

export function buildNeighborPitchMessage(params: {
  lang: WhatsAppLang;
  buildingName: string;
  activeUnits: number;
}): string {
  const { lang, buildingName, activeUnits } = params;
  const units = Math.max(1, activeUnits);
  const perAptMonth = Math.max(1, Math.round(PLANS.annual.priceMAD / 12 / units));

  if (lang === "darija") {
    return [
      `Salam jiran *${buildingName}*،`,
      `Bach n-tfaadaou l-machakil dyal l-wra9 w l-hisabat, bghina n-khedmou b *${APP_NAME}* bach kolchi ychouf l-fawatyr w l-cotisations f ay we9t.`,
      `Taman dyalou *1 200 DH f l-3am* mn sandou9 l-immeuble (ya3ni ghir *~${perAptMonth} DH l-chher l-kol dar*).`,
      `Kol wahed ghadi yewsslou reçu PDF f WhatsApp w lien dyal ch-chafafiya.`,
    ].join("\n");
  }

  if (lang === "ar") {
    return [
      `السلام عليكم جيران *${buildingName}*،`,
      `لتفادي أي سوء فهم في الحسابات، نقترح اعتماد منصة *${APP_NAME}* لتوثيق الأداءات وصور الفواتير بشفافية.`,
      `التكلفة هي *1,200 درهم في السنة* من صندوق العمارة (حوالي *${perAptMonth} درهم فقط للشقة شهرياً*).`,
      `كل ساكن سيتوصل بوصل PDF عبر واتساب ورابط لمراقبة المصاريف في أي وقت.`,
    ].join("\n");
  }

  return [
    `Bonjour chers copropriétaires de *${buildingName}*,`,
    `Pour garantir une transparence totale sur nos comptes, nous proposons d'utiliser *${APP_NAME}* (reçus PDF WhatsApp + photos de toutes les factures en ligne).`,
    `Le coût est de *1 200 MAD/an* pris sur la caisse commune, soit seulement *~${perAptMonth} MAD par appartement et par mois*.`,
  ].join("\n");
}

export function buildReportSummaryMessage(params: {
  lang: WhatsAppLang;
  buildingName: string;
  periodLabel: string;
  totalCollected: number;
  totalExpenses: number;
  closingBalance: number;
  portalUrl: string;
}): string {
  const { lang, buildingName, periodLabel, totalCollected, totalExpenses, closingBalance, portalUrl } =
    params;

  if (lang === "ar") {
    return [
      `*التقرير المالي — ${buildingName}* (${periodLabel})`,
      `• المداخيل: ${formatMAD(totalCollected, "ar")}`,
      `• المصاريف: ${formatMAD(totalExpenses, "ar")}`,
      `• الرصيد الحالي بالصندوق: *${formatMAD(closingBalance, "ar")}*`,
      `التفاصيل والفواتير: ${portalUrl}`,
    ].join("\n");
  }

  return [
    `*Bilan financier — ${buildingName}* (${periodLabel})`,
    `• Encaissements : ${formatMAD(totalCollected, "fr")}`,
    `• Dépenses : ${formatMAD(totalExpenses, "fr")}`,
    `• Solde en caisse : *${formatMAD(closingBalance, "fr")}*`,
    `Détails et justificatifs : ${portalUrl}`,
  ].join("\n");
}

export function buildUpgradeConfirmationMessage(params: {
  buildingName: string;
  referenceCode: string;
  plan: PlanDuration;
  channel: "virement" | "cashplus";
  note?: string;
}): string {
  const planInfo = PLANS[params.plan];
  const lines = [
    `Bonjour l'équipe *${APP_NAME}*,`,
    `Je viens d'effectuer le règlement pour activer notre immeuble :`,
    `• Immeuble : *${params.buildingName}*`,
    `• Référence : *${params.referenceCode}*`,
    `• Formule : *${planInfo.labelFr} — ${planInfo.priceMAD} MAD*`,
    `• Canal : *${params.channel === "virement" ? "Virement bancaire" : "CashPlus / Wafacash"}*`,
  ];
  if (params.note?.trim()) {
    lines.push(`• Note : ${params.note.trim()}`);
  }
  lines.push(`Merci d'activer notre compte ! (Ci-joint le reçu)`);
  return lines.join("\n");
}
