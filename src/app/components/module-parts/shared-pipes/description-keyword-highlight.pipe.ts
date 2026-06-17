import { Pipe, PipeTransform } from '@angular/core';
import {
  DomSanitizer,
  SafeHtml
} from '@angular/platform-browser';
import {
  RackBalanceAxisId,
  RACK_BALANCE_AXES
} from '../../rack-parts/rack-balance-analysis.constants';
import { normalizeTagName } from 'src/app/models/tag';

interface DescriptionHighlightRange {
  start: number;
  end: number;
  axisId: RackBalanceAxisId;
}

@Pipe({
  name: 'descriptionKeywordHighlight',
  standalone: false
})
export class DescriptionKeywordHighlightPipe implements PipeTransform {
  constructor(private readonly sanitizer: DomSanitizer) {}

  transform(description: string | null | undefined, maxHighlights = 2): SafeHtml {
    const source = description ?? '';
    const ranges = this.findHighlightRanges(source, maxHighlights);

    if (source.length === 0 || ranges.length === 0) {
      return this.sanitizer.bypassSecurityTrustHtml(this.escapeHtml(source));
    }

    let cursor = 0;
    const html: string[] = [];

    for (const range of ranges) {
      html.push(this.escapeHtml(source.slice(cursor, range.start)));
      html.push(`<span class="desc-kw desc-kw--${ range.axisId }">`);
      html.push(this.escapeHtml(source.slice(range.start, range.end)));
      html.push('</span>');
      cursor = range.end;
    }

    html.push(this.escapeHtml(source.slice(cursor)));
    return this.sanitizer.bypassSecurityTrustHtml(html.join(''));
  }

  private findHighlightRanges(source: string, maxHighlights: number): DescriptionHighlightRange[] {
    const max = Math.max(0, Math.floor(maxHighlights));
    if (max === 0) {
      return [];
    }

    const ranges: DescriptionHighlightRange[] = [];

    for (const axis of RACK_BALANCE_AXES) {
      for (const tagName of axis.dbTagNames) {
        for (const match of source.matchAll(this.toGlobalPattern(this.toKeywordPattern(tagName)))) {
          const start = match.index ?? -1;
          const value = match[0] ?? '';
          if (start < 0 || value.length === 0) {
            continue;
          }

          const candidate = {
            start,
            end: start + value.length,
            axisId: axis.id
          };

          if (this.overlapsExistingRange(candidate, ranges)) {
            continue;
          }

          ranges.push(candidate);
          ranges.sort((left, right) => left.start - right.start);

          if (ranges.length >= max) {
            return ranges;
          }
        }
      }

      for (const pattern of axis.purposePatterns) {
        for (const match of source.matchAll(this.toGlobalPattern(pattern))) {
          const start = match.index ?? -1;
          const value = match[0] ?? '';
          if (start < 0 || value.length === 0) {
            continue;
          }

          const candidate = {
            start,
            end: start + value.length,
            axisId: axis.id
          };

          if (this.overlapsExistingRange(candidate, ranges)) {
            continue;
          }

          ranges.push(candidate);
          ranges.sort((left, right) => left.start - right.start);

          if (ranges.length >= max) {
            return ranges;
          }
        }
      }
    }

    return ranges;
  }

  private toGlobalPattern(pattern: RegExp): RegExp {
    const flags = pattern.flags.includes('g') ? pattern.flags : `${ pattern.flags }g`;
    return new RegExp(pattern.source, flags);
  }

  private toKeywordPattern(keyword: string): RegExp {
    const tokens = normalizeTagName(keyword).split(' ').filter(Boolean);
    const tokenPattern = tokens
      .map(token => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('[^\\p{L}\\p{N}]+');
    return new RegExp(`(?<![\\p{L}\\p{N}])${ tokenPattern }(?![\\p{L}\\p{N}])`, 'iu');
  }

  private overlapsExistingRange(
    candidate: DescriptionHighlightRange,
    ranges: DescriptionHighlightRange[]
  ): boolean {
    return ranges.some(range => candidate.start < range.end && candidate.end > range.start);
  }

  private escapeHtml(source: string): string {
    return source
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
