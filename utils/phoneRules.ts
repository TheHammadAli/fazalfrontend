import { Metadata, isValidPhoneNumber } from "libphonenumber-js/core";
import metadata from "libphonenumber-js/metadata.mobile.json";

/**
 * How many digits a phone number may have after its dial code, per country.
 *
 * The country picker offers 254 entries whose national numbers range from 5 to
 * 15 digits, so a single fixed length would be wrong almost everywhere. These
 * come from libphonenumber's own metadata instead.
 *
 * `metadata.mobile.json` rather than the default (min) bundle: min carries no
 * per-type data, so it can only say a Pakistani number is 8-12 digits — the
 * range that includes landlines and short codes. The mobile bundle knows a PK
 * mobile is exactly 10. It costs ~15KB more than the min metadata already
 * pulled in by `libphonenumber-js`, and only on the pages that import this.
 *
 * The trade-off that buys: landline numbers are rejected. That is intended —
 * this number receives OTPs and is the WhatsApp contact shown on listings.
 */

/** E.164 caps a national number at 15 digits; used where a country has no mobile data. */
const E164_MAX_NATIONAL_DIGITS = 15;

const metadataStore = new Metadata(metadata as any);

/**
 * `NumberingPlan.type()` is real and is what carries the per-type lengths, but
 * libphonenumber-js does not declare it on the public NumberingPlan type. This
 * is the shape actually used here.
 */
type NumberingPlanWithTypes = {
  type(name: "MOBILE"): { possibleLengths(): number[] } | undefined;
};

export type PhoneLengthRule = {
  min: number;
  max: number;
  /** All the exact lengths this country allows, ascending. Empty when unknown. */
  allowed: number[];
  /** False when libphonenumber has no mobile data for this country (6 of 254). */
  known: boolean;
};

const UNKNOWN_RULE: PhoneLengthRule = {
  min: 1,
  max: E164_MAX_NATIONAL_DIGITS,
  allowed: [],
  known: false,
};

/**
 * Digit lengths valid for a country's mobile numbers.
 *
 * @param countryIso two-letter ISO code, e.g. "PK"
 */
export function getPhoneLengthRule(countryIso?: string | null): PhoneLengthRule {
  if (!countryIso) return UNKNOWN_RULE;

  try {
    metadataStore.selectNumberingPlan(countryIso.toUpperCase() as any);
  } catch {
    // selectNumberingPlan throws on a country the metadata doesn't carry.
    return UNKNOWN_RULE;
  }

  const plan = metadataStore.numberingPlan as unknown as
    | NumberingPlanWithTypes
    | undefined;
  const lengths = plan?.type("MOBILE")?.possibleLengths();
  if (!lengths?.length) return UNKNOWN_RULE;

  const allowed = [...lengths].sort((a, b) => a - b);
  return {
    min: allowed[0],
    max: allowed[allowed.length - 1],
    allowed,
    known: true,
  };
}

/** Strips everything that is not a digit and cuts the result to the country's maximum. */
export function clampNationalDigits(input: string, rule: PhoneLengthRule): string {
  return input.replace(/\D/g, "").slice(0, rule.max);
}

/** True once the digits form a real mobile number for that dial code. */
export function isCompleteMobileNumber(dialCode: string, nationalDigits: string): boolean {
  if (!dialCode || !nationalDigits) return false;
  return isValidPhoneNumber(`${dialCode}${nationalDigits}`, metadata as any);
}

/**
 * "10 digits", "9 or 10 digits", "9-12 digits" — what to tell the user to type.
 * Returns null when the country has no mobile data to describe.
 */
export function describeExpectedLength(rule: PhoneLengthRule): string | null {
  if (!rule.known) return null;
  if (rule.allowed.length === 1) return `${rule.min} digits`;
  if (rule.allowed.length === 2) return `${rule.allowed[0]} or ${rule.allowed[1]} digits`;
  return `${rule.min}-${rule.max} digits`;
}
