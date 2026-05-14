# Acceptance Checklist

## Initial Render Flash — Headless Audit

- [ ] Audit `*ngIf`/`@if` guards on affected route templates for false→true→false→true flip patterns
- [ ] Audit `async` pipes feeding route templates for double-emission (BehaviorSubject init + late real value)
- [ ] Check router data flow for double emissions on navigation (ActivatedRoute.params/paramMap pipelines)
- [ ] Check loading/skeleton state logic across affected templates
- [ ] Check `@font-face` / FOUT handling in styles
- [ ] Findings documented in CURRENT_FEATURE.md with root cause + proposed fix
- [ ] Minimal fix implemented (if headless analysis reveals actionable items)
- [ ] `pnpm build` green
- [ ] `pnpm test-headless` green (targeted)
