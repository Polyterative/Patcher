import { SecurityContext } from '@angular/core';
import {
  TestBed
} from '@angular/core/testing';
import {
  DomSanitizer
} from '@angular/platform-browser';
import { resolveTagAxis } from '../../rack-parts/rack-balance-analysis.utils';
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
    const html = render('Dual VCO with filter tone.');

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

  it('highlights aligned database tags with the same axes as rack function classification', () => {
    const sharedTags = [
      'Clock IN',
      'Clock OUT',
      'Arpeggiator',
      'Euclidean',
      'Crossfade',
      'Blank',
      'Sequencial Switch',
      'KICK',
      'SNARE',
      'Drone',
      'Filterbank',
      'Feedback',
    ];

    for (const tagName of sharedTags) {
      const axis = resolveTagAxis(tagName);
      const html = render(`Has ${ tagName } support.`, 1);

      expect(axis).withContext(tagName).not.toBeNull();
      expect(html).withContext(tagName).toContain(`<span class="desc-kw desc-kw--${ axis }">${ tagName }</span>`);
    }
  });

  it('uses normalized tag matching for aligned database tag highlights', () => {
    const tagName = 'Clock-IN';
    const axis = resolveTagAxis(tagName);
    const html = render(`Has ${ tagName } support.`, 1);

    expect(axis).toBe('timing');
    expect(html).toContain('<span class="desc-kw desc-kw--timing">Clock-IN</span>');
  });

  it('prioritizes the earliest lowercase tone keywords in descriptions', () => {
    const html = render(
      'Messor is a stereo compressor with lots of tricks up its sleeves. '
        + 'It has a low noise signal path and internal sidechain envelope.',
      2
    );

    expect(html).toContain('<span class="desc-kw desc-kw--tone">stereo</span>');
    expect(html).toContain('<span class="desc-kw desc-kw--tone">compressor</span>');
    expect(html).not.toContain('<span class="desc-kw desc-kw--voices">noise</span>');
    expect(html).not.toContain('<span class="desc-kw desc-kw--modulation">envelope</span>');
  });

  it('highlights equalizer words as tone keywords', () => {
    const html = render('Stereo or mono 3-band equalizer preamp with equalization.', 3);

    expect(html).toContain('<span class="desc-kw desc-kw--tone">Stereo</span>');
    expect(html).toContain('<span class="desc-kw desc-kw--tone">equalizer</span>');
    expect(html).toContain('<span class="desc-kw desc-kw--tone">equalization</span>');
  });

  it('highlights filterbank and feedback tone keywords', () => {
    const html = render('Filterbank with controllable feedback.', 2);

    expect(html).toContain('<span class="desc-kw desc-kw--tone">Filterbank</span>');
    expect(html).toContain('<span class="desc-kw desc-kw--tone">feedback</span>');
  });

  it('expands prefix pattern matches to complete words', () => {
    const html = render('Compact mixer with oscillator sequencer.', 3);

    expect(html).toContain('<span class="desc-kw desc-kw--utilities">mixer</span>');
    expect(html).toContain('<span class="desc-kw desc-kw--voices">oscillator</span>');
    expect(html).toContain('<span class="desc-kw desc-kw--timing">sequencer</span>');
    expect(html).not.toContain('>mix</span>er');
    expect(html).not.toContain('>osc</span>illator');
    expect(html).not.toContain('>sequenc</span>er');
  });
});
