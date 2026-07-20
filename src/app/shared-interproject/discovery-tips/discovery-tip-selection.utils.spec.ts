import {
  defaultDiscoveryTipUserAreaSnapshot,
  DiscoveryTipContextSnapshot,
  DiscoveryTipDefinition,
  DiscoveryTipViewerState
} from './discovery-tip.models';
import {
  discoveryTipsMatchingAction,
  findAutomaticDiscoveryTipCandidate,
  isWithinAutomaticDiscoveryTipSpacing,
  shouldKeepAutomaticDiscoveryTip,
  shouldKeepGuidedDiscoveryTip
} from './discovery-tip-selection.utils';

describe('discovery tip selection utils', () => {
  const nowMs = new Date('2026-06-17T15:00:00.000Z').getTime();
  const snapshot: DiscoveryTipContextSnapshot = {
    currentRoute: '/user/area',
    isLoggedIn: true,
    viewerKey: 'user-123',
    sessionActions: {},
    userArea: defaultDiscoveryTipUserAreaSnapshot
  };

  function tip(overrides: Partial<DiscoveryTipDefinition> = {}): DiscoveryTipDefinition {
    return {
      id: 'test-tip',
      version: 1,
      anchorId: 'test-anchor',
      title: 'Test tip',
      body: 'Test body',
      routePrefixes: ['/user/area'],
      priority: 10,
      audience: 'signed-in',
      introducedAt: '2026-06-17T00:00:00.000Z',
      maxShowCount: 1,
      isEligible: () => true,
      ...overrides
    };
  }

  function viewerState(tips: DiscoveryTipViewerState['tips'] = {}): DiscoveryTipViewerState {
    return {
      onboardingAt: '2026-06-17T00:00:00.000Z',
      tips
    };
  }

  it('selects the lowest-priority eligible automatic tip', () => {
    const laterTip = tip({id: 'later-tip', priority: 20, anchorId: 'later-anchor'});
    const firstTip = tip({id: 'first-tip', priority: 5, anchorId: 'first-anchor'});

    const candidate = findAutomaticDiscoveryTipCandidate({
      definitions: [laterTip, firstTip],
      snapshot,
      anchorIds: new Set(['later-anchor', 'first-anchor']),
      viewerState: viewerState(),
      nowMs
    });

    expect(candidate?.id).toBe('first-tip');
  });

  it('rejects automatic tips that have already reached their show limit', () => {
    const definition = tip({maxShowCount: 2});

    expect(shouldKeepAutomaticDiscoveryTip(definition, {
      definitions: [definition],
      snapshot,
      anchorIds: new Set(['test-anchor']),
      viewerState: viewerState({
        'test-tip': {
          version: 1,
          shownCount: 2
        }
      }),
      nowMs
    })).toBeTrue();

    expect(findAutomaticDiscoveryTipCandidate({
      definitions: [definition],
      snapshot,
      anchorIds: new Set(['test-anchor']),
      viewerState: viewerState({
        'test-tip': {
          version: 1,
          shownCount: 2
        }
      }),
      nowMs
    })).toBeNull();
  });

  it('keeps guided tips based only on route and anchor availability', () => {
    const definition = tip({guidedTourOrder: 10});

    expect(shouldKeepGuidedDiscoveryTip(definition, {
      definitions: [definition],
      snapshot,
      anchorIds: new Set(['test-anchor']),
      viewerState: viewerState({
        'test-tip': {
          version: 1,
          shownCount: 1,
          learnedAt: '2026-06-17T12:00:00.000Z'
        }
      }),
      nowMs
    })).toBeTrue();
  });

  it('matches completion actions and automatic spacing windows', () => {
    const matchingTip = tip({
      id: 'matching-tip',
      completionActions: ['user-area.modules.add-clicked']
    });
    const unrelatedTip = tip({
      id: 'unrelated-tip',
      completionActions: ['user-area.racks.create-clicked']
    });

    expect(discoveryTipsMatchingAction(
      [matchingTip, unrelatedTip],
      'user-area.modules.add-clicked'
    )).toEqual([matchingTip]);
    expect(isWithinAutomaticDiscoveryTipSpacing(matchingTip, {
      onboardingAt: '2026-06-17T00:00:00.000Z',
      lastTipShownAt: new Date(nowMs - 100).toISOString(),
      tips: {}
    }, nowMs)).toBeTrue();
  });
});
