import {
  PLATFORM_ID,
  type Provider
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { SupabaseService } from '../../supabase.service';
import { of, Subject } from 'rxjs';
import {
  globalCacheBusterNotifier,
  promiseGlobalCacheBusterNotifier
} from 'ts-cacheable';


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
export interface SupabaseServiceTestSetup {
  service: SupabaseService;
  mockSnackBar: jasmine.SpyObj<MatSnackBar>;
  mockActivatedRoute: jasmine.SpyObj<ActivatedRoute>;
}

export function setupSupabaseServiceTest(): SupabaseServiceTestSetup {
  const mockSnackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open', 'openFromComponent', 'dismiss']);
  const mockActivatedRoute = jasmine.createSpyObj<ActivatedRoute>('ActivatedRoute', [], {
    queryParams: of({}),
    params: of({})
  });
  // PLATFORM_ID is 'server' below, so SupabaseService's server-only branch (SSR
  // bootstrap guard) runs during these tests and needs a Router to subscribe to.
  const mockRouter = {events: new Subject()};
  const providers: Provider[] = [
    SupabaseService,
    {provide: MatSnackBar, useValue: mockSnackBar},
    {provide: ActivatedRoute, useValue: mockActivatedRoute},
    {provide: Router, useValue: mockRouter},
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
  // @Cacheable stores values outside Angular TestBed; clear it so specs never share mock responses.
  globalCacheBusterNotifier.next();
  promiseGlobalCacheBusterNotifier.next();
  localStorage.clear();
  sessionStorage.clear();
  TestBed.resetTestingModule();
}
