import { User } from '@supabase/supabase-js';
import {
  Observable,
} from 'rxjs';


export type SupabaseStorageFile =
  ArrayBuffer
  | ArrayBufferView
  | Blob
  | Buffer
  | File
  | FormData
  | ReadableStream
  | URLSearchParams
  | string;

export type OAuthProvider =
  'google'
  | 'apple'
  | 'github'
  | 'facebook'
  | 'azure'
  | 'twitter';

export type SimpleUserModel = Pick<User, 'id' | 'email' | 'created_at' | 'updated_at'>;

export type RichUserModel =
  SimpleUserModel
  & {
  username: string;
  public?: boolean;
  website?: string | null;
  avatar_url?: string | null;
  /** Primary provider (e.g. 'email', 'google'). Use auth_providers for full list. */
  auth_provider?: string;
  /** All linked auth providers for this account (e.g. ['email', 'google']). */
  auth_providers?: string[];
};

export interface SupabaseLoginResponse {
  returnUrl: any;
  user: RichUserModel;
}

export interface SupabaseSignupResult {
  user: SimpleUserModel | null;
  requiresEmailConfirmation: boolean;
}

export type SupabaseSignupResponse = Observable<SupabaseSignupResult>;

export type CurrentUserModulesOrderKey =
  'moduleName'
  | 'collectionUpdated';

export type CurrentUserModulesOrderDirection =
  'asc'
  | 'desc';

export interface CurrentUserModulesOrderConfig {
  key: CurrentUserModulesOrderKey;
  direction: CurrentUserModulesOrderDirection;
}
