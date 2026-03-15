// Polyfill for Node.js SSR environments where localStorage is absent or incomplete.
//   Node.js ≤24: localStorage is undefined → the typeof check below is 'undefined'
//   Node.js 25+: localStorage is defined as an object but getItem is not a function
//                (requires --localstorage-file flag to be functional)
// In both cases we install an in-memory adapter before Angular bootstraps so that
// Supabase and other libs that call localStorage at module-init time don't throw.
if (typeof globalThis.localStorage !== 'object' ||
    typeof (globalThis.localStorage as unknown as Storage).getItem !== 'function') {
  const mem: Record<string, string> = {};
  (globalThis as unknown as Record<string, unknown>)['localStorage'] = {
    getItem:    (key: string) => Object.prototype.hasOwnProperty.call(mem, key) ? mem[key] : null,
    setItem:    (key: string, value: string) => { mem[key] = String(value); },
    removeItem: (key: string) => { delete mem[key]; },
    clear:      () => { Object.keys(mem).forEach(k => delete mem[k]); },
    key:        (index: number) => Object.keys(mem)[index] ?? null,
    get length() { return Object.keys(mem).length; },
  };
}

// Export the NgModule class directly so Angular's route extractor can use its
// own pre-configured platformServer (with IS_DISCOVERING_ROUTES + _ENABLE_ROOT_COMPONENT_BOOTSTRAP).
export { AppServerModule as default } from './app/app.server.module';
