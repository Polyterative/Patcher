import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class StandardsApiService {
  constructor(
    private readonly backend: SupabaseService
  ) {}

  list() {
    return this.backend.get.standards();
  }
}
