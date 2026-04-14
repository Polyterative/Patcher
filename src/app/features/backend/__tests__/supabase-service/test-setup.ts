import {
  PLATFORM_ID,
  type Provider
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { SupabaseService } from '../../supabase.service';
import { of } from 'rxjs';


/**
 * Shared Test Setup and Configuration
 *
 * This file provides common test setup utilities and constants
 * used across all SupabaseService test suites.
 */

// Test configuration
export const TEST_TIMEOUT = 10000; // 10 seconds for network operations
export const PAGINATION_TEST_SIZE = 5;

/**
 * Creates and configures the test environment for SupabaseService
 */
export function setupSupabaseServiceTest() {
  const mockSnackBar = jasmine.createSpyObj('MatSnackBar', ['open', 'openFromComponent', 'dismiss']);
  const mockActivatedRoute = jasmine.createSpyObj('ActivatedRoute', [], {
    queryParams: of({}),
    params: of({})
  });
  const providers: Provider[] = [
    SupabaseService,
    {provide: MatSnackBar, useValue: mockSnackBar},
    {provide: ActivatedRoute, useValue: mockActivatedRoute},
    {provide: PLATFORM_ID, useValue: 'server'}
  ];
  
  TestBed.configureTestingModule({
    providers
  });
  
  const service = TestBed.inject(SupabaseService);
  
  return {
    service,
    mockSnackBar,
    mockActivatedRoute
  };
}

/**
 * Cleanup after each test
 */
export function cleanupSupabaseServiceTest() {
  const service = TestBed.inject(SupabaseService, null);
  service?.ngOnDestroy();
  localStorage.clear();
  sessionStorage.clear();
  TestBed.resetTestingModule();
}
