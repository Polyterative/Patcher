import { MinimalModule } from 'src/app/models/module';
import { STANDARDS } from '../module-collection-analysis.service';
import {
  ambiguousResolutionState,
  filterLargeFormatModules,
  importedRackName,
  isAmbiguousCandidateSelected,
  missingModulesText,
  moduleManufacturerName
} from './rack-creator.helpers';
import { ModularGridMatchPreview } from './modulargrid-import/modulargrid-import.types';


describe('rack creator helpers', () => {
  function moduleWithStandard(id: number, standardId?: number): MinimalModule {
    return {
      id,
      hp: 8,
      standard: standardId === undefined ? undefined : {id: standardId}
    } as MinimalModule;
  }

  function unmatchedPreview(): ModularGridMatchPreview {
    return {
      rack: {
        name: 'Import Rack',
        rows: 1,
        hp: 84,
        rows1u: []
      },
      confident: [],
      likely: [],
      ambiguous: [],
      blank: [],
      unmatched: [
        {
          bucket: 'unmatched',
          candidates: [],
          source: {
            key: '1:1:0',
            mgId: 11,
            name: 'Bef Aco STMix',
            row: 1,
            col: 1,
            inferredHp: 6
          }
        }
      ],
      counts: {
        confident: 0,
        likely: 0,
        ambiguous: 0,
        unmatched: 1,
        blank: 0
      }
    };
  }

  it('keeps only larger-format modules for rack analysis', () => {
    const modules = [
      null,
      moduleWithStandard(1, STANDARDS.EURORACK_3U.id),
      moduleWithStandard(2, STANDARDS.INTELLIJEL_1U.id),
      moduleWithStandard(3, STANDARDS.PULPLOGIC_1U.id),
      moduleWithStandard(4)
    ];

    expect(filterLargeFormatModules(modules).map(module => module.id)).toEqual([1, 4]);
  });

  it('derives ambiguous selection state from the selection map', () => {
    expect(isAmbiguousCandidateSelected({}, 'source', null)).toBeTrue();
    expect(ambiguousResolutionState({}, 'source')).toBe('skip');

    const resolved = {source: 42};
    expect(isAmbiguousCandidateSelected(resolved, 'source', 42)).toBeTrue();
    expect(isAmbiguousCandidateSelected(resolved, 'source', null)).toBeFalse();
    expect(ambiguousResolutionState(resolved, 'source')).toBe('resolved');
  });

  it('formats safe import helper text', () => {
    expect(importedRackName('123456789012345678901234567890123', 'Fallback'))
      .toBe('12345678901234567890123456789012');
    expect(moduleManufacturerName({manufacturer: {name: ' Make Noise '}} as MinimalModule))
      .toBe('Make Noise');
    expect(moduleManufacturerName(null)).toBe('Unknown manufacturer');
    expect(missingModulesText(unmatchedPreview())).toBe([
      'Missing ModularGrid modules for "Import Rack":',
      '- Bef Aco STMix (6 HP, row 1, column 1)'
    ].join('\n'));
  });
});
