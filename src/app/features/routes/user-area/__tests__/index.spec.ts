/**
 * Index barrel — imports all user-area test suites so a single
 * Karma/Jest run can pick them all up.
 */
import './user-area-root.spec';
import './user-modules.spec';
import './user-patches.spec';
import './user-racks.spec';
import './user-area-data-state.spec';