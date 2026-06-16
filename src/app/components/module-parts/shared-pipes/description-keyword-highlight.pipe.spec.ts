import { SecurityContext } from '@angular/core';
import {
  TestBed
} from '@angular/core/testing';
import {
  DomSanitizer
} from '@angular/platform-browser';
import { DescriptionKeywordHighlightPipe } from './description-keyword-highlight.pipe';

describe('DescriptionKeywordHighlightPipe', () => {
  let pipe: DescriptionKeywordHighlightPipe;
  let sanitizer: DomSanitizer;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DescriptionKeywordHighlightPipe]
    });
    pipe = TestBed.inject(DescriptionKeywordHighlightPipe);
    sanitizer = TestBed.inject(DomSanitizer);
  });

  function render(description: string, maxHighlights = 2): string {
    return sanitizer.sanitize(SecurityContext.HTML, pipe.transform(description, maxHighlights)) ?? '';
  }

  it('wraps matched purpose keywords with the matching axis class', () => {
    const html = render('Dual VCO with wave shaping and filter tone.');

    expect(html).toContain('<span class="desc-kw desc-kw--voices">VCO</span>');
    expect(html).toContain('<span class="desc-kw desc-kw--tone">filter</span>');
  });

  it('caps highlights at the requested count', () => {
    const html = render('VCO oscillator voice drum sampler filter delay', 2);

    expect((html.match(/class="desc-kw/g) ?? []).length).toBe(2);
  });

  it('keeps plain text unchanged when there are no matches', () => {
    expect(render('A compact silver expander.')).toBe('A compact silver expander.');
  });

  it('escapes description HTML before returning trusted markup', () => {
    const html = render('<img src=x onerror=alert(1)> VCO');

    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('<span class="desc-kw desc-kw--voices">VCO</span>');
  });
});
