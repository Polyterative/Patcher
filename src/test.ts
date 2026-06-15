// Shared unit-test setup loaded by the Angular test builder.
import 'zone.js';
import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';

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