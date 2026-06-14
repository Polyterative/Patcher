import {
  RackBalanceAxisId,
  RACK_BALANCE_AXES
} from './rack-balance-analysis.constants';


export function resolveTagAxis(tagName: string | null | undefined): RackBalanceAxisId | null {
  const normalizedTagName = tagName?.trim();
  if (!normalizedTagName) {
    return null;
  }

  for (const axis of RACK_BALANCE_AXES) {
    if (axis.dbTagNames.some(name => name.toLocaleLowerCase() === normalizedTagName.toLocaleLowerCase())) {
      return axis.id;
    }

    if (axis.purposePatterns.some(pattern => pattern.test(normalizedTagName))) {
      return axis.id;
    }
  }

  return null;
}
