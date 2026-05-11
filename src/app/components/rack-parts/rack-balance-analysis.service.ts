import { Injectable } from '@angular/core';
import { RackedModule } from 'src/app/models/module';
import {
  HIGH_AXIS_SHARE,
  LOW_AXIS_SHARE,
  LOW_TAG_COVERAGE,
  RackBalanceAxisDefinition,
  RackBalanceAxisId,
  RACK_BALANCE_AXES
} from './rack-balance-analysis.constants';
import { isBlankModule } from './rack-blank-module.constants';

export interface RackBalanceAxisResult {
  id: RackBalanceAxisId;
  label: string;
  icon: string;
  share: number;
  matchedModules: number;
  guidance: string;
}

export interface RackBalanceAnalysisResult {
  axes: RackBalanceAxisResult[];
  confidence: number;
  recognizedModuleCount: number;
  totalModules: number;
  warningMessage: string | null;
  summary: string;
  isEmpty: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class RackBalanceAnalysisService {
  private static readonly AREA_WEIGHT = 0.75;
  private static readonly COUNT_WEIGHT = 0.25;

  analyze(rowedRackedModules: RackedModule[][] | null | undefined): RackBalanceAnalysisResult {
    const modules = (rowedRackedModules ?? [])
      .flat()
      .filter((entry): entry is RackedModule => !!entry?.module && !isBlankModule(entry.module.id));

    if (modules.length === 0) {
      return {
        axes: RACK_BALANCE_AXES.map(axis => ({
          id: axis.id,
          label: axis.label,
          icon: axis.icon,
          share: 0,
          matchedModules: 0,
          guidance: 'Add modules to see how the rack distributes its balance across these tracked roles.'
        })),
        confidence: 0,
        recognizedModuleCount: 0,
        totalModules: 0,
        warningMessage: null,
        summary: 'Balance analysis appears once the rack has modules to evaluate.',
        isEmpty: true
      };
    }

    const matchedCounts = new Map<RackBalanceAxisId, number>();
    const matchedArea = new Map<RackBalanceAxisId, number>();
    RACK_BALANCE_AXES.forEach(axis => matchedCounts.set(axis.id, 0));
    RACK_BALANCE_AXES.forEach(axis => matchedArea.set(axis.id, 0));

    let recognizedModuleCount = 0;

    for (const rackedModule of modules) {
      const matchedAxes = this.getMatchedAxisIds(rackedModule);
      if (matchedAxes.size > 0) {
        recognizedModuleCount += 1;
      }

      matchedAxes.forEach(axisId => {
        matchedCounts.set(axisId, (matchedCounts.get(axisId) ?? 0) + 1);
        matchedArea.set(axisId, (matchedArea.get(axisId) ?? 0) + Math.max(rackedModule.module.hp ?? 0, 0));
      });
    }

    const totalMatches = [...matchedCounts.values()].reduce((sum, value) => sum + value, 0);
    const totalMatchedArea = [...matchedArea.values()].reduce((sum, value) => sum + value, 0);
    const confidence = recognizedModuleCount / modules.length;

    const weightedScores = new Map<RackBalanceAxisId, number>();
    let totalWeightedScore = 0;

    RACK_BALANCE_AXES.forEach(axis => {
      const countShare = totalMatches > 0 ? (matchedCounts.get(axis.id) ?? 0) / totalMatches : 0;
      const areaShare = totalMatchedArea > 0 ? (matchedArea.get(axis.id) ?? 0) / totalMatchedArea : 0;
      const weightedScore = RackBalanceAnalysisService.AREA_WEIGHT * areaShare
        + RackBalanceAnalysisService.COUNT_WEIGHT * countShare;

      weightedScores.set(axis.id, weightedScore);
      totalWeightedScore += weightedScore;
    });

    const axes = RACK_BALANCE_AXES.map(axis => {
      const matchedModules = matchedCounts.get(axis.id) ?? 0;
      const share = totalWeightedScore > 0
        ? Math.round(((weightedScores.get(axis.id) ?? 0) / totalWeightedScore) * 100)
        : 0;

      return {
        id: axis.id,
        label: axis.label,
        icon: axis.icon,
        share,
        matchedModules,
        guidance: this.getGuidance(axis, share)
      };
    });

    const warningMessage = confidence < LOW_TAG_COVERAGE
      ? `Guidance is partial: ${ recognizedModuleCount } of ${ modules.length } modules have recognized balance tags.`
      : null;

    return {
      axes,
      confidence,
      recognizedModuleCount,
      totalModules: modules.length,
      warningMessage,
      summary: this.buildSummary(axes, totalWeightedScore, warningMessage),
      isEmpty: false
    };
  }

  private getMatchedAxisIds(rackedModule: RackedModule): Set<RackBalanceAxisId> {
    const tagEntries = rackedModule.module.tags ?? [];
    const matchedAxes = new Set<RackBalanceAxisId>();

    for (const entry of tagEntries) {
      const tagName = entry?.tag?.name?.trim();
      const tagType = this.normalizeTagType(entry?.tag?.type);

      if (!tagName || !this.isBalanceRelevantTagType(tagType)) {
        continue;
      }

      for (const axis of RACK_BALANCE_AXES) {
        if (this.matchesDbTagName(axis, tagName)) {
          matchedAxes.add(axis.id);
          continue;
        }

        const patterns = this.getPatternsForTagType(axis, tagType);

        if (patterns.some(pattern => pattern.test(tagName))) {
          matchedAxes.add(axis.id);
        }
      }
    }

    return matchedAxes;
  }

  private normalizeTagType(tagType: unknown): string | null {
    if (typeof tagType === 'string') {
      return tagType.trim().toLowerCase();
    }

    if (typeof tagType === 'number') {
      if (tagType === 0) {
        return 'purpose';
      }
      if (tagType === 1) {
        return 'nature';
      }
      if (tagType === 2) {
        return 'character';
      }
    }

    return null;
  }

  private matchesDbTagName(axis: RackBalanceAxisDefinition, tagName: string): boolean {
    const normalizedTagName = this.normalizeTagName(tagName);

    return axis.dbTagNames.some(name => this.normalizeTagName(name) === normalizedTagName);
  }

  private normalizeTagName(tagName: string): string {
    return tagName
      .trim()
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private isBalanceRelevantTagType(tagType: string | null): boolean {
    return tagType === 'purpose'
      || tagType === 'nature'
      || tagType === 'function'
      || tagType === 'module_type';
  }

  private getPatternsForTagType(axis: RackBalanceAxisDefinition, tagType: string): RegExp[] {
    if (tagType === 'purpose') {
      return axis.purposePatterns;
    }

    if (tagType === 'nature') {
      return axis.naturePatterns;
    }

    return [
      ...axis.purposePatterns,
      ...axis.naturePatterns
    ];
  }

  private getGuidance(axis: RackBalanceAxisDefinition, share: number): string {
    if (share <= LOW_AXIS_SHARE) {
      return axis.guidance.low;
    }
    if (share >= HIGH_AXIS_SHARE) {
      return axis.guidance.high;
    }
    return axis.guidance.balanced;
  }

  private buildSummary(axes: RackBalanceAxisResult[], totalMatches: number, warningMessage: string | null): string {
    if (totalMatches === 0) {
      return 'No recognized balance tags were found yet, so this panel stays neutral until more module tags are available.';
    }

    const sortedAxes = [...axes].sort((a, b) => b.share - a.share);
    const strongestAxis = sortedAxes[0];
    const lightestAxis = sortedAxes[sortedAxes.length - 1];
    const spread = strongestAxis.share - lightestAxis.share;

    if (warningMessage) {
      return `Early signal only: the current tags lean most toward ${ strongestAxis.label.toLowerCase() }.`;
    }

    if (spread <= 8) {
      return 'The tracked roles are fairly evenly spread, so the rack reads as broadly balanced across these advisory axes.';
    }

    return `The current tag mix leans most toward ${ strongestAxis.label.toLowerCase() } and least toward ${ lightestAxis.label.toLowerCase() }.`;
  }
}
