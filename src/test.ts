// Shared unit-test setup loaded by the Angular test builder.
import 'zone.js';
import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { environment } from 'src/environments/environment';

const originalConsoleWarn = console.warn.bind(console);

console.warn = (...args: unknown[]): void => {
  const [firstArg] = args;
  const message = typeof firstArg === 'string' ? firstArg : '';
  if (message.includes('Multiple GoTrueClient instances detected in the same browser context')) {
    return;
  }
  originalConsoleWarn(...args);
};

getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
  { teardown: { destroyAfterEach: false } }
);

// Specs assume normal (writable) mode regardless of the build's read-only flag;
// read-only specs opt in by setting the flag inside their own setup.
beforeEach(() => {
  environment.features.readOnlyModeEnabled = false;
  environment.features.maintenanceModeEnabled = false;
});
