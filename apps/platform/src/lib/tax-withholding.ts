/**
 * Federal tax withholding calculations for W-2 employees.
 * Kentucky has no state income tax.
 *
 * Uses 2025 IRS tax brackets (simplified for semi-monthly payroll).
 * This is an estimate — actual withholding depends on the employee's W-4.
 */

export type FilingStatus = "single" | "married_filing_jointly" | "head_of_household";
export type PayFrequency = "semimonthly" | "weekly" | "biweekly" | "monthly";

// 2025 Federal tax brackets (annual amounts)
const FEDERAL_BRACKETS: Record<FilingStatus, { upTo: number; rate: number }[]> = {
  single: [
    { upTo: 11925, rate: 0.10 },
    { upTo: 48475, rate: 0.12 },
    { upTo: 103350, rate: 0.22 },
    { upTo: 197300, rate: 0.24 },
    { upTo: 250525, rate: 0.32 },
    { upTo: 626350, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
  married_filing_jointly: [
    { upTo: 23850, rate: 0.10 },
    { upTo: 96950, rate: 0.12 },
    { upTo: 206700, rate: 0.22 },
    { upTo: 394600, rate: 0.24 },
    { upTo: 501050, rate: 0.32 },
    { upTo: 751600, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
  head_of_household: [
    { upTo: 17000, rate: 0.10 },
    { upTo: 64850, rate: 0.12 },
    { upTo: 103350, rate: 0.22 },
    { upTo: 197300, rate: 0.24 },
    { upTo: 250500, rate: 0.32 },
    { upTo: 626350, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
};

// Standard deduction amounts (annual)
const STANDARD_DEDUCTION: Record<FilingStatus, number> = {
  single: 15000,
  married_filing_jointly: 30000,
  head_of_household: 22500,
};

// FICA rates (2025)
const SOCIAL_SECURITY_RATE = 0.062;
const SOCIAL_SECURITY_WAGE_BASE = 176100; // 2025 limit
const MEDICARE_RATE = 0.0145;
const ADDITIONAL_MEDICARE_RATE = 0.009; // Over $200K single / $250K married
const ADDITIONAL_MEDICARE_THRESHOLD: Record<FilingStatus, number> = {
  single: 200000,
  married_filing_jointly: 250000,
  head_of_household: 200000,
};

// Pay periods per year
const PAY_PERIODS: Record<PayFrequency, number> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
};

/**
 * Calculate federal income tax withholding for a single pay period.
 */
export function calculateFederalWithholding(
  grossPay: number,
  filingStatus: FilingStatus = "single",
  allowances: number = 0,
  payFrequency: PayFrequency = "semimonthly"
): number {
  const periods = PAY_PERIODS[payFrequency];
  const annualizedGross = grossPay * periods;

  // Subtract standard deduction and allowance deduction ($4,700 per allowance in 2025)
  const allowanceDeduction = allowances * 4700;
  const taxableIncome = Math.max(annualizedGross - STANDARD_DEDUCTION[filingStatus] - allowanceDeduction, 0);

  // Calculate annual tax using brackets
  const brackets = FEDERAL_BRACKETS[filingStatus];
  let annualTax = 0;
  let remaining = taxableIncome;
  let prevLimit = 0;

  for (const bracket of brackets) {
    const bracketIncome = Math.min(remaining, bracket.upTo - prevLimit);
    if (bracketIncome <= 0) break;
    annualTax += bracketIncome * bracket.rate;
    remaining -= bracketIncome;
    prevLimit = bracket.upTo;
  }

  // Per-period withholding
  return Math.round((annualTax / periods) * 100) / 100;
}

/**
 * Calculate Social Security tax for a single pay period.
 */
export function calculateSocialSecurity(
  grossPay: number,
  ytdGross: number = 0
): number {
  const remainingWageBase = Math.max(SOCIAL_SECURITY_WAGE_BASE - ytdGross, 0);
  const taxableAmount = Math.min(grossPay, remainingWageBase);
  return Math.round(taxableAmount * SOCIAL_SECURITY_RATE * 100) / 100;
}

/**
 * Calculate Medicare tax for a single pay period.
 */
export function calculateMedicare(
  grossPay: number,
  ytdGross: number = 0,
  filingStatus: FilingStatus = "single"
): number {
  const baseMedicare = grossPay * MEDICARE_RATE;
  const threshold = ADDITIONAL_MEDICARE_THRESHOLD[filingStatus];
  const additionalMedicare =
    ytdGross + grossPay > threshold
      ? Math.max(0, Math.min(grossPay, ytdGross + grossPay - threshold)) * ADDITIONAL_MEDICARE_RATE
      : 0;
  return Math.round((baseMedicare + additionalMedicare) * 100) / 100;
}

export type TaxWithholdingResult = {
  federalWithholding: number;
  socialSecurity: number;
  medicare: number;
  totalTaxWithholding: number;
  taxClassification: "W2" | "1099";
};

/**
 * Calculate all tax withholdings for a pay period.
 * Returns zero for 1099 contractors.
 */
export function calculateTaxWithholding(opts: {
  grossPay: number;
  taxClassification: "W2" | "1099";
  filingStatus?: FilingStatus;
  allowances?: number;
  ytdGross?: number;
  payFrequency?: PayFrequency;
}): TaxWithholdingResult {
  if (opts.taxClassification === "1099") {
    return {
      federalWithholding: 0,
      socialSecurity: 0,
      medicare: 0,
      totalTaxWithholding: 0,
      taxClassification: "1099",
    };
  }

  const federalWithholding = calculateFederalWithholding(
    opts.grossPay,
    opts.filingStatus ?? "single",
    opts.allowances ?? 0,
    opts.payFrequency ?? "semimonthly"
  );
  const socialSecurity = calculateSocialSecurity(opts.grossPay, opts.ytdGross ?? 0);
  const medicare = calculateMedicare(opts.grossPay, opts.ytdGross ?? 0, opts.filingStatus ?? "single");
  const totalTaxWithholding = Math.round((federalWithholding + socialSecurity + medicare) * 100) / 100;

  return {
    federalWithholding,
    socialSecurity,
    medicare,
    totalTaxWithholding,
    taxClassification: "W2",
  };
}
