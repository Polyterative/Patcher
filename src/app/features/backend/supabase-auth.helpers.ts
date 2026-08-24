import {
  isAuthApiError,
  Session,
  User
} from '@supabase/supabase-js';
import {
  Observable,
  of
} from 'rxjs';
import {
  filter,
  map,
  switchMap,
  take,
  timeout
} from 'rxjs/operators';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { Database } from 'src/backend/database.types';
import {
  RichUserModel,
  SimpleUserModel
} from './supabase.types';
import { type CachedEntity } from './supabase.cache';


export const AUTH_NULL_SESSION_SETTLE_TIMEOUT_MS = 1500;
export const OAUTH_CALLBACK_SESSION_TIMEOUT_MS = 10000;

export const AUTH_CACHE_KEYS: CachedEntity[] = [
  'comments',
  'modules',
  'currentUserModules',
  'moduleWithId',
  'manufacturers',
  'patchConnections',
  'patchModuleInstances',
  'rackWithId',
  'patches',
  'currentUserComments'
];

export type AuthProfileFields = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'username' | 'public' | 'website' | 'avatar_url'
>;


export class PasswordResetError extends Error {
  constructor(
    public override message: string,
    public errorCode?: string | number,
    public statusCode?: string | number,
    public details?: string
  ) {
    super(message);
    this.name = 'PasswordResetError';
  }
}


export function getSettledAuthSession$(
  authSession$: Observable<Session | null>,
  nullSessionTimeoutMs = AUTH_NULL_SESSION_SETTLE_TIMEOUT_MS
): Observable<Session | null> {
  return authSession$.pipe(
    take(1),
    switchMap(session => {
      if (session) return of(session);
      return authSession$.pipe(
        filter((nextSession): nextSession is Session => !!nextSession),
        take(1),
        timeout({
          first: nullSessionTimeoutMs,
          with: () => of(null)
        })
      );
    })
  );
}

export function mapSimpleUserSession(session: Session | null): SimpleUserModel | null {
  if (session == null) return null;
  const { user } = session;
  return {
    id: user.id,
    email: user.email,
    created_at: user.created_at,
    updated_at: user.updated_at
  };
}

export function mapLoginUser(user: User, profile: AuthProfileFields): RichUserModel {
  return {
    ...user,
    username: profile.username,
    public: profile.public,
    website: profile.website,
    avatar_url: profile.avatar_url,
  };
}

export function mapRichUserSession(user: User, profile: AuthProfileFields): RichUserModel {
  const authProvider = (user.app_metadata?.['provider'] as string) || 'email';
  const authProviders = (user.app_metadata?.['providers'] as string[]) || [authProvider];

  return {
    id: user.id,
    email: user.email,
    created_at: user.created_at,
    updated_at: user.updated_at,
    username: profile.username,
    public: profile.public,
    website: profile.website,
    avatar_url: profile.avatar_url,
    auth_provider: authProvider,
    auth_providers: authProviders
  };
}

export function createPasswordResetError(error: unknown): PasswordResetError {
  if (isAuthApiError(error)) {
    return classifyPasswordResetError(error.message, error.code, error.status);
  }

  const resetError = error as {
    status?: string | number;
    code?: string | number;
    error_code?: string;
    error_description?: string;
    message?: string;
    msg?: string;
    name?: string;
  } | null | undefined;
  const errorCode = resetError?.error_code || resetError?.code || resetError?.name;
  const statusCode = resetError?.status;
  const message = resetError?.msg || resetError?.message || resetError?.error_description;

  return classifyPasswordResetError(message, errorCode, statusCode);
}

function classifyPasswordResetError(
  message: string | undefined,
  errorCode: string | number | undefined,
  statusCode: string | number | undefined
): PasswordResetError {
  const errorMessages = SharedConstants.messages.resetPassword;

  if (errorCode === 'same_password' || message?.toLowerCase().includes('same password')) {
    return new PasswordResetError(errorMessages.samePassword, errorCode, statusCode);
  }
  if (errorCode === 'weak_password' || message?.toLowerCase().includes('weak password')) {
    return new PasswordResetError(errorMessages.weakPassword, errorCode, statusCode);
  }
  if (
    errorCode === 'invalid_credentials' || errorCode === 'invalid_grant' ||
    message?.toLowerCase().includes('invalid') || message?.toLowerCase().includes('expired')
  ) {
    return new PasswordResetError(errorMessages.invalidSession, errorCode, statusCode);
  }
  if (errorCode === 'network_error' || message?.toLowerCase().includes('network') || message?.toLowerCase().includes('fetch')) {
    return new PasswordResetError(errorMessages.networkError, errorCode, statusCode);
  }

  return new PasswordResetError(message || errorMessages.unknownError, errorCode, statusCode);
}

export function isPasswordResetRateLimited(error: unknown): boolean {
  return error instanceof PasswordResetError
    && (error.statusCode === 429 || error.errorCode === 'over_email_send_rate_limit');
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
