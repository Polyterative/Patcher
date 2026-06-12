import {
  DiscoveryTipContextSnapshot,
  DiscoveryTipDefinition,
} from './discovery-tip.models';

const SNOOZE_2_DAYS  = 1000 * 60 * 60 * 24 * 2;
const SNOOZE_4_DAYS  = 1000 * 60 * 60 * 24 * 4;
const SNOOZE_5_DAYS  = 1000 * 60 * 60 * 24 * 5;
const SNOOZE_7_DAYS  = 1000 * 60 * 60 * 24 * 7;

function isOnUserArea(snapshot: DiscoveryTipContextSnapshot): boolean {
  return snapshot.currentRoute.startsWith('/user/area');
}

export const discoveryTipRegistry: DiscoveryTipDefinition[] = [
  {
    id: 'user-area-profile-private',
    version: 1,
    anchorId: 'user-area-profile-card',
    title: 'This area starts as your private workspace',
    body: 'Use it as a personal operating area first. You can organize your setup here before deciding what to share publicly.',
    reason: 'Your workspace is empty, so the first useful context is that this area is private by default.',
    placement: {preferredSide: 'below', targetKind: 'section-start'},
    guidedTourOrder: 10,
    routePrefixes: ['/user/area'],
    priority: 5,
    audience: 'signed-in',
    displayDelayMs: 1000,
    maxShowCount: 1,
    snoozeDurationMs: SNOOZE_7_DAYS,
    isEligible: (snapshot) =>
      isOnUserArea(snapshot)
      && snapshot.userArea.modulesLoaded
      && snapshot.userArea.racksLoaded
      && snapshot.userArea.patchesLoaded
      && snapshot.userArea.totalCount === 0,
  },
  {
    id: 'user-area-modules-add',
    version: 1,
    anchorId: 'user-area-modules-add',
    title: 'Start with the modules you own',
    body: 'Add your collection first. Those modules become available in rack planning and patch capture automatically.',
    reason: 'You do not have modules in your collection yet.',
    placement: {preferredSide: 'below', targetKind: 'action'},
    guidedTourOrder: 20,
    routePrefixes: ['/user/area'],
    priority: 10,
    audience: 'signed-in',
    displayDelayMs: 1200,
    maxShowCount: 2,
    snoozeDurationMs: SNOOZE_2_DAYS,
    completionActions: ['user-area.modules.add-clicked'],
    isEligible: (snapshot) =>
      isOnUserArea(snapshot)
      && snapshot.userArea.modulesLoaded
      && snapshot.userArea.modulesCount === 0,
  },
  {
    id: 'user-area-racks-create',
    version: 1,
    anchorId: 'user-area-racks-create',
    title: 'Lay out your first rack',
    body: 'Create a rack to test fit and arrangement before moving any real hardware around.',
    reason: (snapshot) => `${ snapshot.userArea.modulesCount } module${ snapshot.userArea.modulesCount === 1 ? '' : 's' } are ready, but no racks exist yet.`,
    placement: {preferredSide: 'below', targetKind: 'action'},
    guidedTourOrder: 30,
    routePrefixes: ['/user/area'],
    priority: 20,
    audience: 'signed-in',
    displayDelayMs: 900,
    maxShowCount: 2,
    snoozeDurationMs: SNOOZE_2_DAYS,
    completionActions: ['user-area.racks.create-clicked'],
    isEligible: (snapshot) =>
      isOnUserArea(snapshot)
      && snapshot.userArea.modulesLoaded
      && snapshot.userArea.racksLoaded
      && snapshot.userArea.modulesCount > 0
      && snapshot.userArea.racksCount === 0,
  },
  {
    id: 'user-area-patches-create',
    version: 1,
    anchorId: 'user-area-patches-create',
    title: 'Capture a patch while it is fresh',
    body: 'Save notes, cable routes, and settings so you can rebuild the same sound later without guesswork.',
    reason: 'You have modules saved, but no patches captured yet.',
    placement: {preferredSide: 'below', targetKind: 'action'},
    guidedTourOrder: 40,
    routePrefixes: ['/user/area'],
    priority: 30,
    audience: 'signed-in',
    displayDelayMs: 900,
    maxShowCount: 2,
    snoozeDurationMs: SNOOZE_2_DAYS,
    completionActions: ['user-area.patches.create-clicked'],
    isEligible: (snapshot) =>
      isOnUserArea(snapshot)
      && snapshot.userArea.modulesLoaded
      && snapshot.userArea.patchesLoaded
      && snapshot.userArea.modulesCount > 0
      && snapshot.userArea.patchesCount === 0,
  },
  {
    id: 'user-area-search',
    version: 1,
    anchorId: 'user-area-search',
    title: 'Search the whole workspace from here',
    body: 'This field filters your modules, racks, and patches together, which keeps larger collections fast to scan.',
    reason: (snapshot) => `Your workspace has ${ snapshot.userArea.totalCount } saved item${ snapshot.userArea.totalCount === 1 ? '' : 's' }, so global search can save scanning time.`,
    placement: {preferredSide: 'below', targetKind: 'section-start'},
    guidedTourOrder: 50,
    routePrefixes: ['/user/area'],
    priority: 40,
    audience: 'signed-in',
    displayDelayMs: 1100,
    maxShowCount: 1,
    snoozeDurationMs: SNOOZE_5_DAYS,
    completionActions: ['user-area.search-used'],
    isEligible: (snapshot) =>
      isOnUserArea(snapshot)
      && snapshot.userArea.modulesLoaded
      && snapshot.userArea.racksLoaded
      && snapshot.userArea.patchesLoaded
      && snapshot.userArea.totalCount >= 6
      && !snapshot.userArea.hasSearchQuery,
  },
  {
    id: 'user-area-modules-submit',
    version: 1,
    anchorId: 'user-area-modules-submit',
    title: 'Missing something from the library?',
    body: 'Use this button when a module is not in the catalogue yet. Contributing here keeps your own workflow moving too.',
    reason: 'You have started building a collection, so contribution shortcuts become relevant.',
    placement: {preferredSide: 'below', targetKind: 'action'},
    routePrefixes: ['/user/area'],
    priority: 45,
    audience: 'signed-in',
    displayDelayMs: 1200,
    maxShowCount: 1,
    snoozeDurationMs: SNOOZE_5_DAYS,
    isEligible: (snapshot) =>
      isOnUserArea(snapshot)
      && snapshot.userArea.modulesLoaded
      && snapshot.userArea.modulesCount >= 3
      && snapshot.userArea.modulesCount < 20,
  },
  {
    id: 'user-area-modules-section',
    version: 1,
    anchorId: 'user-area-modules-section',
    title: 'Your module collection powers the rest of the app',
    body: 'Once modules are saved here, they become the source list for rack planning, manuals, and patch capture.',
    reason: 'You have modules saved, but no rack layout yet.',
    placement: {preferredSide: 'below', targetKind: 'section-start'},
    routePrefixes: ['/user/area'],
    priority: 50,
    audience: 'signed-in',
    displayDelayMs: 1100,
    maxShowCount: 1,
    snoozeDurationMs: SNOOZE_5_DAYS,
    isEligible: (snapshot) =>
      isOnUserArea(snapshot)
      && snapshot.userArea.modulesLoaded
      && snapshot.userArea.modulesCount >= 2
      && snapshot.userArea.racksCount === 0,
  },
  {
    id: 'user-area-racks-variants',
    version: 1,
    anchorId: 'user-area-racks-create',
    title: 'Separate layouts are worth saving',
    body: 'Keep alternate racks for travel, rehearsal, or future buys instead of overwriting one layout and losing the comparison.',
    reason: 'You have one rack and enough modules that alternate layouts are likely useful.',
    placement: {preferredSide: 'below', targetKind: 'action'},
    routePrefixes: ['/user/area'],
    priority: 60,
    audience: 'signed-in',
    displayDelayMs: 1000,
    maxShowCount: 1,
    snoozeDurationMs: SNOOZE_5_DAYS,
    isEligible: (snapshot) =>
      isOnUserArea(snapshot)
      && snapshot.userArea.racksLoaded
      && snapshot.userArea.modulesCount >= 8
      && snapshot.userArea.racksCount === 1,
  },
  {
    id: 'user-area-racks-image-preview',
    version: 1,
    anchorId: 'user-area-racks-section',
    title: 'Update the rack JPEG preview after editing',
    body: 'Open the rack and refresh its JPEG preview so the image appears properly in rack lists and cards.',
    reason: 'You have saved racks, so previews now affect how quickly you recognize them.',
    placement: {preferredSide: 'below', targetKind: 'section-start'},
    routePrefixes: ['/user/area'],
    priority: 65,
    audience: 'signed-in',
    displayDelayMs: 950,
    maxShowCount: 1,
    snoozeDurationMs: SNOOZE_7_DAYS,
    isEligible: (snapshot) =>
      isOnUserArea(snapshot)
      && snapshot.userArea.racksLoaded
      && snapshot.userArea.racksCount > 0,
  },
  {
    id: 'user-area-patches-after-rack',
    version: 1,
    anchorId: 'user-area-patches-create',
    title: 'Turn a stable setup into a reusable patch note',
    body: 'Once you have a rack layout, patches become your memory layer for settings, routing choices, and performance-ready recall.',
    reason: 'You have a rack but have not captured a patch from it yet.',
    placement: {preferredSide: 'below', targetKind: 'action'},
    routePrefixes: ['/user/area'],
    priority: 70,
    audience: 'signed-in',
    displayDelayMs: 1000,
    maxShowCount: 1,
    snoozeDurationMs: SNOOZE_4_DAYS,
    isEligible: (snapshot) =>
      isOnUserArea(snapshot)
      && snapshot.userArea.racksLoaded
      && snapshot.userArea.patchesLoaded
      && snapshot.userArea.racksCount > 0
      && snapshot.userArea.patchesCount === 0,
  },
  {
    id: 'user-area-patches-recall-library',
    version: 1,
    anchorId: 'user-area-patches-section',
    title: 'Your patches are becoming a recall library',
    body: 'Once you have a few saved, use names and notes consistently so old sessions are easy to reopen under pressure.',
    reason: (snapshot) => `You have ${ snapshot.userArea.patchesCount } saved patches, so recall habits matter now.`,
    placement: {preferredSide: 'below', targetKind: 'section-start'},
    routePrefixes: ['/user/area'],
    priority: 80,
    audience: 'signed-in',
    displayDelayMs: 1000,
    maxShowCount: 1,
    snoozeDurationMs: SNOOZE_7_DAYS,
    isEligible: (snapshot) =>
      isOnUserArea(snapshot)
      && snapshot.userArea.patchesLoaded
      && snapshot.userArea.patchesCount >= 3
      && !snapshot.userArea.hasSearchQuery,
  },
  {
    id: 'user-area-stats-overview',
    version: 1,
    anchorId: 'user-area-stats',
    title: 'This sidebar gives you a quick activity snapshot',
    body: 'Use these counts as a quick health check when your workspace grows and you want to see where your library is getting richer.',
    reason: (snapshot) => `Your workspace has ${ snapshot.userArea.totalCount } saved item${ snapshot.userArea.totalCount === 1 ? '' : 's' } across the user area.`,
    placement: {preferredSide: 'below', targetKind: 'section-start'},
    guidedTourOrder: 60,
    routePrefixes: ['/user/area'],
    priority: 90,
    audience: 'signed-in',
    displayDelayMs: 950,
    maxShowCount: 1,
    snoozeDurationMs: SNOOZE_7_DAYS,
    isEligible: (snapshot) =>
      isOnUserArea(snapshot)
      && snapshot.userArea.totalCount >= 3,
  },
  {
    id: 'user-area-manuals-shortcut',
    version: 1,
    anchorId: 'user-area-manuals',
    title: 'Manuals gather here automatically',
    body: 'As your module collection fills out, this area becomes a fast shortcut back to documentation without leaving your workspace.',
    reason: 'At least two manuals are available from your module collection.',
    placement: {preferredSide: 'below', targetKind: 'section-start'},
    routePrefixes: ['/user/area'],
    priority: 100,
    audience: 'signed-in',
    displayDelayMs: 900,
    maxShowCount: 1,
    snoozeDurationMs: SNOOZE_7_DAYS,
    isEligible: (snapshot) =>
      isOnUserArea(snapshot)
      && snapshot.userArea.manualsLoaded
      && snapshot.userArea.manualsCount >= 2,
  },
  {
    id: 'user-area-comments-history',
    version: 1,
    anchorId: 'user-area-comments',
    title: 'Your comments stay visible here for follow-up',
    body: 'This is useful for checking earlier questions, feedback, and context you have already left around the site.',
    reason: 'You have comment history available in your workspace.',
    placement: {preferredSide: 'below', targetKind: 'section-start'},
    routePrefixes: ['/user/area'],
    priority: 110,
    audience: 'signed-in',
    displayDelayMs: 900,
    maxShowCount: 1,
    snoozeDurationMs: SNOOZE_7_DAYS,
    isEligible: (snapshot) =>
      isOnUserArea(snapshot)
      && snapshot.userArea.commentsLoaded
      && snapshot.userArea.commentsCount > 0,
  },
  {
    id: 'user-area-search-large-workspace',
    version: 1,
    anchorId: 'user-area-search',
    title: 'Search gets more valuable as the workspace grows',
    body: 'Once your collection is larger, this field is the fastest way to narrow modules, racks, and patches in one move.',
    reason: (snapshot) => `You have ${ snapshot.userArea.totalCount } saved items and no active search filter.`,
    placement: {preferredSide: 'below', targetKind: 'section-start'},
    routePrefixes: ['/user/area'],
    priority: 120,
    audience: 'signed-in',
    displayDelayMs: 950,
    maxShowCount: 1,
    snoozeDurationMs: SNOOZE_7_DAYS,
    isEligible: (snapshot) =>
      isOnUserArea(snapshot)
      && snapshot.userArea.modulesLoaded
      && snapshot.userArea.racksLoaded
      && snapshot.userArea.patchesLoaded
      && snapshot.userArea.totalCount >= 12
      && !snapshot.userArea.hasSearchQuery,
  },
  {
    id: 'user-area-racks-planning-before-buying',
    version: 1,
    anchorId: 'user-area-racks-create',
    title: 'Use racks to test ideas before buying or moving gear',
    body: 'Planning here first is cheaper than reshuffling hardware and discovering the layout is wrong after the fact.',
    reason: (snapshot) => `You have ${ snapshot.userArea.modulesCount } modules but no rack layout to test them in.`,
    placement: {preferredSide: 'below', targetKind: 'action'},
    routePrefixes: ['/user/area'],
    priority: 130,
    audience: 'signed-in',
    displayDelayMs: 950,
    maxShowCount: 1,
    snoozeDurationMs: SNOOZE_7_DAYS,
    isEligible: (snapshot) =>
      isOnUserArea(snapshot)
      && snapshot.userArea.modulesLoaded
      && snapshot.userArea.modulesCount >= 10
      && snapshot.userArea.racksCount === 0,
  }
];
