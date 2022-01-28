export interface DialogLabelDefinition {
  label?: string;
  disabled?: boolean;
  theme?: 'primary' | 'warning' | 'positive' | 'negative' | 'light';
}

export interface DialogDataInModelBase {
  title: string;
  description?: string;
}
