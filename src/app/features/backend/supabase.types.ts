import { User } from '@supabase/supabase-js';
import {
  Observable,
  ObservedValueOf
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
  auth_provider?: string;
};

export interface SupabaseLoginResponse {
  returnUrl: any;
  user: RichUserModel;
}

export type SupabaseSignupResponse = Observable<SupabaseLoginResponse | ObservedValueOf<Promise<{
  user: SimpleUserModel | null;
}>>>;

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