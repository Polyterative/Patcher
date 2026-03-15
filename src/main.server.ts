// Polyfill for Node.js v25+ which defines localStorage as a global but without
// working methods (requires --localstorage-file flag). Supabase and other libs
// call localStorage.getItem at module-init time, which throws in this environment.
// We patch it with an in-memory adapter before Angular bootstraps.
if (typeof globalThis.localStorage === 'object' && typeof (globalThis.localStorage as Storage).getItem !== 'function') {
  const mem: Record<string, string> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).localStorage = {
    getItem:    (key: string) => Object.prototype.hasOwnProperty.call(mem, key) ? mem[key] : null,
    setItem:    (key: string, value: string) => { mem[key] = String(value); },
    removeItem: (key: string) => { delete mem[key]; },
    clear:      () => { Object.keys(mem).forEach(k => delete mem[k]); },
    key:        (index: number) => Object.keys(mem)[index] ?? null,
    get length() { return Object.keys(mem).length; },
  };
}

export { AppServerModule as default } from './app/app.server.module';
