export interface PatchMinimalViewConfig {
  hideLabels: boolean;
  hideManufacturer: boolean;
  hideDescription: boolean;
  hideButtons: boolean;
  hideHP: boolean;
  hideDates: boolean;
}

export const defaultPatchMinimalViewConfig: PatchMinimalViewConfig = {
  hideLabels:       false,
  hideManufacturer: false,
  hideDescription:  false,
  hideButtons:      true,
  hideHP:           false,
  hideDates:        false
};
