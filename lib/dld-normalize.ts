/**
 * Maps the new data.dubai DLD transactions export (Feb 2026+) onto the
 * vocabulary of the historical Dubai Pulse data already in dld_transactions,
 * so terminal queries filtering on e.g. 'Mortgages' / 'Villa' /
 * 'Off-Plan Properties' keep matching new rows.
 */

/** GROUP_EN: new export says 'Mortgage', history says 'Mortgages' */
export function normalizeTransGroup(group: string | null): string | null {
  return group === 'Mortgage' ? 'Mortgages' : group
}

/** PROP_TYPE_EN: new export files villas as Building + sub-type Villa; history uses type 'Villa' */
export function normalizePropertyType(type: string | null, subType: string | null): string | null {
  return type === 'Building' && subType === 'Villa' ? 'Villa' : type
}

/** IS_OFFPLAN_EN ('Off-Plan' | 'Ready') → historical reg_type_en values */
export function offplanToRegType(offplan: string | null): string | null {
  if (offplan === 'Off-Plan') return 'Off-Plan Properties'
  if (offplan === 'Ready') return 'Existing Properties'
  return offplan
}
