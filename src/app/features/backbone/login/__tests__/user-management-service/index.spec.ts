/**
 * UserManagementService Test Suite
 *
 * Comprehensive tests for UserManagementService covering:
 * - Initialization and dependency injection
 * - Cross-tab logout synchronization
 * - Cross-tab login synchronization
 * - User state management
 * - Manual login/logout operations
 * - Memory management and cleanup
 *
 * @see /internaldocs/CROSS_TAB_LOGOUT_IMPLEMENTATION.md
 */

// Test setup
export * from './test-setup';

// Test suites
import './initialization.spec';
import './cross-tab-logout.spec';
import './cross-tab-login.spec';
import './user-state.spec';
import './login-logout.spec';
import './memory-management.spec';
import './password-change.spec';