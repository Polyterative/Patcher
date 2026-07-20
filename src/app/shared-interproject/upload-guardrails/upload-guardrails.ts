export type UploadGuardrailKind = 'module-panel' | 'rack-preview';
export type UploadGuardrailSeverity = 'ok' | 'info' | 'warning' | 'error';
export type UploadGuardrailStatus = 'within-limits' | 'needs-confirmation' | 'blocked';

export interface UploadGuardrailLimits {
  maxBytes: number;
  maxLongEdgePx?: number;
}

export interface UploadGuardrailMeasurement {
  byteSize: number;
  widthPx?: number;
  heightPx?: number;
  mimeType?: string;
}

export interface UploadGuardrailIssue {
  code: 'byte-size' | 'long-edge';
  message: string;
  measured: number;
  limit: number;
}

export interface UploadGuardrailAdvisory {
  kind: UploadGuardrailKind;
  status: UploadGuardrailStatus;
  severity: UploadGuardrailSeverity;
  accepted: boolean;
  requiresConfirmation: boolean;
  measurement: UploadGuardrailMeasurement;
  limits: UploadGuardrailLimits;
  issues: UploadGuardrailIssue[];
  summary: string;
}

export const MODULE_PANEL_MAX_BYTES = 512 * 1024;
export const MODULE_PANEL_MAX_LONG_EDGE_PX = 5000;
export const RACK_PREVIEW_MAX_BYTES = 1024 * 1024;

export const MODULE_PANEL_GUARDRAIL_LIMITS: UploadGuardrailLimits = {
  maxBytes: MODULE_PANEL_MAX_BYTES,
  maxLongEdgePx: MODULE_PANEL_MAX_LONG_EDGE_PX
};

export const RACK_PREVIEW_GUARDRAIL_LIMITS: UploadGuardrailLimits = {
  maxBytes: RACK_PREVIEW_MAX_BYTES
};

export function formatGuardrailBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${ trimMeasurement(bytes / (1024 * 1024)) } MB`;
  }
  return `${ trimMeasurement(bytes / 1024) } KB`;
}

export function getLongEdgePx(measurement: UploadGuardrailMeasurement): number | undefined {
  if (measurement.widthPx == null && measurement.heightPx == null) {
    return undefined;
  }

  return Math.max(measurement.widthPx ?? 0, measurement.heightPx ?? 0);
}

export function buildUploadGuardrailAdvisory(
  kind: UploadGuardrailKind,
  measurement: UploadGuardrailMeasurement
): UploadGuardrailAdvisory {
  const limits = kind === 'module-panel'
    ? MODULE_PANEL_GUARDRAIL_LIMITS
    : RACK_PREVIEW_GUARDRAIL_LIMITS;
  const issues = buildUploadGuardrailIssues(measurement, limits);

  if (kind === 'rack-preview' && issues.length > 0) {
    return {
      kind,
      status: 'blocked',
      severity: 'error',
      accepted: false,
      requiresConfirmation: false,
      measurement,
      limits,
      issues,
      summary: `Rack preview is ${ formatGuardrailBytes(measurement.byteSize) }; limit is ${ formatGuardrailBytes(limits.maxBytes) }.`
    };
  }

  if (kind === 'module-panel' && issues.length > 0) {
    return {
      kind,
      status: 'needs-confirmation',
      severity: 'warning',
      accepted: true,
      requiresConfirmation: true,
      measurement,
      limits,
      issues,
      summary: `Panel image is still over the target after compression (${ issues.map(issue => issue.message).join('; ') }).`
    };
  }

  return {
    kind,
    status: 'within-limits',
    severity: 'ok',
    accepted: true,
    requiresConfirmation: false,
    measurement,
    limits,
    issues,
    summary: `${ kind === 'module-panel' ? 'Panel image' : 'Rack preview' } is within upload limits.`
  };
}

function buildUploadGuardrailIssues(
  measurement: UploadGuardrailMeasurement,
  limits: UploadGuardrailLimits
): UploadGuardrailIssue[] {
  const issues: UploadGuardrailIssue[] = [];
  if (measurement.byteSize > limits.maxBytes) {
    issues.push({
      code: 'byte-size',
      message: `${ formatGuardrailBytes(measurement.byteSize) } / ${ formatGuardrailBytes(limits.maxBytes) }`,
      measured: measurement.byteSize,
      limit: limits.maxBytes
    });
  }

  const longEdgePx = getLongEdgePx(measurement);
  if (longEdgePx != null && limits.maxLongEdgePx != null && longEdgePx > limits.maxLongEdgePx) {
    issues.push({
      code: 'long-edge',
      message: `${ longEdgePx } px long edge / ${ limits.maxLongEdgePx } px`,
      measured: longEdgePx,
      limit: limits.maxLongEdgePx
    });
  }

  return issues;
}

function trimMeasurement(value: number): string {
  return value >= 10 ? value.toFixed(0) : value.toFixed(1).replace(/\.0$/, '');
}
