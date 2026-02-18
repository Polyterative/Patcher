/**
 * SupabaseService Test Suite - Main Entry Point
 *
 * This file serves as the main entry point for all SupabaseService tests.
 * Tests are organized into separate files by functional area for better maintainability.
 *
 * Test Organization:
 * - test-setup.ts: Shared test configuration and utilities
 * - initialization.spec.ts: Service creation and dependency injection
 * - api-surface.spec.ts: API method availability and structure
 * - integration-tags.spec.ts: Tag retrieval integration tests
 * - integration-manufacturers.spec.ts: Manufacturer retrieval and pagination tests
 * - integration-user-racks.spec.ts: User racks regression and data extraction tests
 * - connection-health.spec.ts: Database connection validation
 * - caching.spec.ts: Cache behavior and localStorage tests
 * - error-handling.spec.ts: Error handling and edge cases
 * - pattern-compliance.spec.ts: Service architecture pattern validation
 *
 * To run these tests:
 * yarn test-headless
 *
 * To run specific test file:
 * yarn test --include='**\/supabase-service/**\/*.spec.ts'
 */

// Import all test suites - they will auto-register with Jasmine
import './initialization.spec';
import './api-surface.spec';
import './integration-tags.spec';
import './integration-manufacturers.spec';
import './integration-user-racks.spec';
import './connection-health.spec';
import './caching.spec';
import './error-handling.spec';
import './pattern-compliance.spec';