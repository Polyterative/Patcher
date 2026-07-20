import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface PatchCreatorPatchDraft {
  name: string;
  public: boolean;
  linked_rack_id?: number | null;
}

@Injectable({ providedIn: 'root' })
export class PatchCreatorApiService {
  constructor(
    private readonly backend: SupabaseService
  ) {}

  currentUserRacks(): ReturnType<SupabaseService['get']['currentUserRacks']> {
    return this.backend.get.currentUserRacks();
  }

  createPatch(patchDraft: PatchCreatorPatchDraft): ReturnType<SupabaseService['add']['patch']> {
    return this.backend.add.patch(patchDraft);
  }
}
