#!/usr/bin/env node
/**
 * Safe Sentry triage readiness check.
 *
 * This script intentionally makes no network calls and never prints secret values.
 */

const required = ['SENTRY_ORG', 'SENTRY_PROJECT'];
const optionalSecret = 'SENTRY_AUTH_TOKEN';

const missing = required.filter((name) => !process.env[name]);
const hasToken = Boolean(process.env[optionalSecret]);

console.log('[sentry-triage] Safe readiness check: no network calls were made.');

if (missing.length > 0) {
    console.log(`[sentry-triage] Missing required environment variables: ${missing.join(', ')}`);
} else {
    console.log('[sentry-triage] Required organization/project environment variables are present.');
}

console.log(
    hasToken
        ? '[sentry-triage] SENTRY_AUTH_TOKEN is present (value hidden).'
        : '[sentry-triage] SENTRY_AUTH_TOKEN is not set; live CLI/API fallback access may be unavailable.'
);

console.log('');
console.log('[sentry-triage] Preferred live path: use the Sentry MCP when available.');
console.log('[sentry-triage] CLI fallback shape, with values kept in the environment:');
console.log('  sentry-cli issues list --org "$SENTRY_ORG" --project "$SENTRY_PROJECT" --query "is:unresolved" --limit 25');
console.log('[sentry-triage] API fallback shape, with token kept in the environment:');
console.log('  curl -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" "https://sentry.io/api/0/projects/$SENTRY_ORG/$SENTRY_PROJECT/issues/?query=is%3Aunresolved&limit=25"');

if (missing.length > 0 || !hasToken) {
    console.log('');
    console.log('[sentry-triage] Live issue audit should remain on hold until safe Sentry access is available.');
}
