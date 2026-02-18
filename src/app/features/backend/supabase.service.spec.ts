/**
 * SupabaseService Test Suite - Legacy Entry Point
 *
 * This file has been refactored into a modular test structure for better maintainability.
 * All tests are now organized in the __tests__/supabase-service/ directory.
 *
 * See: __tests__/supabase-service/README.md for complete documentation
 *
 * Test files:
 * - initialization.spec.ts: Service creation & DI tests
 * - api-surface.spec.ts: API method structure tests
 * - integration-tags.spec.ts: Tag retrieval integration tests
 * - integration-manufacturers.spec.ts: Manufacturer & pagination tests
 * - integration-user-racks.spec.ts: User racks regression tests
 * - connection-health.spec.ts: Database connection validation
 * - caching.spec.ts: Cache behavior tests
 * - error-handling.spec.ts: Error handling & edge cases
 * - pattern-compliance.spec.ts: Architecture pattern validation
 */

// Import all modularized test suites
import './__tests__/supabase-service/index.spec';