import { BrandPrimaryButtonTheme } from "src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.component";


export interface DialogLabelDefinition {
  label?: string;
  disabled?: boolean;
  theme?: BrandPrimaryButtonTheme;
}

export interface DialogDataInModelBase {
  title: string;
  description?: string;
}