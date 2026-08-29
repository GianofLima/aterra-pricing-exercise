import type { LineItem, Quote, SectionName } from "./types";

export const MIN_MARKUP_PCT = 10;

export type CalculatedLine = {
  line: LineItem;
  effectiveNett: number | null;
  estimated: boolean;
  vatAmount: number | null;
  costWithVat: number | null;
  dmcReceives: number | null;
  clientPays: number | null;
  grossProfit: number | null;
  grossProfitPct: number | null;
  effectiveMrkpPct: number;
  isMarkupClamped: boolean;
  missingPrice: boolean;
};

export type PricingTotals = {
  nett: number;
  vatAmount: number;
  costWithVat: number;
  dmcReceives: number;
  clientPays: number;
  grossProfit: number;
  grossProfitPct: number;
  missingPrices: number;
};

export type SectionSummary = PricingTotals & {
  section: SectionName;
  lines: CalculatedLine[];
};

export type QuotePricing = PricingTotals & {
  sections: SectionSummary[];
  overBudgetBy: number;
  underBudgetBy: number;
  budgetStatus: "under" | "over" | "at";
};

const SECTIONS: SectionName[] = ["ACCOMMODATION", "TRANSPORT", "ACTIVITIES"];

function moneyToCents(value: number): number {
  return Math.round(value * 100);
}

function centsToMoney(value: number): number {
  return value / 100;
}

function pctToRate(pct: number): number {
  return pct / 100;
}

function roundMoney(value: number): number {
  return centsToMoney(Math.round(value * 100));
}

function totalFromLines(lines: CalculatedLine[]): PricingTotals {
  const totals = lines.reduce(
    (acc, item) => {
      acc.nett += moneyToCents(item.effectiveNett ?? 0);
      acc.vatAmount += moneyToCents(item.vatAmount ?? 0);
      acc.costWithVat += moneyToCents(item.costWithVat ?? 0);
      acc.dmcReceives += moneyToCents(item.dmcReceives ?? 0);
      acc.clientPays += moneyToCents(item.clientPays ?? 0);
      acc.grossProfit += moneyToCents(item.grossProfit ?? 0);
      acc.missingPrices += item.missingPrice ? 1 : 0;
      return acc;
    },
    { nett: 0, vatAmount: 0, costWithVat: 0, dmcReceives: 0, clientPays: 0, grossProfit: 0, missingPrices: 0 }
  );
  const dmcReceives = centsToMoney(totals.dmcReceives);
  const grossProfit = centsToMoney(totals.grossProfit);

  return {
    nett: centsToMoney(totals.nett),
    vatAmount: centsToMoney(totals.vatAmount),
    costWithVat: centsToMoney(totals.costWithVat),
    dmcReceives,
    clientPays: centsToMoney(totals.clientPays),
    grossProfit,
    grossProfitPct: dmcReceives === 0 ? 0 : grossProfit / dmcReceives,
    missingPrices: totals.missingPrices,
  };
}

export function calculateLine(line: LineItem, estimatedNett?: number): CalculatedLine {
  const effectiveNett = line.nett ?? estimatedNett ?? null;
  const missingPrice = effectiveNett === null;
  const effectiveMrkpPct = Math.max(line.mrkpPct, MIN_MARKUP_PCT);

  if (missingPrice) {
    return {
      line,
      effectiveNett,
      estimated: line.nett === null && estimatedNett !== undefined,
      vatAmount: null,
      costWithVat: null,
      dmcReceives: null,
      clientPays: null,
      grossProfit: null,
      grossProfitPct: null,
      effectiveMrkpPct,
      isMarkupClamped: effectiveMrkpPct !== line.mrkpPct,
      missingPrice,
    };
  }

  const costWithVat = roundMoney(effectiveNett * (1 + pctToRate(line.vatPct)));
  const vatAmount = roundMoney(costWithVat - effectiveNett);
  const dmcReceives = roundMoney(costWithVat * (1 + pctToRate(effectiveMrkpPct)));
  const clientPays = roundMoney(dmcReceives / (1 - pctToRate(line.commPct)));
  const grossProfit = roundMoney(dmcReceives - costWithVat);

  return {
    line,
    effectiveNett,
    estimated: line.nett === null && estimatedNett !== undefined,
    vatAmount,
    costWithVat,
    dmcReceives,
    clientPays,
    grossProfit,
    grossProfitPct: dmcReceives === 0 ? 0 : grossProfit / dmcReceives,
    effectiveMrkpPct,
    isMarkupClamped: effectiveMrkpPct !== line.mrkpPct,
    missingPrice,
  };
}

export function calculateQuote(quote: Quote, estimatedNetts: Record<string, number> = {}): QuotePricing {
  const sections = SECTIONS.map((section) => {
    const lines = quote.lines
      .filter((line) => line.section === section)
      .map((line) => calculateLine(line, estimatedNetts[line.id]));
    return { section, lines, ...totalFromLines(lines) };
  }).filter((section) => section.lines.length > 0);

  const totals = totalFromLines(sections.flatMap((section) => section.lines));
  const variance = roundMoney(quote.clientCeiling - totals.clientPays);

  return {
    ...totals,
    sections,
    underBudgetBy: Math.max(variance, 0),
    overBudgetBy: Math.max(-variance, 0),
    budgetStatus: variance > 0 ? "under" : variance < 0 ? "over" : "at",
  };
}
