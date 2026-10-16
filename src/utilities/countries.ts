// ISO 3166-1 alpha-2 country codes. Names come from the browser/server's own
// country-name list (Intl.DisplayNames), so they need no translation table.
export const COUNTRY_CODES = `AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ
CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR
GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP
KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT
MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW
SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG
UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW`.split(/\s+/)

const CODES = new Set(COUNTRY_CODES)

export const isCountryCode = (value: unknown): value is string => typeof value === 'string' && CODES.has(value)

let names: Intl.DisplayNames | null = null
export function countryName(code: string | null | undefined): string {
  if (!code) return ''
  try {
    names ??= new Intl.DisplayNames(['en'], { type: 'region' })
    return names.of(code) || code
  } catch {
    return code
  }
}

// All countries sorted by name, for dropdowns.
export const countryOptions = () =>
  COUNTRY_CODES.map((code) => ({ code, name: countryName(code) })).sort((a, b) => a.name.localeCompare(b.name))

// Where a request comes from, as Vercel reports it (approximate, from the
// internet connection - no GPS). Empty when running locally.
export function locationFromHeaders(headers: Headers | undefined | null): { country: string | null; city: string | null } {
  const country = headers?.get('x-vercel-ip-country')?.toUpperCase() || null
  let city = headers?.get('x-vercel-ip-city') || null
  if (city) {
    try {
      city = decodeURIComponent(city)
    } catch {
      // keep as sent
    }
  }
  return { country: isCountryCode(country) ? country : null, city: city ? city.slice(0, 100) : null }
}
