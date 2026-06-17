#### MEDIUM: Module tags — colour lookup coherence

**Why:** Module tag colours now appear across multiple surfaces: the module details tag suggestions, rack editor function analysis overlays, rack editor legends / row summaries, and description keyword highlights. The local functional lookup is close, but it is inconsistent with the current online tag taxonomy and misses several database tags. That makes some tags visually neutral when they should be functional, and risks different surfaces drifting apart.

**Design strategy:**

- Keep the existing five functional colour roles as the canonical vocabulary:
  - `voices` — blue: signal generation and instrument voices.
  - `modulation` — purple: CV, movement, control over time.
  - `utilities` — green: routing, infrastructure, glue.
  - `timing` — amber: clocks, rhythm, sequencing, event structure.
  - `tone` — red: filters, FX, timbral processing, spatial / shaping roles.
- Do not add colours for `Nature` or `Character` tags. Tags like Analog, Digital, Warm, Vintage, Experimental, and MIDI describe technology or character, not signal-chain function. They should remain neutral so colour keeps semantic weight.
- Treat `RACK_BALANCE_AXES` as the single source of truth for tag-to-role classification. Rack overlays, legends, row summaries, details, tag tinting, and description keyword highlighting should all derive from it rather than maintaining parallel local maps.
- Preserve the current palette hues. The primary issue is incomplete mapping and inconsistent consumption, not the five base colours.

**Lookup updates to make:**

| Role | Add / align DB tags |
|---|---|
| `voices` | `BASS`, `CLAP`, `HAT`, `KICK`, `LEAD`, `PAD`, `PERC`, `SNARE` |
| `timing` | `Arpeggiator`, `Euclidean`, `Clock IN`, `Clock OUT` |
| `utilities` | `Blank`, `Sequencial Switch` |
| `tone` | Keep filter / effect tags plus spatial or processing utilities such as `Pan`, `Ring Mod`, `Stereo` |
| neutral | Keep `Nature` and `Character` groups uncoloured |

**Implementation notes:**

- Update `src/app/components/rack-parts/rack-balance-analysis.constants.ts` so the `dbTagNames` lists reflect the current DB tag universe.
- Keep colour tokens in `src/app/components/rack-parts/_function-analysis-theme.scss`.
- Ensure module-details description keyword highlighting uses the same axis definitions as rack function analysis, not an independent interpretation.
- If tag-chip tinting is too faint in details, adjust the shared role tint/opacity path without changing the rack overlay palette.
- Do not run schema changes or RLS changes for this task. This is a local lookup / UI coherence fix.

**Checklist:**

- [ ] Add missing DB tags to the relevant `RACK_BALANCE_AXES.dbTagNames`.
- [ ] Confirm no separate tag-to-colour lookup remains for module details, rack editor, or description highlighting.
- [ ] Align description keyword highlighting with the same role axis data.
- [ ] Keep Nature / Character tags visually neutral.
- [ ] Add unit coverage for `Clock IN`, `Clock OUT`, `Arpeggiator`, `Euclidean`, `Blank`, `Sequencial Switch`, and Voice instrument tags.
- [ ] Add a regression test proving details highlighting and rack function classification agree for shared functional tags.
- [ ] Run targeted `pnpm test-headless` for touched specs, then `pnpm lint`.

---

## Decision log

- 2026-06-17: Plan created from screenshot + read-only Supabase tag query. Decision: preserve five role colours, fix local lookup coverage, and keep role axis constants as the single source of truth.
