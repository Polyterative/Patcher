import {
  normalizeHostCandidate,
  resolveRequestOrigin,
  resolveSsrAllowedHosts
} from './ssr-host-config';


describe('ssr-host-config', () => {
  it('builds a Vercel-aware SSR allowlist from trusted environment values', () => {
    const allowedHosts = resolveSsrAllowedHosts({
      VERCEL: '1',
      VERCEL_URL: 'patcher-fsfew5sj3-polys-projects-01f337a7.vercel.app',
      VERCEL_BRANCH_URL: 'patcher-git-develop-polys-projects-01f337a7.vercel.app',
      VERCEL_PROJECT_PRODUCTION_URL: 'patcher.xyz',
      SEO_CANONICAL_ORIGIN: 'https://www.patcher.xyz',
    });
    
    expect(allowedHosts).toEqual(jasmine.arrayContaining([
      'localhost',
      '127.0.0.1',
      '*.vercel.app',
      'patcher-fsfew5sj3-polys-projects-01f337a7.vercel.app',
      'patcher-git-develop-polys-projects-01f337a7.vercel.app',
      'patcher.xyz',
      'www.patcher.xyz',
    ]));
    expect(allowedHosts.filter((host) => host === 'localhost').length).toBe(1);
  });
  
  it('normalizes explicit allowed-host entries', () => {
    const allowedHosts = resolveSsrAllowedHosts({
      NG_ALLOWED_HOSTS: ' docs.patcher.xyz, https://api.patcher.xyz:443/base, *.preview.patcher.xyz ',
    });
    
    expect(allowedHosts).toEqual(jasmine.arrayContaining([
      'docs.patcher.xyz',
      'api.patcher.xyz',
      '*.preview.patcher.xyz',
    ]));
  });
  
  it('prefers forwarded headers when building the render origin', () => {
    expect(resolveRequestOrigin({
      protocol: 'http',
      host: 'localhost:4000',
      forwardedProto: 'https, http',
      forwardedHost: 'patcher.xyz, proxy.local',
    })).toBe('https://patcher.xyz');
  });
  
  it('normalizes wildcard and absolute host candidates', () => {
    expect(normalizeHostCandidate('*.Vercel.app')).toBe('*.vercel.app');
    expect(normalizeHostCandidate('https://Patcher.xyz/modules/1')).toBe('patcher.xyz');
  });
});