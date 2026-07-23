const {
  SCREENSHOT_TARGETS_REGISTRY
} = require('./targets.registry.cjs');

function captureTitleForTarget(target) {
  return `captures ${ target.title }`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function resolveScreenshotTarget(targetId) {
  return SCREENSHOT_TARGETS_REGISTRY.find(target => target.id === targetId);
}

function buildTargetGrep(target) {
  return `^${ escapeRegExp(captureTitleForTarget(target)) }$`;
}

function knownTargetIds() {
  return SCREENSHOT_TARGETS_REGISTRY.map(target => target.id);
}

module.exports = {
  buildTargetGrep,
  captureTitleForTarget,
  knownTargetIds,
  resolveScreenshotTarget
};
