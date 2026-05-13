export interface SupabaseErrorLike {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}

export const LINKED_RACK_PENDING_ENVIRONMENT_MESSAGE =
  'Linked rack saving is not available yet in this environment. You can keep patching without one until the database update is applied.';

export const LINKED_RACK_PENDING_CREATE_MESSAGE =
  'Linked rack saving is not available yet in this environment. Create the patch without a linked rack for now.';

export function isLinkedRackSchemaMissingError(error: unknown): boolean {
  const candidate = error as SupabaseErrorLike | null | undefined;
  if (!candidate || candidate.code !== 'PGRST204') {
    return false;
  }

  const haystack = `${ candidate.message ?? '' } ${ candidate.details ?? '' } ${ candidate.hint ?? '' }`
    .toLowerCase();

  return haystack.includes('linked_rack_id') && haystack.includes('patches');
}
