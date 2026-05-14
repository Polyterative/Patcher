import { HeroInfoBoxService } from './hero-info-box.service';

describe('HeroInfoBoxService', () => {
  let service: HeroInfoBoxService;

  beforeEach(() => {
    service = new HeroInfoBoxService();
  });

  it('initialises infoText$ with empty string', () => {
    expect(service.infoText$.getValue()).toBe('');
  });

  it('updates infoText$ when hoverStart$ emits', () => {
    service.hoverStart$.next('hello');
    expect(service.infoText$.getValue()).toBe('hello');
  });

  it('resets infoText$ when hoverEnd$ emits', () => {
    service.hoverStart$.next('hello');
    service.hoverEnd$.next('');
    expect(service.infoText$.getValue()).toBe('');
  });
});
