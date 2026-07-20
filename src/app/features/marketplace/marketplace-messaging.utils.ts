export const MARKETPLACE_MESSAGE_KINDS = [
  'text',
  'structured_offer',
  'structured_info',
  'status_notice'
] as const;

export type MarketplaceMessageKind = typeof MARKETPLACE_MESSAGE_KINDS[number];

export interface MarketplaceMessageDraft {
  transactionId?: string | null;
  senderProfileId?: string | null;
  body?: string | null;
  kind?: MarketplaceMessageKind | null;
  structuredPayload?: unknown;
}

export interface MarketplaceNormalizedMessageDraft {
  transactionId: string;
  senderProfileId: string;
  kind: MarketplaceMessageKind;
  hasStructuredPayload: boolean;
  body?: string;
}

export interface MarketplaceMessageThreadPreviewCandidate {
  transactionId?: string | null;
  otherParticipantLabel?: string | null;
  lastMessageBody?: string | null;
  lastMessageKind?: MarketplaceMessageKind | null;
  lastMessageAt?: string | Date | null;
  unreadCount?: number | null;
  flags?: MarketplaceMessageContentFlag[] | null;
  structuredPayload?: unknown;
}

export type MarketplaceMessageThreadPreviewUnavailableReason = 'missing_transaction';

export type MarketplaceMessageThreadPreview =
  | {
      available: true;
      transactionId: string;
      otherParticipantLabel: string;
      lastMessagePreview: string;
      lastMessageKind: MarketplaceMessageKind;
      lastMessageAt?: string;
      unreadCount: number;
      unreadLabel?: string;
      flags: MarketplaceMessageContentFlag[];
    }
  | {
      available: false;
      reason: MarketplaceMessageThreadPreviewUnavailableReason;
      otherParticipantLabel: string;
      unreadCount: number;
      unreadLabel?: string;
      flags: MarketplaceMessageContentFlag[];
    };

export type MarketplaceMessageDraftField =
  | 'transactionId'
  | 'senderProfileId'
  | 'body'
  | 'kind'
  | 'structuredPayload';

export type MarketplaceMessageContentFlag =
  | 'repeated_urls'
  | 'off_platform_payment'
  | 'external_contact';

export type MarketplaceMessageDraftValidationResult =
  | {
      valid: true;
      message: MarketplaceNormalizedMessageDraft;
      flags: MarketplaceMessageContentFlag[];
    }
  | {
      valid: false;
      errors: Partial<Record<MarketplaceMessageDraftField, string>>;
      flags: MarketplaceMessageContentFlag[];
    };

const MAX_TEXT_MESSAGE_LENGTH = 2000;
const MARKETPLACE_MESSAGE_KIND_SET = new Set<string>(MARKETPLACE_MESSAGE_KINDS);
const URL_PATTERN = /\b(?:https?:\/\/|www\.)\S+/giu;
const PAYMENT_PATTERN = /\b(?:paypal(?:\.me)?|revolut|venmo|cash\s*app|cash\.app|crypto|bitcoin|btc|ethereum|eth)\b|\bcash ?tag\b|\$[a-z][a-z0-9_]{2,}\b|0x[a-f0-9]{32,64}\b|\b(?:bc1|[13])[a-z0-9]{25,39}\b/iu;
const EXTERNAL_CONTACT_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\+?\b(?:\d[\s().-]?){7,}\d\b|\b(?:whats\s*app|telegram|t\.me\/)\b/iu;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu;
const PHONE_PATTERN = /\+?\b(?:\d[\s().-]?){7,}\d\b/gu;
const MAX_THREAD_PREVIEW_LENGTH = 120;
const MAX_UNREAD_DISPLAY_COUNT = 99;
const DEFAULT_THREAD_LABEL = 'Marketplace conversation';
const STRUCTURED_THREAD_PREVIEW_LABELS: Record<Exclude<MarketplaceMessageKind, 'text'>, string> = {
  status_notice: 'Status update',
  structured_info: 'Shared info',
  structured_offer: 'Structured offer'
};

export function buildMarketplaceMessageThreadPreview(
  input: MarketplaceMessageThreadPreviewCandidate | null | undefined
): MarketplaceMessageThreadPreview {
  const source = isObjectRecord(input) ? input : {};
  const transactionId = trimOptionalText(source.transactionId);
  const otherParticipantLabel = normalizeParticipantLabel(source.otherParticipantLabel);
  const unreadCount = normalizeUnreadCount(source.unreadCount);
  const unreadLabel = unreadCount > 0
    ? (unreadCount >= MAX_UNREAD_DISPLAY_COUNT ? `${MAX_UNREAD_DISPLAY_COUNT}+` : String(unreadCount))
    : undefined;
  const flags = normalizeMarketplaceMessageContentFlags(source.flags);

  if (!transactionId) {
    return {
      available: false,
      flags,
      otherParticipantLabel,
      reason: 'missing_transaction',
      unreadCount,
      ...(unreadLabel ? {unreadLabel} : {})
    };
  }

  const lastMessageKind = normalizeMarketplaceMessageKind(source.lastMessageKind);
  const lastMessagePreview = buildLastMessagePreview(lastMessageKind, source.lastMessageBody);
  const mergedFlags = mergeMarketplaceMessageContentFlags(
    flags,
    lastMessageKind === 'text'
      ? detectMarketplaceMessageContentFlags(typeof source.lastMessageBody === 'string' ? source.lastMessageBody : '')
      : []
  );
  const lastMessageAt = normalizeLastMessageAt(source.lastMessageAt);

  return {
    available: true,
    flags: mergedFlags,
    lastMessageKind,
    lastMessagePreview,
    otherParticipantLabel,
    transactionId,
    unreadCount,
    ...(lastMessageAt ? {lastMessageAt} : {}),
    ...(unreadLabel ? {unreadLabel} : {})
  };
}

export function validateAndNormalizeMarketplaceMessageDraft(
  draft: MarketplaceMessageDraft | null | undefined
): MarketplaceMessageDraftValidationResult {
  const source = isObjectRecord(draft) ? draft : {};
  const transactionId = trimOptionalText(source.transactionId);
  const senderProfileId = trimOptionalText(source.senderProfileId);
  const body = trimOptionalText(source.body);
  const kind = typeof source.kind === 'string' ? source.kind : undefined;
  const hasStructuredPayload = source.structuredPayload !== null && source.structuredPayload !== undefined;
  const flags = detectMarketplaceMessageContentFlags(typeof source.body === 'string' ? source.body : '');
  const errors: Partial<Record<MarketplaceMessageDraftField, string>> = {};

  if (!transactionId) {
    errors.transactionId = 'Required';
  }

  if (!senderProfileId) {
    errors.senderProfileId = 'Required';
  }

  if (!kind || !MARKETPLACE_MESSAGE_KIND_SET.has(kind)) {
    errors.kind = 'Use a supported message kind';
  }

  if (kind === 'text') {
    if (!body) {
      errors.body = 'Required';
    } else if (body.length > MAX_TEXT_MESSAGE_LENGTH) {
      errors.body = `Use ${MAX_TEXT_MESSAGE_LENGTH} characters or fewer`;
    }

    if (hasStructuredPayload) {
      errors.structuredPayload = 'Text messages cannot include structured payloads';
    }
  } else if (body && body.length > MAX_TEXT_MESSAGE_LENGTH) {
    errors.body = `Use ${MAX_TEXT_MESSAGE_LENGTH} characters or fewer`;
  }

  if (Object.keys(errors).length > 0) {
    return {
      errors,
      flags,
      valid: false
    };
  }

  const message: MarketplaceNormalizedMessageDraft = {
    hasStructuredPayload,
    kind: kind as MarketplaceMessageKind,
    senderProfileId: senderProfileId as string,
    transactionId: transactionId as string,
    ...(body ? {body} : {})
  };

  return {
    flags,
    message,
    valid: true
  };
}

export function detectMarketplaceMessageContentFlags(body: string | null | undefined): MarketplaceMessageContentFlag[] {
  const content = typeof body === 'string' ? body : '';
  const flags: MarketplaceMessageContentFlag[] = [];

  if ((content.match(URL_PATTERN) ?? []).length > 1) {
    flags.push('repeated_urls');
  }

  if (PAYMENT_PATTERN.test(content)) {
    flags.push('off_platform_payment');
  }

  if (EXTERNAL_CONTACT_PATTERN.test(content)) {
    flags.push('external_contact');
  }

  return flags;
}

function normalizeMarketplaceMessageKind(value: unknown): MarketplaceMessageKind {
  return typeof value === 'string' && MARKETPLACE_MESSAGE_KIND_SET.has(value) ? (value as MarketplaceMessageKind) : 'text';
}

function buildLastMessagePreview(kind: MarketplaceMessageKind, body: unknown): string {
  if (kind !== 'text') {
    return STRUCTURED_THREAD_PREVIEW_LABELS[kind];
  }

  const safeBody = redactCheapContactText(trimOptionalText(body) ?? '')
    .replace(/\s+/gu, ' ')
    .trim();
  if (!safeBody) {
    return 'Message';
  }

  return snipText(safeBody, MAX_THREAD_PREVIEW_LENGTH);
}

function normalizeParticipantLabel(value: unknown): string {
  const safeLabel = redactCheapContactText(trimOptionalText(value) ?? '')
    .replace(/\s+/gu, ' ')
    .trim();

  return safeLabel || DEFAULT_THREAD_LABEL;
}

function redactCheapContactText(value: string): string {
  return value
    .replace(EMAIL_PATTERN, '[redacted contact]')
    .replace(PHONE_PATTERN, '[redacted contact]');
}

function snipText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function normalizeUnreadCount(value: unknown): number {
  const numericValue = typeof value === 'number' ? value : Number.NaN;
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return 0;
  }

  return Math.min(Math.floor(numericValue), MAX_UNREAD_DISPLAY_COUNT);
}

function normalizeLastMessageAt(value: unknown): string | undefined {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
  }

  return trimOptionalText(value);
}

function normalizeMarketplaceMessageContentFlags(value: unknown): MarketplaceMessageContentFlag[] {
  return Array.isArray(value) ? mergeMarketplaceMessageContentFlags(value) : [];
}

function mergeMarketplaceMessageContentFlags(...flagLists: unknown[][]): MarketplaceMessageContentFlag[] {
  const flags = new Set<MarketplaceMessageContentFlag>();

  for (const flagList of flagLists) {
    for (const flag of flagList) {
      if (isMarketplaceMessageContentFlag(flag)) {
        flags.add(flag);
      }
    }
  }

  return [...flags];
}

function isMarketplaceMessageContentFlag(value: unknown): value is MarketplaceMessageContentFlag {
  return value === 'repeated_urls' || value === 'off_platform_payment' || value === 'external_contact';
}

function trimOptionalText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
