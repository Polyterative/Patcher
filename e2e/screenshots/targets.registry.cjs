const SCREENSHOT_TARGETS_REGISTRY = [
  {id: 'home', fileName: '01-home.jpg', title: 'Home', authenticated: false, publicationGate: true},
  {id: 'modules', fileName: '02-modules.jpg', title: 'Modules', authenticated: false, publicationGate: true},
  {id: 'module-details', fileName: '03-module-details.jpg', title: 'Module details', authenticated: true, publicationGate: false},
  {id: 'patches-browser', fileName: '04-patches.jpg', title: 'Patches browser', authenticated: true, publicationGate: false},
  {id: 'patch-details', fileName: '05-patch-details.jpg', title: 'Patch details', authenticated: true, publicationGate: true},
  {id: 'racks', fileName: '06-racks.jpg', title: 'Racks', authenticated: false, publicationGate: true},
  {id: 'rack-details', fileName: '07-rack-details.jpg', title: 'Rack details', authenticated: true, publicationGate: false},
  {id: 'user-area', fileName: '08-user-area.jpg', title: 'User area', authenticated: true, publicationGate: true},
  {id: 'account', fileName: '09-account.jpg', title: 'Account', authenticated: true, publicationGate: true},
  {id: 'public-profile', fileName: '10-public-profile.jpg', title: 'Public profile', authenticated: false, publicationGate: true}
];

module.exports = {
  PUBLICATION_GATE_IDS: SCREENSHOT_TARGETS_REGISTRY
    .filter(target => target.publicationGate)
    .map(target => target.id),
  SCREENSHOT_TARGETS_REGISTRY
};
