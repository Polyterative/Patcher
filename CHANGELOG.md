# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [6.7.17](https://github.com/Polyterative/Patcher/compare/v6.7.16...v6.7.17) (2026-08-29)


### Bug Fixes

* **rack-creator:** bind [checked] directly so toggles render correctly when CVA writeValue fails ([4050309](https://github.com/Polyterative/Patcher/commit/40503096ed777d5043325b4a2ab95ed2ee890aba))

### [6.7.16](https://github.com/Polyterative/Patcher/compare/v6.7.15...v6.7.16) (2026-08-29)


### Bug Fixes

* **rack-creator:** drop stale-value guard so toggle change handlers always sync FormControl ([e6576e7](https://github.com/Polyterative/Patcher/commit/e6576e7c4a64278358f764fe4541c6af32ca6680))

### [6.7.15](https://github.com/Polyterative/Patcher/compare/v6.7.14...v6.7.15) (2026-08-29)


### Bug Fixes

* **rack-creator:** drive toggle controls from (change) event to bypass unreliable CVA link ([017b7c7](https://github.com/Polyterative/Patcher/commit/017b7c779b23f0528450d1cdfa03e78310541b7a))

### [6.7.14](https://github.com/Polyterative/Patcher/compare/v6.7.13...v6.7.14) (2026-08-29)


### Bug Fixes

* **docs:** repair workflow links for ci lint ([a21776e](https://github.com/Polyterative/Patcher/commit/a21776ead51c2f896a76c634b719d5f988399aa4))

### [6.7.13](https://github.com/Polyterative/Patcher/compare/v6.7.12...v6.7.13) (2026-08-29)


### Features

* **rack-creator:** enable modulargrid import in production ([d5c6816](https://github.com/Polyterative/Patcher/commit/d5c6816a0012e91eea002656afe6afe8afd2e813))

### [6.7.12](https://github.com/Polyterative/Patcher/compare/v6.7.11...v6.7.12) (2026-08-29)

### [6.7.11](https://github.com/Polyterative/Patcher/compare/v6.7.9...v6.7.11) (2026-08-26)


### Bug Fixes

* **auth:** honor returnUrl for authenticated login arrivals ([860917f](https://github.com/Polyterative/Patcher/commit/860917f33cb09e800b9258172a2083ff18d0ca17))
* **e2e:** protect runner during port cleanup ([112fb47](https://github.com/Polyterative/Patcher/commit/112fb47f33cc4fc7e01ec9417efec129e24fe5a6))
* **module-image:** render failed panel image state ([908332a](https://github.com/Polyterative/Patcher/commit/908332a7b881c2a0d5d94f7651b16b9202b32d49))
* **modules:** preserve port signal metadata ([e6e1f45](https://github.com/Polyterative/Patcher/commit/e6e1f45660c061857132d3b1a0bda1d9462a4431))
* **modules:** serialize collection writes ([2715c66](https://github.com/Polyterative/Patcher/commit/2715c66a308c2dfde82ead65f476397c5765a8fb))
* **patches:** explain missing module ports ([076ae48](https://github.com/Polyterative/Patcher/commit/076ae487289bfeb9639ea081217610d36eab3298))
* **racks:** surface modulargrid import warnings ([1233992](https://github.com/Polyterative/Patcher/commit/1233992be4211dcffeb6f9b1e9220a724cc8daea))

### [6.7.10](https://github.com/Polyterative/Patcher/compare/v6.7.9...v6.7.10) (2026-08-26)

### [6.7.9](https://github.com/Polyterative/Patcher/compare/v6.7.8...v6.7.9) (2026-08-25)


### Features

* **price-hub:** add 12 new approved store crawler configs ([a218cd9](https://github.com/Polyterative/Patcher/commit/a218cd92a8720bccaf88ee8a5d36684e7d27ae28))


### Bug Fixes

* **module-browser:** persist quick-add collection changes ([5c4cd2e](https://github.com/Polyterative/Patcher/commit/5c4cd2e561d128a0772b74068037a65dac363170))
* prevent e2e test runs from hanging on teardown ([056b7c8](https://github.com/Polyterative/Patcher/commit/056b7c80ef1574ecba98ad584224e127794bc41e))
* **rack:** guard depth/weight totals against undefined to stop NaN stats ([a020b9c](https://github.com/Polyterative/Patcher/commit/a020b9c4ba860cb741501f3ce0b495e30e282ab9))
* **rack:** join standard in currentUserModules so 1U modules keep proportions in racks ([ff9e71b](https://github.com/Polyterative/Patcher/commit/ff9e71b8786e48255d1453e9a55cbcd2f857df31))
* **rack:** select weight/depth/power in currentUserModules so added modules keep full stats ([3def553](https://github.com/Polyterative/Patcher/commit/3def553e055c883a75bad883d0449a7ca1c0b113))
* **racks:** restore ModularGrid catalogue matching ([f70572e](https://github.com/Polyterative/Patcher/commit/f70572e87ed400adbbe92bc6ccf8f74cb8eaa09a))
* **racks:** retain contextual add selection ([4c108f1](https://github.com/Polyterative/Patcher/commit/4c108f1fbf92091c1b99844f79fd30bf00a0cf08))

### [6.7.8](https://github.com/Polyterative/Patcher/compare/v6.7.7...v6.7.8) (2026-08-25)


### Bug Fixes

* **auth:** surface password update errors ([f11cc29](https://github.com/Polyterative/Patcher/commit/f11cc29f35f74be78fd39d29a7786304ba4c13c9))

### [6.7.7](https://github.com/Polyterative/Patcher/compare/v6.7.6...v6.7.7) (2026-08-24)


### Features

* **module-detail:** separate manufacturer-owned store links from retailers ([7f80af6](https://github.com/Polyterative/Patcher/commit/7f80af654533ecab4090d1395b17f12e82845f03))


### Bug Fixes

* **account:** allow retry after destructive action failures ([0d49cfa](https://github.com/Polyterative/Patcher/commit/0d49cfa87e3bb392de33c29d8b7658f2471b2757))
* **auth:** gate oauth navigation on callback success ([b5795d3](https://github.com/Polyterative/Patcher/commit/b5795d3a03ef5ee55446feab7931a29e434d0c04))
* **auth:** preserve verified recovery sessions across reloads ([083b549](https://github.com/Polyterative/Patcher/commit/083b549a4e5d11cc79c261e401a13325e012230a))
* **auth:** restore login and reset request retries ([dc6afca](https://github.com/Polyterative/Patcher/commit/dc6afca6bb50d3fdfc9e5828776b49da13bca312))
* **auth:** settle failed oauth callbacks ([83227c2](https://github.com/Polyterative/Patcher/commit/83227c2c56ba98dedf8699a6379338fdab038c42))
* **database:** reconcile acquisitions and module io sequences ([797f0c3](https://github.com/Polyterative/Patcher/commit/797f0c37873384ad8f7846185f79fbe4a42fc984))
* **e2e:** wait for profile visibility controls ([dbc396a](https://github.com/Polyterative/Patcher/commit/dbc396af7919450fe57a14c18e9aecd96402b09c))
* **manufacturers:** default to list and group panels ([1b03b54](https://github.com/Polyterative/Patcher/commit/1b03b541419f19c5cda651d6a8d53b57143ed977))
* **module-list:** align view toggle with controls ([6a0dc8c](https://github.com/Polyterative/Patcher/commit/6a0dc8c5d7a24f7bfc21740a0920f88814c0faae))

### [6.7.6](https://github.com/Polyterative/Patcher/compare/v6.7.5...v6.7.6) (2026-08-23)


### Bug Fixes

* **auth:** verify password recovery token only in browser so ssr stops consuming it ([8fffb74](https://github.com/Polyterative/Patcher/commit/8fffb74163a522641ca4614691cb0f645045e773))

### [6.7.5](https://github.com/Polyterative/Patcher/compare/v6.7.4...v6.7.5) (2026-08-23)


### Bug Fixes

* **vercel:** deploy merged changes from release commits ([09811a2](https://github.com/Polyterative/Patcher/commit/09811a23507d7ab4f2b3ce2f178325093d076218))

### [6.7.4](https://github.com/Polyterative/Patcher/compare/v6.7.3...v6.7.4) (2026-08-23)


### Features

* **module-browser:** add one-tap add-to-collection button on browse results ([fe631fd](https://github.com/Polyterative/Patcher/commit/fe631fd637b6cdf54b01f521cbafc184e8f2bda2))


### Bug Fixes

* **mat-form-entity:** commit autocomplete selections reliably ([d8a8c04](https://github.com/Polyterative/Patcher/commit/d8a8c047014fd10ffccee63498904b2e6467d8ef))
* **module-part-image:** show honest empty state when no panel image is uploaded yet ([5e49f68](https://github.com/Polyterative/Patcher/commit/5e49f689165dc563f6b26368489f50aac531d9f9))

### [6.7.3](https://github.com/Polyterative/Patcher/compare/v6.7.2...v6.7.3) (2026-08-23)


### Bug Fixes

* **module-browser:** block fetch while manufacturer autocomplete is unreconciled ([8845b83](https://github.com/Polyterative/Patcher/commit/8845b835a42b64e2dccc8720eb429cd740dfb6cf))

### [6.7.2](https://github.com/Polyterative/Patcher/compare/v6.7.1...v6.7.2) (2026-08-23)


### Bug Fixes

* **filters:** keep filter sidebar clear of sticky toolbar on scroll ([5b73bfc](https://github.com/Polyterative/Patcher/commit/5b73bfc019cf4b7244ef4f8375b3787e6cf3a70c))

### [6.7.1](https://github.com/Polyterative/Patcher/compare/v6.7.0...v6.7.1) (2026-08-23)


### Features

* **module-editor:** let admins overwrite existing panel types on save ([5a8c8dc](https://github.com/Polyterative/Patcher/commit/5a8c8dc498946d44b175040fb720c521ea53b97d))


### Bug Fixes

* **manufacturer-row:** force list mode in embedded module detail context ([7aefb8d](https://github.com/Polyterative/Patcher/commit/7aefb8d5591620d72276b39054e5837980272dff))
* **mat-form-entity:** correct vertical alignment of label icons ([7e6e000](https://github.com/Polyterative/Patcher/commit/7e6e0006b0d018d4d75f8d347cdab4ee63231b7f))
* **mat-form-entity:** resolve stray typed autocomplete strings on blur ([65e8859](https://github.com/Polyterative/Patcher/commit/65e88595d8a6b2baa660752eff72c4482b786225))
* **toolbar:** replace account name with My library label ([1084534](https://github.com/Polyterative/Patcher/commit/1084534398420ffabfe9c169681291e540aeb79d))
* **toolbar:** swap account name and account button order in top nav ([935324e](https://github.com/Polyterative/Patcher/commit/935324eb371ccd43137dfdb2e52bb03d89007847))
* **vercel:** declare local process type in sitemap function to avoid types/node resolution failure ([87cd4c2](https://github.com/Polyterative/Patcher/commit/87cd4c2a3369e30d7c44093abe04b4d8f4fb09ad))
* **vercel:** declare local process type in sitemap function to avoid types/node resolution failure ([80925d4](https://github.com/Polyterative/Patcher/commit/80925d4192e45d83e460db8421ac1c40d8020a03))

## [6.7.0](https://github.com/Polyterative/Patcher/compare/v6.6.0...v6.7.0) (2026-08-20)


### Features

* **manufacturers:** add panel wall view mode for module discovery ([bdc2699](https://github.com/Polyterative/Patcher/commit/bdc269970d88394e725f964e67df0c278ba9c65d))
* **price-hub:** add change-only snapshot write planner with floating endpoints ([4f549fd](https://github.com/Polyterative/Patcher/commit/4f549fd8396cf77665622bc6b0e28cacd98aac34))
* **price-hub:** add listing last_raw_meta column and latest-snapshots rpc ([2f51e3d](https://github.com/Polyterative/Patcher/commit/2f51e3d0a84272ccb14fc5f00e27b368be340915))
* **price-hub:** add raw_meta jsonl archive script for backfill ([6cad431](https://github.com/Polyterative/Patcher/commit/6cad431feff13e54514a0b222c8b0237d7dbaeb7))
* **price-hub:** write change-only snapshot segments from importer and edge worker ([7b921f8](https://github.com/Polyterative/Patcher/commit/7b921f8531bc6ddaf35df3deaf223455fc675765))


### Bug Fixes

* **price-hub:** drop curl compression flag tripping Shopify Cloudflare challenges ([208e440](https://github.com/Polyterative/Patcher/commit/208e440e040fd7d769b3ee08e01dd9dc79c78601))
* **ssr:** close the chained-fetch gap causing intermittent wrong rack/patch titles ([a15ced3](https://github.com/Polyterative/Patcher/commit/a15ced313e5a88c7c7f3f038f71c544a16aa6e61))
* **ssr:** make supabase data reliably visible to crawlers before render ([0fed72a](https://github.com/Polyterative/Patcher/commit/0fed72aaa07bdb44641179b2e6961968ee848382))
* **ssr:** reconcile rack/patch unavailable-message wording with settled auth state ([ad1cb3b](https://github.com/Polyterative/Patcher/commit/ad1cb3b3f0fb65d05db2b1934981cdaa4216b3ad))
* **ssr:** stop gating rack/patch detail data load on loggedUser$ ([ac50986](https://github.com/Polyterative/Patcher/commit/ac50986132688ab0878f088bc49943d98e1fa5b3))
* **ssr:** turn legacy patch/rack id redirects into real HTTP redirects ([8f234aa](https://github.com/Polyterative/Patcher/commit/8f234aa75deed6c3738e47afe8ed453a40d8620d))

## [6.6.0](https://github.com/Polyterative/Patcher/compare/v6.5.2...v6.6.0) (2026-08-17)


### Features

* **home:** sharpen community trends copy with social proof framing ([4f2e6aa](https://github.com/Polyterative/Patcher/commit/4f2e6aa9c20a68c62c7b2759a9cc41d6b74bad18))
* **public-api:** add account key controls ([7432e5c](https://github.com/Polyterative/Patcher/commit/7432e5c5c3832b393fee19f6a1da45fca8a2c9f6))
* **public-api:** add durable quota counter ([5ee707b](https://github.com/Polyterative/Patcher/commit/5ee707bb7b23bfaed9364b75c4edce00067b757e))
* **public-api:** add local backend migrations ([ecc944b](https://github.com/Polyterative/Patcher/commit/ecc944b650b69bcd959e199eabbd3f01098a55b9))
* **public-api:** add stable credential rotation ([282465a](https://github.com/Polyterative/Patcher/commit/282465a1b3c8d9b149df694657acb5ca92b0289c))
* **public-api:** add worker foundation ([1e81509](https://github.com/Polyterative/Patcher/commit/1e81509c5e850f0d24a302d6f6c484a835db98d9))
* **public-api:** enable production key controls ([3d93334](https://github.com/Polyterative/Patcher/commit/3d933348fbe63d050ac87528cefbbf9cc8ba87b5))
* **public-api:** enforce key quotas in worker ([cccf958](https://github.com/Polyterative/Patcher/commit/cccf9581fc65153c99cca31b98d4f55202ac34cd))
* **public-api:** serve cached catalogue endpoints ([eac7b5a](https://github.com/Polyterative/Patcher/commit/eac7b5a3acc864c6bdd17f506063289def405726))


### Bug Fixes

* **a11y:** make password-toggle aria-label and tooltip dynamic in mat-form-entity ([956cb83](https://github.com/Polyterative/Patcher/commit/956cb83dab476ef5e34ee18e7eeb72334ee340f1))
* **admin-panel:** remove unused direct SupabaseService/MatSnackBar injections ([2263af6](https://github.com/Polyterative/Patcher/commit/2263af6453b9d6a74d070fe0c6ef23a79413e2c1))
* **api:** simplify public api credential panel ([96b50b3](https://github.com/Polyterative/Patcher/commit/96b50b3288b765a0e64de73264f93b873d6bb53e))
* **backbone-event-banner:** use local-midnight dates and guard localStorage access ([e7458bf](https://github.com/Polyterative/Patcher/commit/e7458bfff8285bbd1531d346ca1fa264630b75ae))
* **backbone-home:** tie hero patch-load timer to SubManager teardown ([d39fc25](https://github.com/Polyterative/Patcher/commit/d39fc2534ca4be4d07709b302dd50e586ba055f4))
* **backend:** bust module cache after panel delete ([8cf2319](https://github.com/Polyterative/Patcher/commit/8cf2319089ae51fd407c321b03313bb665a9a2ec))
* **backend:** bust module-flag cache on submit/resolve/delete ([8ad2fd5](https://github.com/Polyterative/Patcher/commit/8ad2fd52596e454592c4d91825664c3933cf266c))
* **backend:** guard null user and surface supabase errors before success ([d27ba02](https://github.com/Polyterative/Patcher/commit/d27ba0296980ed287e3a61ec552a38e1ba8f03be))
* **backend:** restore missing rack-description search and collection-tags fields ([34c85f2](https://github.com/Polyterative/Patcher/commit/34c85f27b6f94613f452c7df32135143391d0f75))
* **backend:** surface and recover from previously-silent mutation failures ([d19133f](https://github.com/Polyterative/Patcher/commit/d19133fb1cd6dc3dedca979f36888dcfc4716590))
* **brand-primary-button:** gate routerLink and click on disabled/error state ([4ac12c0](https://github.com/Polyterative/Patcher/commit/4ac12c04368cd11bf8c500d8b106432916193358))
* **browser-data:** canReset$ now detects sort-direction-only changes ([d14a818](https://github.com/Polyterative/Patcher/commit/d14a818f405c4afddfd4a65971e7125af3c8fe33))
* **check-posthog-imports:** match double-quoted requires too ([ac3510e](https://github.com/Polyterative/Patcher/commit/ac3510eb062b67d91f01bea80c537471e45a3666))
* **check-px-ts:** catch fractional/negative px values, fix BSD grep portability ([9aa3e63](https://github.com/Polyterative/Patcher/commit/9aa3e63c044aa18be8cdf001c0139e54c1d15a8e))
* **comments:** replace hardcoded light-mode colors with Material system tokens ([ca9b6ad](https://github.com/Polyterative/Patcher/commit/ca9b6ad77e6ab7b498abb883882916b68fa17991)), closes [ffffff/#f8](https://github.com/ffffff/Patcher/issues/f8) [#f8](https://github.com/Polyterative/Patcher/issues/f8)
* **confirm-dialog:** remove static theme overriding dynamic positive theme binding ([9047cf8](https://github.com/Polyterative/Patcher/commit/9047cf883beefc062f948706464d6502dd00e528))
* **deps:** apply babel/esbuild security overrides to lockfile ([0371d83](https://github.com/Polyterative/Patcher/commit/0371d838a091731383b4285e75d3fbb0ba17370e))
* **deps:** reconcile lockfile overrides with pnpm-workspace.yaml ([217e52c](https://github.com/Polyterative/Patcher/commit/217e52c38a5ac44836aa0e099f59ef7acf5a20c1))
* **develop:** resolve merge regressions from bug-hunt fixes ([870a970](https://github.com/Polyterative/Patcher/commit/870a9705611a158c3847abbd8ea18d6b4d631e96))
* **e2e-auth-monkey:** use ControlOrMeta+A instead of Meta+A for cross-platform select-all ([83713c4](https://github.com/Polyterative/Patcher/commit/83713c4448b8360bf7a93311a423df5181a85e7b))
* **e2e-module-create-safety:** resolve e2e dir from script location, not cwd ([58d3c5f](https://github.com/Polyterative/Patcher/commit/58d3c5fc8b871020066031d17e7e8dfeb69beb33))
* **e2e:** call correctly typed helper in owned-first docs patch path ([442526b](https://github.com/Polyterative/Patcher/commit/442526bbb86b951ab9f70e1aed8d9e5777b10352))
* **e2e:** redact real personal email address in docs screenshots ([cdfe612](https://github.com/Polyterative/Patcher/commit/cdfe612a870d5202a8b03b865505ba5e5d8fee0e))
* **e2e:** repair user-area docs screenshot sanitisation bugs ([71e1221](https://github.com/Polyterative/Patcher/commit/71e122139df676f587e78f6b5eb2ef7ce0adde91))
* **e2e:** scope user-area title-sub read to avoid corrupting unrelated pages ([e0a23fa](https://github.com/Polyterative/Patcher/commit/e0a23fa35120038114e07ef08d1ff42cef0b792c))
* **e2e:** select screenshot targets by test match ([ec53685](https://github.com/Polyterative/Patcher/commit/ec5368545ea6a035565bd050b93f3f82359d7b81))
* **home:** ensure community trends mode tabs meet 44px touch target on mobile ([fff7438](https://github.com/Polyterative/Patcher/commit/fff743801bdb3dcd496e80523858c53a8ef9f1be))
* **is-control-valid-pipe:** react to statusChanges, not just valueChanges ([330bfe6](https://github.com/Polyterative/Patcher/commit/330bfe6277cca360323c7bf37a0f06720aeb2796))
* **list-link-router:** null out href for disabled absolute links ([27402a7](https://github.com/Polyterative/Patcher/commit/27402a7c7f74a86c268289c9d1cbb3cfa286db5e))
* **local-data-filter:** type orderEvent$ as ISelectable instead of string ([81725d8](https://github.com/Polyterative/Patcher/commit/81725d80566ca8a052707d99022ef7a775981719))
* **marketplace:** sign browser listing media ([b8aa2f2](https://github.com/Polyterative/Patcher/commit/b8aa2f2c890642574238ba4d2b6a0c49c54abc50))
* **marketplace:** sign private listing media ([5593aeb](https://github.com/Polyterative/Patcher/commit/5593aebafb06d01a3071f3b7794867b13856ebe1))
* **mat-form-entity:** call super.ngOnDestroy and revalidate after setValidators ([8f4466d](https://github.com/Polyterative/Patcher/commit/8f4466ddc0de8032dfa0776f79ef23647edafc9b))
* **module-adder-data:** tie post-submit navigation timer to service teardown ([14b3eea](https://github.com/Polyterative/Patcher/commit/14b3eea2736862ed200828cb3aa511678fcd795b))
* **module-browser-data:** base load-more offset on raw fetched count, not filtered list length ([c751122](https://github.com/Polyterative/Patcher/commit/c7511228553ea7b09fbf1f7841e2655345455eb1))
* **module-browser-detail:** tie route.params subscription to component teardown ([1bbbb41](https://github.com/Polyterative/Patcher/commit/1bbbb41905a2e0b5e757922bfa5c10a64547d242))
* **module-browser:** reset server-side filter state before tagMatchMode$.next() in resetForm$ ([a58acb4](https://github.com/Polyterative/Patcher/commit/a58acb44645d6c56381b7871759b2abf6622da1c))
* **module-collections:** reload public detail view via load$, not owned-only path ([d23da36](https://github.com/Polyterative/Patcher/commit/d23da36e2bb4bf2bfd27f44323f3598d21c76e97))
* **module-cv-flag:** clamp centerHz alongside lowHz/highHz ([5ef21bb](https://github.com/Polyterative/Patcher/commit/5ef21bb56bce12974a6fe8e0312cdbe04cb6dff5))
* **module-details:** guard against undefined switches/panels/manufacturer ([41e464c](https://github.com/Polyterative/Patcher/commit/41e464cf19899a75d0882940456e5b9fdec550e9))
* **module-parts:** swap Fit/Fill handlers and show switches count ([d3ab059](https://github.com/Polyterative/Patcher/commit/d3ab0596bba015927b2c93d1c3185fb7876fde1c))
* **module-tags:** remove undeclared params from leave animation binding ([236e4f2](https://github.com/Polyterative/Patcher/commit/236e4f25898ebbe614112a8b6b360fbe13334e86))
* **notifications:** call snackBar.open directly in catchErrors helper ([7affa00](https://github.com/Polyterative/Patcher/commit/7affa00804c93a39b5fa5241d8fce70821d8ffdc))
* **patch-browser-detail:** use output-jack names for SEO keywords, not input twice ([bdc99dc](https://github.com/Polyterative/Patcher/commit/bdc99dc67cc532484391909fbbd7800b8affad69))
* **patch-connection:** replace invalid numeric validators with maxLength(999) on notes field ([c49d1ed](https://github.com/Polyterative/Patcher/commit/c49d1ed39915d273e02123746cda9aa710d94866))
* **patch-creator:** prevent double-submit with exhaustMap and in-progress guard ([83d1c8e](https://github.com/Polyterative/Patcher/commit/83d1c8e59c3adcfe1644409783b4220ca956ab2e))
* **patch-editor-cv-highlight-test:** make DOM highlight assertion unconditional ([79252d0](https://github.com/Polyterative/Patcher/commit/79252d0f4f6654d0a8398f2258c993b2653e1a0a))
* **patch-editor-state:** remove duplicate confirmSelectedConnection$ subscription ([4e969b2](https://github.com/Polyterative/Patcher/commit/4e969b27751ee7f3d830b4b5c049154f78f80d5b))
* **patch,rack:** roll back optimistic UI state on mutation failure ([b48f331](https://github.com/Polyterative/Patcher/commit/b48f33148e04a8c3f6f25327a75b7b5b147e3e09))
* **patch:** restore missing module panel images in connection cards ([a62b85a](https://github.com/Polyterative/Patcher/commit/a62b85aa13efe4317f95ff1b52d4113368cd63ba))
* **patch:** tie instance-renumber subscription to component teardown ([8aeddbd](https://github.com/Polyterative/Patcher/commit/8aeddbd412f45a3754f56f8a4567f3293ff361e2))
* **price-hub:** reduce module lookup batches ([4500248](https://github.com/Polyterative/Patcher/commit/4500248186a0a3b129f86d40db269a3ef3b4ed37))
* **public-api:** accept weak etag validators ([8dab702](https://github.com/Polyterative/Patcher/commit/8dab702d4b746546638522ab378c8a45f97bdaf4))
* **public-api:** align production data contract ([c3081e4](https://github.com/Polyterative/Patcher/commit/c3081e40549eb57ca2b5cf77e3b4c718f5da7327))
* **public-api:** allow view owner assignment ([9378365](https://github.com/Polyterative/Patcher/commit/93783656a98b165f2c635e84523d5d1ed86be135))
* **public-api:** decode panel bigint ids ([2b40bce](https://github.com/Polyterative/Patcher/commit/2b40bce82a826d1fcaf665bea8cc02fed0d4bc82))
* **public-api:** enable vault key-id access ([0af983f](https://github.com/Polyterative/Patcher/commit/0af983f37b4d5af3650007ef7b0283c21cfa0759))
* **public-api:** preserve credential mutation state ([c756d23](https://github.com/Polyterative/Patcher/commit/c756d2375d61820ab435687986256f868b990795))
* **public-api:** restore module includes ([342dd5a](https://github.com/Polyterative/Patcher/commit/342dd5a698c2290b520cb3a6a2d2ecdd19b6207e))
* **public-profile-data:** cancel stale in-flight patch/rack/stats requests on profile change ([7e8c222](https://github.com/Polyterative/Patcher/commit/7e8c2226e1fc6936e8c0a43a45b9c99c589091d5))
* **public-storage-url:** URL-encode bucket and path segments ([3d3d575](https://github.com/Polyterative/Patcher/commit/3d3d57579c7a4a4c129269e3fd2bb3725b4b01b1))
* **rack-editor:** add grab cursor to draggable rack modules ([cabc54e](https://github.com/Polyterative/Patcher/commit/cabc54ef72f1f57d4deb402c7dca0a6b21108c66))
* **rack-module-adder:** avoid mutating shared rack list and leaking snackbar sub ([a376297](https://github.com/Polyterative/Patcher/commit/a37629788b0b204b90e189fb1c9d82fcad673ae0))
* **rack:** correct signal overlay scale mismatch in auto-scaled rack viewport ([4e99a03](https://github.com/Polyterative/Patcher/commit/4e99a0339f070e1594ce2edbd1e41b5201272d78))
* **rack:** guard create-patch-from-rack against double-submit ([2d9e022](https://github.com/Polyterative/Patcher/commit/2d9e0226cba3efc7583a911fd712ce516e62e4d2))
* **rack:** route blank-module rack display fetch through backend layer ([610fef0](https://github.com/Polyterative/Patcher/commit/610fef09217363dc7cef7c5c180a9b0c746d6654))
* **reset-password:** stop leaking fallback timers and raw backend errors ([f58be06](https://github.com/Polyterative/Patcher/commit/f58be067fb9d379dcd72dd31eb65451a5e302b81))
* **routing-layouts:** merge route data object and mark venus/saturn standalone false ([05822e4](https://github.com/Polyterative/Patcher/commit/05822e4838b1cd154d768a93aafb87af02cc902e))
* **routing-service:** null-guard window.open() result before focusing ([23e0d47](https://github.com/Polyterative/Patcher/commit/23e0d47789a40660b74e3d516e7a899dbc82988a))
* **screenshots:** default production env url ([a0c91e8](https://github.com/Polyterative/Patcher/commit/a0c91e8b4e5f52e1abd8f09749a79f3d4acf0ae1))
* **screenshots:** repair docs capture pipeline ([75ac64c](https://github.com/Polyterative/Patcher/commit/75ac64cb6abf9a38aa57f8a3ae639e923de589ac))
* **seo:** stop querying nonexistent columns on manufacturers in sitemap and prerender ([b2ff86b](https://github.com/Polyterative/Patcher/commit/b2ff86b08b94e7e9105f9b3d6b8803dd65f0a08a))
* **shared-components:** stop CVA writeValue emitting onChange and clear title on mouseleave ([ee9642c](https://github.com/Polyterative/Patcher/commit/ee9642c935248ec7138bdc04475fa155255f4e63))
* **shared:** use refCounted shareReplay to avoid stale cached values after unsubscribe ([779f9b2](https://github.com/Polyterative/Patcher/commit/779f9b2386686644ddbd80bcab8d9e8d3d74b06b))
* **ssr-bootstrap:** null-check localStorage before polyfill guard ([deee399](https://github.com/Polyterative/Patcher/commit/deee3997d03108e595779bf6d9e7939d185fa34a))
* **user-area:** prioritize first-run workspace actions ([59bc680](https://github.com/Polyterative/Patcher/commit/59bc680edb3b992d1a0d352847b6ba19eca280ef))

### [6.5.2](https://github.com/Polyterative/Patcher/compare/v6.5.1...v6.5.2) (2026-07-21)


### Bug Fixes

* **analytics:** correct PostHog event semantics ([296783c](https://github.com/Polyterative/Patcher/commit/296783cf8240e05f9d9c897fd894268753804262))
* **deps:** dedupe duplicate @angular/forms instances breaking form control bindings ([a3f82fa](https://github.com/Polyterative/Patcher/commit/a3f82faeca4326b252aafe2a31de01b57689f1a0))

### [6.5.1](https://github.com/Polyterative/Patcher/compare/v6.5.0...v6.5.1) (2026-07-20)


### Bug Fixes

* **ci:** align pnpm lockfile configuration ([f176ff2](https://github.com/Polyterative/Patcher/commit/f176ff24b8057a134b5fbad76c5befdb31bb0c88))
* **ci:** repair codesee workflow ([4f787c8](https://github.com/Polyterative/Patcher/commit/4f787c8ab8257650941ea90bd341251950a87ef0))
* **forms:** restore production control bindings ([313c38f](https://github.com/Polyterative/Patcher/commit/313c38f85961c73025e81232e62edad5d9bcac12))

## [6.5.0](https://github.com/Polyterative/Patcher/compare/v6.4.3...v6.5.0) (2026-07-20)


### Features

* **backend:** add marketplace and media foundations ([343aa31](https://github.com/Polyterative/Patcher/commit/343aa31b387c5dfa23d59fb39c168cd160b34474))
* **marketplace:** consolidate marketplace experiences ([1aec50b](https://github.com/Polyterative/Patcher/commit/1aec50b359b4b106109fa5ab3ba70991e49957af))
* **media:** add staged R2 delivery support ([ee47a3d](https://github.com/Polyterative/Patcher/commit/ee47a3dd08718f66c38ceaf6516e584c9f4ef26c))
* **price-hub:** consolidate store discovery automation ([711e520](https://github.com/Polyterative/Patcher/commit/711e5207e901b376e86e20f8bacd2753c1ef4ab2))

### [6.4.3](https://github.com/Polyterative/Patcher/compare/v6.4.2...v6.4.3) (2026-07-03)

### [6.4.2](https://github.com/Polyterative/Patcher/compare/v6.4.1...v6.4.2) (2026-07-03)

### [6.4.1](https://github.com/Polyterative/Patcher/compare/v6.4.0...v6.4.1) (2026-07-03)


### Bug Fixes

* **auth:** settle cold session restoration ([236facc](https://github.com/Polyterative/Patcher/commit/236faccf5bfea94408bb56074f81f2a459403754))

## [6.4.0](https://github.com/Polyterative/Patcher/compare/v6.3.1...v6.4.0) (2026-07-03)


### Features

* **account:** enable username changes ([213d8fc](https://github.com/Polyterative/Patcher/commit/213d8fc84d96560d974f9ce66763aeae36f19354))
* **analytics:** capture feedback and admin events ([eb9770d](https://github.com/Polyterative/Patcher/commit/eb9770da4179d4a4d27d491c23cf68ad56a5a975))
* **auth:** enable google sso login and signup ([9e9130e](https://github.com/Polyterative/Patcher/commit/9e9130ed502eb7bb7ea67137b60a4a758f5f7755))
* **auth:** reuse username availability checks ([6647328](https://github.com/Polyterative/Patcher/commit/66473282a8ac473bf95ff2ee120986d4f5d32359))
* **cool:** add user-area collection ([d6de88a](https://github.com/Polyterative/Patcher/commit/d6de88ae5fdc4d65964a03c63dae10f6903d496c))
* **cool:** align cool actions with existing previews ([e325335](https://github.com/Polyterative/Patcher/commit/e325335b47d229adbd2496f38d5f321fb5168374))
* **cool:** extend reactions to patches ([00b1a71](https://github.com/Polyterative/Patcher/commit/00b1a711ef2a90ef9209464bb1860816cf3d2da4))
* **cool:** polish cool reaction UX ([5aa79d2](https://github.com/Polyterative/Patcher/commit/5aa79d2f5b7f52697d301c3ada579cf187e050e7))
* **cool:** wire gated module and rack surfaces ([a9ee11e](https://github.com/Polyterative/Patcher/commit/a9ee11ef27e47d96f0322c2a21aadd64000cb428))
* **dev-utils:** add module merge action ([fb1b44c](https://github.com/Polyterative/Patcher/commit/fb1b44cd1e19c8abf866e6be43cd0738f4de88b2))
* **discovery:** pace helpful tips ([dd132c3](https://github.com/Polyterative/Patcher/commit/dd132c3b5f58641e32618db3b383250f0ff4afeb))
* **manufacturers:** draft verification migrations ([db01e87](https://github.com/Polyterative/Patcher/commit/db01e87f38430a21158f34b989941cbfabc22192))
* **marketplace:** add money parsing helpers ([c85edb9](https://github.com/Polyterative/Patcher/commit/c85edb964b38fb36dc1f0658314e3edd0a4d1c29))
* **marketplace:** add purchase price history ([ebb670b](https://github.com/Polyterative/Patcher/commit/ebb670bf413147813240ac1bbb961bf3323f987d))
* **module-browser:** highlight description keywords ([8585885](https://github.com/Polyterative/Patcher/commit/85858853e7d77430108db18b433c444ba2200a9a))
* **module-browser:** refine price listings presentation ([3fb3809](https://github.com/Polyterative/Patcher/commit/3fb380993814c07423790cf16c0b3eb17c6d7df5))
* **module-details:** add description analysis surfaces ([597d0dc](https://github.com/Polyterative/Patcher/commit/597d0dc02e37f23b4368f2e5a3c821e1876e0837))
* **module:** show public possession stats ([e9ba532](https://github.com/Polyterative/Patcher/commit/e9ba5322d6804b559014ba72dad42081892fae3b))
* **patches:** add patch graph svg renderer ([7070c5d](https://github.com/Polyterative/Patcher/commit/7070c5dee5870b05a24fefed0f5c808550ffe068))
* **patches:** add preview storage backend ([31d7242](https://github.com/Polyterative/Patcher/commit/31d7242b29bf5825f62fba224b647679cbd1169a))
* **patches:** preserve preview update timestamps ([36374dd](https://github.com/Polyterative/Patcher/commit/36374ddc62f285196747811aa66f276dff3495c4))
* **price-hub:** add snapshot pilot and initial store imports ([2816b65](https://github.com/Polyterative/Patcher/commit/2816b65d71224815e85cc9ed55bf4736ff2787e7))
* **price-hub:** expand store crawl coverage ([89dd286](https://github.com/Polyterative/Patcher/commit/89dd286727d5f6301f30353d5bcf8ccff9e374cd))
* **price-hub:** support shopware metadata snapshots ([f0685c9](https://github.com/Polyterative/Patcher/commit/f0685c9c6f9ad5bed4400475c65d57bcc66b193a))
* **price-listings:** expand store coverage and polish surfaces ([c664de4](https://github.com/Polyterative/Patcher/commit/c664de4fb5e6bdb4953d3f9adec8c55a88e99c3e))
* **rack-editor:** add layout shuffle action ([6b389d4](https://github.com/Polyterative/Patcher/commit/6b389d48f24efc327cc35656d5eaeac1b8571f37))
* **rack-editor:** animate row move feedback ([8b20057](https://github.com/Polyterative/Patcher/commit/8b20057e305f8cd67364b22fa09f84248562640a))
* **rack-editor:** block invalid remix action ([4d5d4eb](https://github.com/Polyterative/Patcher/commit/4d5d4ebd9ae440ff73a332ab28064be5817f079f))
* **rack-editor:** count remix arrangements ([a3f9232](https://github.com/Polyterative/Patcher/commit/a3f923263e91624dbf246f52e6502fa839a070c9))
* **rack-editor:** highlight same hp modules on hover ([ef02e8e](https://github.com/Polyterative/Patcher/commit/ef02e8e43e616875ad9c0de9acf6540c93b4a3cb))
* **rack-editor:** label scoped remix action ([9332064](https://github.com/Polyterative/Patcher/commit/933206426738e2a082ccde9d9b8832a80d77beb4))
* **rack-editor:** preview remix moves ([3b5f4d9](https://github.com/Polyterative/Patcher/commit/3b5f4d92780c403e0483f9dc8543b301d86f5276))
* **rack-editor:** scope layout remix ([cc2112d](https://github.com/Polyterative/Patcher/commit/cc2112d7b8857512d4687ba4cf8ab69bc686757a))
* **rack-editor:** scope remix to rows ([f97589c](https://github.com/Polyterative/Patcher/commit/f97589c11a3e278d73387f653627e4569ac708dd))
* **rack-editor:** summarize layout validity ([0a664f6](https://github.com/Polyterative/Patcher/commit/0a664f6e6d20acc78503eea4ab35fd314967228c))
* **rack-editor:** suppress blank replacement enter delay ([2a0633e](https://github.com/Polyterative/Patcher/commit/2a0633edfc8b649dde80364926ef0c18cc457176))
* **reactions:** add cool backend checkpoint ([8a88d0c](https://github.com/Polyterative/Patcher/commit/8a88d0c03d39339aec17015287acb4696a6a5478))
* **reactions:** add gated cool button checkpoint ([e89e221](https://github.com/Polyterative/Patcher/commit/e89e22158f184a58df178e50e3e33b951a3f013c))
* **reactions:** surface cool counts and collection actions ([117622b](https://github.com/Polyterative/Patcher/commit/117622b69325f0f9533b2bbded8cb30575059a32))
* **tags:** split purpose taxonomy groups ([fa88502](https://github.com/Polyterative/Patcher/commit/fa88502126385c32127b3184034fdd6658672f07))
* **user-area:** split cool collections by section ([dc0c3fa](https://github.com/Polyterative/Patcher/commit/dc0c3fa51f8769c406e60b35787cdaec4b9e76c3))


### Bug Fixes

* **auth:** harden session restoration guards ([02150f8](https://github.com/Polyterative/Patcher/commit/02150f85eccf664ff8fb79c3cffc80c53ef29c86))
* **auth:** tighten auth form layout ([712ba9d](https://github.com/Polyterative/Patcher/commit/712ba9da2a15dfd1f700516b4118c975af23f007))
* **comments:** stretch composer input ([aa49d4c](https://github.com/Polyterative/Patcher/commit/aa49d4c340257aa76af9b87cdb2d7748626f12f7))
* **cool:** harden user collection uncool rollback ([09d1fae](https://github.com/Polyterative/Patcher/commit/09d1fae56631463ee5216d1a476c7185a71c3268))
* **cool:** keep patch collection gated ([917b80e](https://github.com/Polyterative/Patcher/commit/917b80e6e03f72bad392d0215e2f8fffbffdabe4))
* **cool:** keep reactions off repeated lists ([ac2b2f1](https://github.com/Polyterative/Patcher/commit/ac2b2f15e72abe436c419f3fcf7ac7c6ae72a723))
* **cool:** refine branded button placement ([d0031ae](https://github.com/Polyterative/Patcher/commit/d0031aeeabfeb786e57bcb0cc65c95c1d758262c))
* **cool:** refine detail and user-area placement ([76611df](https://github.com/Polyterative/Patcher/commit/76611df1da80e8b183dc6451f28eedcdd1305340))
* **deploy:** align pnpm version with vercel ([94535c3](https://github.com/Polyterative/Patcher/commit/94535c3caf0ab023996dac46faa45bcf45390da9))
* **deps:** resolve dependency security alerts ([ea31e3f](https://github.com/Polyterative/Patcher/commit/ea31e3fd3a0b8d620938e360178b195bcbccf2ec))
* **format-translator:** handle empty standards responses ([425b530](https://github.com/Polyterative/Patcher/commit/425b530e01b64270f0dce780a97fc0164b7c4908))
* **module-tags:** align functional tag colour lookup ([2bb65c2](https://github.com/Polyterative/Patcher/commit/2bb65c2cb15ead797e1f6aa718ba1416095ea7a3))
* **module:** restore community possession stats ([e567312](https://github.com/Polyterative/Patcher/commit/e5673124d47190d27a9f0f3770cebc28bddb58fc))
* **price-hub:** make local refresh import-ready ([797651a](https://github.com/Polyterative/Patcher/commit/797651a43462709def32d6fa7186936b742fefba))
* **price-hub:** support local keys for refresh and import ([0291d3a](https://github.com/Polyterative/Patcher/commit/0291d3a41b5ecef6473b6a06de5eb518a88b969e))
* **rack-editor:** cap layout arrangement counts ([cf64399](https://github.com/Polyterative/Patcher/commit/cf6439984a66ed098ee73dee2bbceb36bafa7b94))
* **rack-editor:** preserve module geometry ([43be134](https://github.com/Polyterative/Patcher/commit/43be134bd35db42d3c96ed0cc4270f9399e81d49))
* **rack-list:** fade previews after image load ([3554c6b](https://github.com/Polyterative/Patcher/commit/3554c6b4c168934a4c759005ed4c21e291d03ba8))
* **rack-preview:** flag stale generated previews ([3ce9dd7](https://github.com/Polyterative/Patcher/commit/3ce9dd7b3d26ddbd3465bb7d3b613d5e0318323b))
* **security:** harden auth redirects and env config ([6e442fc](https://github.com/Polyterative/Patcher/commit/6e442fce671239fc115ecd1d24e6b9caa8aaabf8))
* **shell:** normalize url path matching ([610e08c](https://github.com/Polyterative/Patcher/commit/610e08c20192db7660dba3c600f7e4165552d610))
* **tags:** correct voice taxonomy groups ([3630950](https://github.com/Polyterative/Patcher/commit/363095064c2a47173ae5bd011048714ace616ad7))
* **upload:** restore native picker click ([eb86551](https://github.com/Polyterative/Patcher/commit/eb8655155d9d4a2f16b17a5d1008d653b6bb8678))

### [6.3.1](https://github.com/Polyterative/Patcher/compare/v6.3.0...v6.3.1) (2026-06-17)


### Bug Fixes

* **vercel:** restore pnpm override metadata ([8353451](https://github.com/Polyterative/Patcher/commit/8353451c7087cbb27f619f289c7bd213bfdeeeab))

## [6.3.0](https://github.com/Polyterative/Patcher/compare/v6.2.0...v6.3.0) (2026-06-16)


### Features

* **discovery:** enable community trends ([ff2c85c](https://github.com/Polyterative/Patcher/commit/ff2c85c0aa7f0eee8d6e6ec7eda7856537f8ccad))
* **module-browser:** add panel ratio diagnostics ([3b62770](https://github.com/Polyterative/Patcher/commit/3b627709b0cff5b06b954470d6388e20bb4faca4))
* **module-collections:** add public detail seo metadata ([5747812](https://github.com/Polyterative/Patcher/commit/57478126da41667bfc45958a0f5a9797b052192b))
* **module:** tint tags by balance axis ([5e79c2b](https://github.com/Polyterative/Patcher/commit/5e79c2b9b4e632d322a28c622b2a855c4cb15fdc))
* **rack-editor:** add blank panel overflow sizes ([f2200d0](https://github.com/Polyterative/Patcher/commit/f2200d0be9b95435118fdd15716a551db8aed4af))
* **rack-editor:** add optimistic module additions ([ba90db8](https://github.com/Polyterative/Patcher/commit/ba90db816c38cf6c8fa2d91da2c1ae176060728a))
* **rack-editor:** add remix layout analysis ([ec79b39](https://github.com/Polyterative/Patcher/commit/ec79b39f9c296655021bd9505ecee362625ff9a7))
* **rack-editor:** animate remix module moves ([2197ae5](https://github.com/Polyterative/Patcher/commit/2197ae56b2315a1e3963d1585b73fb5151be95a2))
* **rack-editor:** expose layout analysis mode ([af425d3](https://github.com/Polyterative/Patcher/commit/af425d3e79c797ac666a45d7160b72f2ecb3de04))
* **rack-editor:** show remix row layout hints ([9015ca1](https://github.com/Polyterative/Patcher/commit/9015ca184bb5f504c3344abc4220d726d4cf49a1))
* **rack-editor:** show weakest picker category ([bcf9b16](https://github.com/Polyterative/Patcher/commit/bcf9b16a696d0e4ada347145b60eac4b0b0a0fd3))
* **rack-editor:** trigger remix layout ([8922fc5](https://github.com/Polyterative/Patcher/commit/8922fc50c1ac4f84b2eb275f980c7eab6dab4b97))
* **rack:** add balance diff utilities ([a30fdbc](https://github.com/Polyterative/Patcher/commit/a30fdbccd90a99bcd0ca426a350d97fce5471fac))
* **rack:** add layout hover analysis highlights ([20eeb79](https://github.com/Polyterative/Patcher/commit/20eeb799549e1bb616740c28897c35b62f5950fc))
* **rack:** show power header counts ([dff47f0](https://github.com/Polyterative/Patcher/commit/dff47f0e66a8b62363f4bb4f2574450b412c535d))
* **rack:** show stale preview indicator ([a3c5c47](https://github.com/Polyterative/Patcher/commit/a3c5c474606dbdb1f120d46e25c794b5e2a1c044))
* **user-area:** replace remaining paginators with load more ([b41b21f](https://github.com/Polyterative/Patcher/commit/b41b21ffa5847691704f8fe1426c7137301f1608))


### Bug Fixes

* **account:** delete contributor reset data ([a3cecc2](https://github.com/Polyterative/Patcher/commit/a3cecc2e42a00546028b03ab3304fea4ff89b7a5))
* **analytics:** boot posthog tracking eagerly ([73018f5](https://github.com/Polyterative/Patcher/commit/73018f556f902f514167108af02286138d097a47))
* **manufacturer:** map standard filter option ids ([a76c029](https://github.com/Polyterative/Patcher/commit/a76c029448d884589625246d628184d31ddabcdf))
* **module-detail:** keep edit fab above content ([b701663](https://github.com/Polyterative/Patcher/commit/b701663a2126d81a5b808789ff5719245a801930))
* **module-details:** gate collections UI by feature flag ([be872d6](https://github.com/Polyterative/Patcher/commit/be872d6e1f6ca5e8c4b298ac81b77a8243d109c3))
* **module-details:** show full descriptions ([3749565](https://github.com/Polyterative/Patcher/commit/37495652bb97a864ffef2692c0e7877422645c34))
* **release:** handle inherited git stdio output ([dbf6bf3](https://github.com/Polyterative/Patcher/commit/dbf6bf3ff94ecb056b066a2642dd417911afcc0f))
* **ssr:** harden route handling and 404 responses ([e2b9c7f](https://github.com/Polyterative/Patcher/commit/e2b9c7f5a07d6ebf81dcff7a5e2eb2a662f7ca05))
* **vercel:** avoid pnpm engine post-build check ([2fdef0c](https://github.com/Polyterative/Patcher/commit/2fdef0cc63cf4eae4633b9a57a2740ecb8dce40b))
* **vercel:** support pnpm 9 function reinstall ([3990292](https://github.com/Polyterative/Patcher/commit/39902924e7eb7f066405a257c5ca490ea35923d4))
* **vercel:** use corepack pnpm shim ([b374ed0](https://github.com/Polyterative/Patcher/commit/b374ed0bc9ec31054b54e5b089e91d1b6f0208cb))

## [6.2.0](https://github.com/Polyterative/Patcher/compare/v4.0.1...v6.2.0) (2026-06-14)


### Features

* **a11y:** add skip-to-content link and main landmark to app shell ([1969ae2](https://github.com/Polyterative/Patcher/commit/1969ae26c1b0848c6c3c97ca66c082c25f346f72))
* add auto-save for notes ([d5afa71](https://github.com/Polyterative/Patcher/commit/d5afa7175cd0683252701a222944f0b3a5fb8742))
* add duplicate panel detection ([8c45b74](https://github.com/Polyterative/Patcher/commit/8c45b74215417c180bc72d6d2892342827b30a02))
* Add GitHub issue template for Sweep issues ([#8](https://github.com/Polyterative/Patcher/issues/8)) ([5690bf1](https://github.com/Polyterative/Patcher/commit/5690bf101e88f44747030d93fb268bc39cd4eaf7))
* add instance stats ([a8e1e9c](https://github.com/Polyterative/Patcher/commit/a8e1e9ca1adec5925b577a15552bc9ede1e047c3))
* add left-sidebar filter ([521086d](https://github.com/Polyterative/Patcher/commit/521086d54307fa34d0903ae32e0469e17b222871))
* add linked rack controls to patch details ([468cbfd](https://github.com/Polyterative/Patcher/commit/468cbfd51f2a281bf5ab4c800ea774d77a2d70a3))
* add linked rack schema groundwork ([7015922](https://github.com/Polyterative/Patcher/commit/701592293c879586df23547aeae27205fd6ea7b8))
* add patch cable/multiples statistics panel ([92c9dc2](https://github.com/Polyterative/Patcher/commit/92c9dc201669b928f2a674e3166702c33c23a2b8))
* add patch editor linked rack mode ([339e3d4](https://github.com/Polyterative/Patcher/commit/339e3d484569687ccff12d375a20c6d74612b2a5))
* add totalInstances count ([ac38918](https://github.com/Polyterative/Patcher/commit/ac3891856e48c19cc3034424d69b20699d18658d))
* **admin:** add admin flags panel with resolve/delete UI and toolbar link ([604949a](https://github.com/Polyterative/Patcher/commit/604949a01db54da4362d1acc2acd95de47576f4b))
* **admin:** gate dev-utils section visibility on JWT admin role ([c587a08](https://github.com/Polyterative/Patcher/commit/c587a0860b9970fc70976aafcd7a25397fdef511))
* **analytics:** add analytics service and app bootstrap integration ([d618b42](https://github.com/Polyterative/Patcher/commit/d618b42c4a30603ba4b2bb9babe6f37e6b46d130))
* **analytics:** add granular patch and rack editor events ([04acf56](https://github.com/Polyterative/Patcher/commit/04acf56d6110ec8692276463e44f0779d20f3a9f))
* **analytics:** add posthog integration and guardrails ([c32988e](https://github.com/Polyterative/Patcher/commit/c32988e803ccce65003b11028877c5ec2d812dbe))
* **analytics:** track auth search and item actions ([4d1d0ed](https://github.com/Polyterative/Patcher/commit/4d1d0edc889bf0e971c47633f0bf235a7c017cf1))
* **app:** added buttons for feature discoverability ([ec0f423](https://github.com/Polyterative/Patcher/commit/ec0f423a04527bad827569dfccb68805adb72bac))
* **app:** added secret dev utils buttons ([3d5e720](https://github.com/Polyterative/Patcher/commit/3d5e7207357cfd59f327f8525ee342c1bc9e5134))
* **app:** better backend error handling ([6c54890](https://github.com/Polyterative/Patcher/commit/6c548902c0a843dd2d87f628953775beb4805fdc))
* **app:** better details pages layouts UI ([2cbb6e1](https://github.com/Polyterative/Patcher/commit/2cbb6e122294822392a65547fb9399973016f443))
* **app:** better login errors ([248e19b](https://github.com/Polyterative/Patcher/commit/248e19b778a7e64e50cb2662d2cb8b56eceb4f35))
* **app:** better names ([700b38c](https://github.com/Polyterative/Patcher/commit/700b38c98455cdddc7baacd0c8cd55af77e2030d))
* **app:** enhance UX ([eaf80a5](https://github.com/Polyterative/Patcher/commit/eaf80a5f0cf68147ac17a9a4af01406e891b0b11))
* **app:** HTML root cleanup ([5160ebf](https://github.com/Polyterative/Patcher/commit/5160ebfc149e208d4956222ef0b02172e9a2b8c5))
* **app:** images now lazyload ([7181714](https://github.com/Polyterative/Patcher/commit/7181714a64210a9231bf97ecfdf774cd1037abd3))
* **app:** inputs sanitization ([24eea96](https://github.com/Polyterative/Patcher/commit/24eea966d0d22332d9daf5d5759dffd1f15f6619))
* **app:** more buttons ([18958f0](https://github.com/Polyterative/Patcher/commit/18958f0ffbeb0d015b965d34fe140341b44f3510))
* **app:** move components to new material + multiple UI improvements ([db2799d](https://github.com/Polyterative/Patcher/commit/db2799da8540401adab6954aeb82270be4cd0593))
* **app:** new live interactive home ([fa6e8f5](https://github.com/Polyterative/Patcher/commit/fa6e8f52ba8e13590190eebed4ec3d1d5bee00ae))
* **app:** now using angular 18 + material 18 ([233f23f](https://github.com/Polyterative/Patcher/commit/233f23f3501e4e207b6f3716a1884f827fb33a0c))
* **app:** paginators are now more consistent ([98fe969](https://github.com/Polyterative/Patcher/commit/98fe969a6d55b7ba7a05daf60185151353d190cf))
* **app:** secret dev utils ([57a6efc](https://github.com/Polyterative/Patcher/commit/57a6efceff9e51be9fa985cf8006efaf9c7ae8f3))
* **app:** supabase lib update ([8e60c94](https://github.com/Polyterative/Patcher/commit/8e60c948f226d1d6f0836f7f9e7b637d3282b9d3))
* **app:** UI/UX improvements ([c85ec42](https://github.com/Polyterative/Patcher/commit/c85ec425b36e6a896baacd2e1cbc172df8f4fc30))
* **app:** user comments are now supported ([be60924](https://github.com/Polyterative/Patcher/commit/be60924459cdc09e74815014a60d1e7fbad2ffac))
* **auth:** add password reset flow ([3f2c5f2](https://github.com/Polyterative/Patcher/commit/3f2c5f2ba8edfc5bac24175d1ab72b4dd18cfb5f))
* **auth:** improve OAuth profile handling and user management flow ([029aa24](https://github.com/Polyterative/Patcher/commit/029aa24a77a205689abd2908e3d3ecf2427b54c4))
* **auth:** restructure login and signup components ([b742213](https://github.com/Polyterative/Patcher/commit/b74221336302795aba48cbc4f9c4c2167a7e71c1))
* **auth:** temporarily hide Google SSO button ([4d8af1f](https://github.com/Polyterative/Patcher/commit/4d8af1fb6b691542ac24af8d69e3f7c4f9ecc64d))
* **backend:** added sentry options ([c428170](https://github.com/Polyterative/Patcher/commit/c4281702e5492e5bf1cf7bc807f94b16312f363c))
* **backend:** cleaner sentry code ([a5100e4](https://github.com/Polyterative/Patcher/commit/a5100e4765da48c2b7c63506c243f8de55965f1b))
* **backend:** enabled sentry sourcemaps ([c3ccd6b](https://github.com/Polyterative/Patcher/commit/c3ccd6b06c0c37853c653d765fcd03089c9449ec))
* **backend:** enhanced caching support ([0979bcf](https://github.com/Polyterative/Patcher/commit/0979bcf3c0fd26c2e1625d19de6abc67058cc123))
* **backend:** enhanced caching support ([bdea046](https://github.com/Polyterative/Patcher/commit/bdea0464c8ac6405c5d75be2d1e655c3b268d3ef))
* **backend:** enhanced caching support ([593a6ee](https://github.com/Polyterative/Patcher/commit/593a6ee0985caf4cb3c4e2ebec45f52f8f6c6ba2))
* **backend:** local caching support ([21c1e6b](https://github.com/Polyterative/Patcher/commit/21c1e6bc62c8fe37813afb81dd4fbf45c3840051))
* **backend:** now using version 2 of the backend library + total ove… ([#118](https://github.com/Polyterative/Patcher/issues/118)) ([060e1c9](https://github.com/Polyterative/Patcher/commit/060e1c9540482bdf9a1e14dcf9bec82247f46b41))
* **backend:** removed secrets from repo ([e23ee32](https://github.com/Polyterative/Patcher/commit/e23ee327500361149b2c3eeaa9052fe4a2e753f3))
* **backend:** sentry lib update ([3006023](https://github.com/Polyterative/Patcher/commit/300602398bfd41557d4266fa4092323a3846cfb3))
* **browsers:** paginator now on bottom and cleaner top part ([429949d](https://github.com/Polyterative/Patcher/commit/429949d03d0f17a807eee893441926b24f1fc02e))
* **buttons:** add icon support to app-brand-primary-button across multiple components ([f7968af](https://github.com/Polyterative/Patcher/commit/f7968affed2376c6ba5fc2bc27e77b5ebefd58aa))
* **buttons:** add icon support to app-brand-primary-button for various actions ([75b949f](https://github.com/Polyterative/Patcher/commit/75b949f8780ee1e4a3a0577cd03c85265014fd78))
* **buttons:** replace mat-button with app-brand-primary-button for consistent styling and add icon support ([6caba25](https://github.com/Polyterative/Patcher/commit/6caba25b855ea041517fb4a31f97caf4f4392ce2))
* **cards:** less padding, more vert space ([ebc5de7](https://github.com/Polyterative/Patcher/commit/ebc5de7e38e7f2582217aef9183305082e49e7db))
* **changelog:** upgrade to new toolbar and refine UI to match app standard ([67567bd](https://github.com/Polyterative/Patcher/commit/67567bd2d85cd1c60ae131df83990067049b093a))
* **collection:** add module possession states — Own / Want / Sell segmented control ([c7b98f8](https://github.com/Polyterative/Patcher/commit/c7b98f86414a8842775f2477cf8369933d35f832))
* **collection:** filter module pickers to HAS+SELLS — exclude WANTS from patch editor + rack creator ([9600b0a](https://github.com/Polyterative/Patcher/commit/9600b0a3dbd888b310bcafa8734e6e4e9219378e))
* **collection:** merge module possession states (Layer 1+2) from agent/autonomous-20260515 ([e1aa4eb](https://github.com/Polyterative/Patcher/commit/e1aa4eb933b209d45ab8562538daf4ca07b5a3a3))
* **collections:** add module collections ([a395f64](https://github.com/Polyterative/Patcher/commit/a395f642aec57fcd105143250e2714c72ea6e2b0))
* **collection:** show SELLS inline badge in module-minimal meta row ([3f154bb](https://github.com/Polyterative/Patcher/commit/3f154bb6ef4fa6a1be1c89176e59974f2e81357c))
* **comments:** add commentText pipe for safe HTML rendering ([abe8001](https://github.com/Polyterative/Patcher/commit/abe8001b3e52ae49b9fbadbbd1e630d2f3bd7ae0))
* **comments:** better sanitization strategy ([b17434f](https://github.com/Polyterative/Patcher/commit/b17434f36c325f703d99032ef9fb712adc6f7087))
* **comments:** bound comment cards on host pages ([2b49188](https://github.com/Polyterative/Patcher/commit/2b4918834eae70a3252d20e211d77797078abd04))
* **comments:** bound wide-screen comment rails ([5e89eb0](https://github.com/Polyterative/Patcher/commit/5e89eb05669e3cd43ac91520be830477c72b21e6))
* **comments:** comments deletable only withing 30minutes ([4a0bfd2](https://github.com/Polyterative/Patcher/commit/4a0bfd2efecb5e02a6b06d450121bb384952f261))
* **comments:** now active in production ([238870b](https://github.com/Polyterative/Patcher/commit/238870b37fd0de6c47eb66c6ab73d26a58ea8387))
* **comments:** refactor comments UI with improved layout and styling ([3b31e9b](https://github.com/Polyterative/Patcher/commit/3b31e9b23a4fe12286da75e5c9fe6f7b56b47471))
* **core:** security improvement of output of deployment ([ba31135](https://github.com/Polyterative/Patcher/commit/ba31135c893bc85fe7a229dbd968aca59d926afe))
* **countdown-progress:** add reusable countdown progress component with customizable themes and integrate into reset password page ([84ef35b](https://github.com/Polyterative/Patcher/commit/84ef35b61253d6655a1208136a8401de60dad852))
* **danger-actions:** implement consistent styling for destructive actions across components ([53c6e5c](https://github.com/Polyterative/Patcher/commit/53c6e5cbc9cd1e06f61126031d7d905211be3b1f))
* **dialog-info-box:** create a reusable info box component for displaying tips ([3969225](https://github.com/Polyterative/Patcher/commit/39692254576f3ae6545d8b54d6fe460456529452))
* **dialog-info-box:** update styles to use brand-primary colors for consistency ([d10934a](https://github.com/Polyterative/Patcher/commit/d10934a2070bf397234fe3bcd3ddf64dfee0b260))
* **discovery-tips:** add contextual user-area onboarding tips ([7be53ba](https://github.com/Polyterative/Patcher/commit/7be53ba06c15ae5bf8520a7798aeb29450b9967a))
* **discovery-tips:** add global pause action ([6e69464](https://github.com/Polyterative/Patcher/commit/6e69464777f3e566b82ff7e00cee6ecdffdb9ac2))
* **discovery-tips:** improve user callouts ([d37835b](https://github.com/Polyterative/Patcher/commit/d37835b72c257090c7ecccb65e0877bf785cefa5))
* **discovery:** improve search matching and rack hover details ([50ddd99](https://github.com/Polyterative/Patcher/commit/50ddd992442ba80881fb84403540f52220eee000))
* **docs:** add architecture, AI agent guidelines, and style guide documentation ([9dd2fb7](https://github.com/Polyterative/Patcher/commit/9dd2fb7579fca07f24d74901c0d81febccf2a67f))
* **docs:** add testing guidelines for running tests with Yarn ([ab3d8f2](https://github.com/Polyterative/Patcher/commit/ab3d8f253d3ae8484a12b159bfabe75f1a9dabf0))
* **docs:** add user guide for Patcher application ([c0c333d](https://github.com/Polyterative/Patcher/commit/c0c333d69536695b5b506d8ebe12bdee5896dc49))
* **docs:** enhance guidelines for AI agents on tool usage and autonomy ([4d1402f](https://github.com/Polyterative/Patcher/commit/4d1402f82f8eb4b29fb239e11a6f1c9e4bdcf4ca))
* **docs:** enhance guidelines with quick reference, file organization, and common patterns ([a61522b](https://github.com/Polyterative/Patcher/commit/a61522be0c773f7388e7434b49a6c8d2f27546d8))
* **docs:** update ([817ca73](https://github.com/Polyterative/Patcher/commit/817ca73fbb99894a192606a6497667438d511253))
* **docs:** update package manager guidelines to specify Yarn usage ([d5f8ca3](https://github.com/Polyterative/Patcher/commit/d5f8ca374cac9164799364e62cba6abbf789ae21))
* **documentation:** add PRODUCT_NEEDS.md for feature planning and updates ([bbcd2bf](https://github.com/Polyterative/Patcher/commit/bbcd2bf4fc2339ab4f2d84cd24bbcd42d6c01f50))
* **documentation:** expand development philosophy and capture guidelines ([d32aff7](https://github.com/Polyterative/Patcher/commit/d32aff77e28ad39b8e528350a2ccdd2ab4b012e8))
* **e2e:** add Playwright setup ([80cf531](https://github.com/Polyterative/Patcher/commit/80cf5311bc39705fbbe7a8d63b45e2f7e6ced985))
* **edit-fab:** add bounce animation on toggle ([9b8d239](https://github.com/Polyterative/Patcher/commit/9b8d2395fa3f11516650c181b0fff4735aadc6d8))
* **empty-state-tips:** add compact banner variant ([37256c3](https://github.com/Polyterative/Patcher/commit/37256c36e2c780b8c00e791eeac975ef001f61e9))
* **empty-state:** add empty state component with icon and message ([7a2e5f9](https://github.com/Polyterative/Patcher/commit/7a2e5f9a17d8415de131b95e02e3380b14699ace))
* enhance patch editor UX ([3113420](https://github.com/Polyterative/Patcher/commit/311342023081199aaa4c03935509102ab42ab824))
* Exclude package-lock.json from tracked files ([#56](https://github.com/Polyterative/Patcher/issues/56)) ([dc99adf](https://github.com/Polyterative/Patcher/commit/dc99adfeec4a886245978e6334c73b027b22d1e2))
* **faq:** add FAQ entry for adding gaps in rack and improve feature suggestion answer ([169ebbb](https://github.com/Polyterative/Patcher/commit/169ebbb17eabebc97b9b6c097095ddb839217452))
* **filter-sidebar:** enhance reset button logic ([51549a7](https://github.com/Polyterative/Patcher/commit/51549a7773ce6ed105ec6962391c7485f312d08d))
* **footer:** add changelog link ([7d7ff57](https://github.com/Polyterative/Patcher/commit/7d7ff57b4469696dfa0558b93740ff274c843ae8))
* **footer:** add faq ([a3261f4](https://github.com/Polyterative/Patcher/commit/a3261f42cf7a37fa56860a5ecb315e73501f4af5))
* **footer:** cleanup + add links ([f67ed1a](https://github.com/Polyterative/Patcher/commit/f67ed1af600898479978e2e790287088cab3bace))
* **footer:** update changelog to v5.1.0, add Discord/GitHub links, move inline styles to SCSS ([#124](https://github.com/Polyterative/Patcher/issues/124)) ([4f96745](https://github.com/Polyterative/Patcher/commit/4f967451d7f23bf774aead3e963186402f9135b6))
* **form-components:** add icon support for input fields in login, signup, and reset password forms ([c90b686](https://github.com/Polyterative/Patcher/commit/c90b686e686ba59a6b5c26f324b47e1297d64064))
* **form-components:** add icons for various form fields ([2c069cb](https://github.com/Polyterative/Patcher/commit/2c069cbe1c8eaf019dcc1b29c0894f1de44cd796))
* **forms:** add preset quick-select chip overlay to mat-form-entity ([d42b39c](https://github.com/Polyterative/Patcher/commit/d42b39cc7853d8241b9d0afe3cd12d33b363ab4b))
* **graph:** enhance node data structure ([50a2828](https://github.com/Polyterative/Patcher/commit/50a28285f23ab76c265a24d9c1961afd04057fb9))
* **graph:** enhance node label rendering ([d9baedb](https://github.com/Polyterative/Patcher/commit/d9baedb41ad1171bcd19eaeabe9aa5c474413f74))
* **graph:** implement progressive rendering for nodes ([43c25ff](https://github.com/Polyterative/Patcher/commit/43c25ff3fd1a166e095d8c73166fafc53834fa36))
* **hero-card:** add adaptive split titles ([6b97b79](https://github.com/Polyterative/Patcher/commit/6b97b79bbd7b7def8d0c7176655d511afd25989e))
* **home:** add application insights teaser ([de0e7f8](https://github.com/Polyterative/Patcher/commit/de0e7f81310195951e8c5c5973d56a941dda9407))
* **home:** add placeholders for sections ([9c2a32e](https://github.com/Polyterative/Patcher/commit/9c2a32eff754bccd75fa5d1355c60978402eb9b9))
* **home:** add real-world use cases section ([a569341](https://github.com/Polyterative/Patcher/commit/a56934169660f2f4961e316c0105ca742716800c))
* **home:** better copy ([5955a95](https://github.com/Polyterative/Patcher/commit/5955a95a8a8ef2b4b593bb4f29699597aa7c407a))
* **home:** enhance homepage with new components ([9599279](https://github.com/Polyterative/Patcher/commit/9599279a5061ac5ef8ab81c6dc89babd11d4ed97))
* **home:** enhance layout with modular sections ([269cba5](https://github.com/Polyterative/Patcher/commit/269cba500415d02f37b4b456f4b5d0ebe546a988))
* **home:** faster lazy load ([ac75489](https://github.com/Polyterative/Patcher/commit/ac754898f8829718e806b73413d09a31c9bd789a))
* **home:** minor improvements ([880d55d](https://github.com/Polyterative/Patcher/commit/880d55ddfd64f45473f8dee3c0d76b2d872ea7f4))
* **home:** redesign homepage layout and visuals ([beffaee](https://github.com/Polyterative/Patcher/commit/beffaeec0a6735cf1e770e231dc92dd962d0d209))
* **home:** refresh hero messaging ([a3dc76f](https://github.com/Polyterative/Patcher/commit/a3dc76f7398906f3cb5b068a0551571ebc4bfc05))
* **home:** soften insights framing ([b405f7b](https://github.com/Polyterative/Patcher/commit/b405f7b74fbc4dce560cfb1980e4964e4864dff9))
* **home:** update patch description for clarity ([02f9545](https://github.com/Polyterative/Patcher/commit/02f9545b23f0c01efbabb16f70b66ee7f5ea24c0))
* **home:** update section titles and descriptions ([77cb197](https://github.com/Polyterative/Patcher/commit/77cb197d7aa36baac61a840583ecb31e4c215ced))
* **home:** user interface improvements ([a369c69](https://github.com/Polyterative/Patcher/commit/a369c69a2203318924826c88d47b7a4badcd1dec))
* implement duplicate panel detection ([575b13b](https://github.com/Polyterative/Patcher/commit/575b13bf15125d798cbaab06a885459520b5733f))
* **insights:** add catalogue age analytics ([dd00e73](https://github.com/Polyterative/Patcher/commit/dd00e733c2ebb27da8a8af11439a2811edd9a275))
* **insights:** add catalogue health signals ([a591b59](https://github.com/Polyterative/Patcher/commit/a591b59f8d675afed41b6f56acc07dfba4e7695f))
* **insights:** add dedicated application surface ([e317088](https://github.com/Polyterative/Patcher/commit/e317088ac3b86f62d81c10740ed75984dfaf1f26))
* **insights:** add derived signals ([98216c3](https://github.com/Polyterative/Patcher/commit/98216c38ea8a8e8d91b0c707073ba97ccab63db8))
* **insights:** add freshness signals ([d016286](https://github.com/Polyterative/Patcher/commit/d016286641d3ce3745eee79e64554652e8fee7b4))
* **insights:** add maker competition views ([3540e10](https://github.com/Polyterative/Patcher/commit/3540e1035a8259c0e4a9df98f37158a99dcd5bdb))
* **insights:** add participation rates ([cf33c0b](https://github.com/Polyterative/Patcher/commit/cf33c0b9024792d3f7e75c326024cb42619825b4))
* **insights:** add patch network signals ([0f3a8cc](https://github.com/Polyterative/Patcher/commit/0f3a8ccfe8463fc562d3f963b4eb2287734aff83))
* **insights:** add sharing mix signals ([0986247](https://github.com/Polyterative/Patcher/commit/0986247ce73b1bc7e7257506b8385515c9225d07))
* **insights:** deepen format and sharing signals ([5bff4d6](https://github.com/Polyterative/Patcher/commit/5bff4d692452d690e83900da3144b123ce9d1611))
* **insights:** deepen freshness and maker context ([c56bd58](https://github.com/Polyterative/Patcher/commit/c56bd5832475d8bff6d8627b86d8051433c49e19))
* **insights:** deepen module analytics ([87ca020](https://github.com/Polyterative/Patcher/commit/87ca02025a8a10f3699e028fd6d164469620a378))
* **insights:** deepen module size analytics ([5128c9b](https://github.com/Polyterative/Patcher/commit/5128c9b482cda3d1c1a1521d61ce9ad0ad16e687))
* **insights:** expand comparative analytics ([40abb91](https://github.com/Polyterative/Patcher/commit/40abb910b2de63cdc0f7012f6214e4ad9910af52))
* **insights:** explain coverage suppression ([1e215db](https://github.com/Polyterative/Patcher/commit/1e215db76b80e4ead944b9a4287de20cd6485791))
* **insights:** load page from backend snapshot ([f04bc1c](https://github.com/Polyterative/Patcher/commit/f04bc1c4199bfc15f3245075483e171fc1e9b84d))
* **insights:** normalize freshness rates ([78355d9](https://github.com/Polyterative/Patcher/commit/78355d94d74623d6403e05f56c42e4f9a356e719))
* **insights:** redesign public insights page ([99404a3](https://github.com/Polyterative/Patcher/commit/99404a37adf67c818e086454f83d3386637631bc))
* **insights:** sharpen hierarchy and velocity signals ([6071160](https://github.com/Polyterative/Patcher/commit/6071160910d79ea23e9aa4215243f7e450d93ea7))
* **insights:** suppress low-volume derived signals ([751b974](https://github.com/Polyterative/Patcher/commit/751b97456f46e6479e728f39cf4a1119d2e8dac7))
* **layout:** align faq shell support rail ([942808b](https://github.com/Polyterative/Patcher/commit/942808bc72e5840a3278233f42b9ec862373cd26))
* **layout:** align root shell support surfaces ([36b363d](https://github.com/Polyterative/Patcher/commit/36b363d178ff1786edf3a835fa4f6816c00dab04))
* **layout:** align wide shell navigation groups ([9954711](https://github.com/Polyterative/Patcher/commit/9954711c0bdf38834beb6b3ea4e02b66e8eb3104))
* **layout:** modernize footer shell layout ([47808de](https://github.com/Polyterative/Patcher/commit/47808de3465d2df2a1e67af46e229f83d069e823))
* **layout:** scope floating surfaces to shell ([3d7dfd6](https://github.com/Polyterative/Patcher/commit/3d7dfd6c722bce4051c55a7ac1a7e91d24d6abf2))
* **login-page, signup-page:** improve action link UI and enhance routing functionality ([299bc17](https://github.com/Polyterative/Patcher/commit/299bc1789379abc729fe37d446ab23b2b6a8706c))
* **login-page:** add clarification message for password reset procedure ([3b917d9](https://github.com/Polyterative/Patcher/commit/3b917d98f1d18a24d29dc9258b7fd0dbc63962e7))
* **login-page:** implement password reset functionality with UI updates and state management ([876c34a](https://github.com/Polyterative/Patcher/commit/876c34a901601b1e92905f42632127ed7f676bab))
* **login:** add SSO login options and refactor module imports ([bafef71](https://github.com/Polyterative/Patcher/commit/bafef71bceba71bc1e9f01c02bea0731184dd737))
* **login:** improvements ([59d8069](https://github.com/Polyterative/Patcher/commit/59d806987fc4569db9da3ebc4395e52e41c4795d))
* **login:** prepare for OAuth support ([dc325d0](https://github.com/Polyterative/Patcher/commit/dc325d0b8b70dbd94f6da2cd930faea3d6e8ac8b))
* make linked rack modules interactive in patch editor ([25b9d80](https://github.com/Polyterative/Patcher/commit/25b9d803600c7972e11fc294b82e39cd36b251c2))
* **manufacturer-browser:** add manufacturer module and UI components ([2dd51b9](https://github.com/Polyterative/Patcher/commit/2dd51b9ae7835b2e429d2d929daf9a5ef9857389))
* **manufacturer-browser:** add pagination to manufacturer list ([f12773a](https://github.com/Polyterative/Patcher/commit/f12773a1a4a314da9ff6ff6518aaa2b4c7db1ba7))
* **manufacturer-browser:** implement sidebar filters and manufacturer rows ([d8985bf](https://github.com/Polyterative/Patcher/commit/d8985bfb801d528d740c1b6b2ec6efd903ab64db))
* **manufacturer-browser:** integrate module parts for enhanced functionality ([0ae68a2](https://github.com/Polyterative/Patcher/commit/0ae68a27f8ba607227297798da01a01ba2066191))
* **manufacturer-detail:** add floating action button to submit module for manufacturer ([c83205c](https://github.com/Polyterative/Patcher/commit/c83205cae9f6e2ee5afaedbd724b271b9f37b5b0))
* **manufacturer-detail:** add Standard / HP / tag client-side filters to module list ([ca85d50](https://github.com/Polyterative/Patcher/commit/ca85d508881d535137d785b47b61b172c5811520))
* **manufacturer-detail:** implement read-only manufacturer page with SEO enhancements ([dc17598](https://github.com/Polyterative/Patcher/commit/dc175985e790df3018b6ed61fb11a00486446157))
* **manufacturer-detail:** merge floating action button for module submission ([a3bed53](https://github.com/Polyterative/Patcher/commit/a3bed53e844501107a164156ed5b4abd35eb6f61))
* **manufacturer-row:** add updated badge component ([69b7b94](https://github.com/Polyterative/Patcher/commit/69b7b94df797c673f322302dc7be82f3076cd835))
* **manufacturer-row:** enhance module display with links ([bc42d8d](https://github.com/Polyterative/Patcher/commit/bc42d8db281794985516529c97ea00dc4939d585))
* **manufacturer:** logo display, standard grouping default, data-report guidance ([a964534](https://github.com/Polyterative/Patcher/commit/a9645347e0b3bfa450b7be3fb49f1f5fe2ea3f29))
* **manufacturer:** set og:image to logo URL for richer social sharing ([ba7cd78](https://github.com/Polyterative/Patcher/commit/ba7cd781c01652a2a0cd1c27673a864b25c5a39c))
* **module-adder:** rework submit page with stepper, sidebar duplicate check and celebration overlay ([eb55bf4](https://github.com/Polyterative/Patcher/commit/eb55bf4626b04a3a1ea4974d98e86636394ba041))
* **module-browser:** add community possession stats card on module detail page ([d89c882](https://github.com/Polyterative/Patcher/commit/d89c882704771a2390ceae17afe9a0fb2dd30740))
* **module-browser:** add inline manufacturer creation ([53a7b66](https://github.com/Polyterative/Patcher/commit/53a7b668e480f5c166e73f9c511b491aa371aa4c))
* **module-browser:** add module maintenance actions ([63f807e](https://github.com/Polyterative/Patcher/commit/63f807e695900724f6717b2905fae060f2dd338a))
* **module-browser:** add recent activity block for modules ([0959b2c](https://github.com/Polyterative/Patcher/commit/0959b2cf3d6a80aee891a73e73d533ee8892a465))
* **module-browser:** add tag filtering to module list ([d71c77c](https://github.com/Polyterative/Patcher/commit/d71c77c2f19a3ce3a33bd5c10c710b3b24791e72))
* **module-browser:** better filters ([ca3e531](https://github.com/Polyterative/Patcher/commit/ca3e5316fb3d335d907a059c83e428802ef86d4c))
* **module-browser:** implement recent activity service ([e6e0703](https://github.com/Polyterative/Patcher/commit/e6e0703b57ae1d045c800c6d77554cd8caf2197a))
* **module-browser:** improve reset button logic ([1432c6a](https://github.com/Polyterative/Patcher/commit/1432c6ad70edb6b99ce2a6026c3a244354b77d7e))
* **module-browser:** optimized calls and cache on form reset ([c282b57](https://github.com/Polyterative/Patcher/commit/c282b57c8b20575d2451f7f1f3d527c8ad340467))
* **module-browser:** redesign root layout and improve detail and usage-card ([d2ebd5a](https://github.com/Polyterative/Patcher/commit/d2ebd5a5701312ec4c2fb4525165fc8fa1ba55e3))
* **module-browser:** replace mat-paginator with load-more button ([173f9ce](https://github.com/Polyterative/Patcher/commit/173f9cecbbdcc62cefd945428e3a37a5cf89c74c))
* **module-browser:** replace tag MULTISELECT with grouped chip picker + AND/OR toggle + best-match sort ([c65ae94](https://github.com/Polyterative/Patcher/commit/c65ae94578841f02914c2e339b3bce79821ca1f2))
* **module-browser:** restructure tag filter UI and fix tag type handling ([5c6adff](https://github.com/Polyterative/Patcher/commit/5c6adffbc04b72110041503316b92b8def717e95))
* **module-browser:** search add filter options ([f9bacd7](https://github.com/Polyterative/Patcher/commit/f9bacd7c5a8e4dca1fb199faa940240fdcad9355))
* **module-browser:** stabilize tag filter loading ([734939c](https://github.com/Polyterative/Patcher/commit/734939c5ee697fe47d1f7f6472957c672945c531))
* **module-browser:** update button text for clarity ([a23c7e4](https://github.com/Polyterative/Patcher/commit/a23c7e4892699ad665d0a03ad1affd8ce3ca20fd))
* **module-browser:** update iconL1 from 'label' to 'search' for improved clarity ([b07d13f](https://github.com/Polyterative/Patcher/commit/b07d13f1b62c226cafd88df9943db84c1ad42184))
* **module-browser:** UX improvements ([59da7ac](https://github.com/Polyterative/Patcher/commit/59da7aca4fc70737fd7d6049fff96d8811de6546))
* **module-detail:** include panel image in og:image / twitter:image meta ([a11f6ae](https://github.com/Polyterative/Patcher/commit/a11f6aef128f1db90e106d8ea016787d7e2d52c4))
* **module-details:** adapt portrait module layouts ([6f76cb1](https://github.com/Polyterative/Patcher/commit/6f76cb1ba51e63d4dd15f3ffa755a2ce28d61392))
* **module-details:** add depth/weight tracking ([89d1559](https://github.com/Polyterative/Patcher/commit/89d1559309a7abcf5be785e6134798b87d6dcc07))
* **module-details:** add hidden usage buckets ([fbd719b](https://github.com/Polyterative/Patcher/commit/fbd719bc3bc436f85e505c2cc28ecf857180888f))
* **module-details:** add links to stores for quick searches ([0caef68](https://github.com/Polyterative/Patcher/commit/0caef6875c87884a168d680b094e9dbf92c8a408))
* **module-details:** add links to stores for quick searches ([7b5fcea](https://github.com/Polyterative/Patcher/commit/7b5fceade2ad0a2327b0ee2c4fe314cc3f931999))
* **module-details:** add links to stores for quick searches ([120a59d](https://github.com/Polyterative/Patcher/commit/120a59dbe6cf66354b74a69f1c00c7da7ca41650))
* **module-details:** add text description of data ([cf44d30](https://github.com/Polyterative/Patcher/commit/cf44d30fd3dd96df1407ff8a7591de7ec29b8cbc))
* **module-details:** added shop ([c14c5d7](https://github.com/Polyterative/Patcher/commit/c14c5d7dc2e425a999764a8a77ae9bb5c3480cac))
* **module-details:** better layout ([eda325a](https://github.com/Polyterative/Patcher/commit/eda325ac91c3187610a23b774f00870f50d30f7a))
* **module-details:** better layout ([a7a32e3](https://github.com/Polyterative/Patcher/commit/a7a32e3705ba0881290810ee03ae54e3ae4a17cf))
* **module-details:** better layout ([e872479](https://github.com/Polyterative/Patcher/commit/e872479dda217766fc296a75ecf4e59a262821c3))
* **module-details:** can search description now ([c24f951](https://github.com/Polyterative/Patcher/commit/c24f951ee0e2b367f601cbc4e1518c43d7a74015))
* **module-details:** fixed cv adder button css flow ([06cbe1e](https://github.com/Polyterative/Patcher/commit/06cbe1ebded79812796cb238b3d5ad6c55ad0767))
* **module-details:** improvements to administration functions ([6b0fd49](https://github.com/Polyterative/Patcher/commit/6b0fd49c331984a203e6058b386e52f705805dd5))
* **module-details:** more links for quick searches ([672e908](https://github.com/Polyterative/Patcher/commit/672e90851a9a5c3da791dc3db90be90628da9d67))
* **module-details:** more links for quick searches ([01bd185](https://github.com/Polyterative/Patcher/commit/01bd185d5c14bf39e511778de2a4a29f279b206a))
* **module-details:** panels are now approved by default ([6c198d1](https://github.com/Polyterative/Patcher/commit/6c198d1fe0d0738b5e8c479a017713b931129db9))
* **module-details:** statistics card in page ([edb4ad0](https://github.com/Polyterative/Patcher/commit/edb4ad00cc94abe4057c15fb7d6288d6f43bcd9f))
* **module-details:** stores have flags now ([7952028](https://github.com/Polyterative/Patcher/commit/7952028f762a8681685c36d053b286df8d32b51e))
* **module-details:** streamline module card tagging ([64aa443](https://github.com/Polyterative/Patcher/commit/64aa443698120dee294334347adf6ec145a598de))
* **module-editor:** add local panel crop workflow ([d34eb4d](https://github.com/Polyterative/Patcher/commit/d34eb4d24b98380236bd3c218c7c0cde34b55d4c))
* **module-editor:** compact workflow layout and secondary save FAB ([56c6401](https://github.com/Polyterative/Patcher/commit/56c6401fd1b92f681e7f81b9f035fa680bc21bf5))
* **module-editor:** enhance save FAB accessibility and UX ([5cfbaad](https://github.com/Polyterative/Patcher/commit/5cfbaad5ab69d098fbbc2e0e4e17cea29d30c892))
* **module-editor:** harden close/discard flow and CSS fab spacing ([c8eac25](https://github.com/Polyterative/Patcher/commit/c8eac250ea128ed68ee51dbc9687eec8ea3d5699))
* **module-editor:** improve draft CV editing UX and safeguards ([8226295](https://github.com/Polyterative/Patcher/commit/822629583a28820a2b4b19b37f4500cdf83fa2f3))
* **module-editor:** improve module panel image handling ([c3762ce](https://github.com/Polyterative/Patcher/commit/c3762ce6b21d4426c1eb70220032cdecc73519ba))
* **module-editor:** ship MVP layout framing for CV editing ([fd28968](https://github.com/Polyterative/Patcher/commit/fd2896806d6caab369e110d135ddefbc4acee997))
* **module-editor:** track mA for modules and allow update, show total consumption in rack ([63311cf](https://github.com/Polyterative/Patcher/commit/63311cf0603307027bbdadbfa4062e358ef288f9))
* **module-editor:** ui flow improvement ([74692f5](https://github.com/Polyterative/Patcher/commit/74692f5a0b930e8e6aeb666a9cc261a2aba3e216))
* **module-editor:** unify save flow and ship workflow layout scaffold ([192faa6](https://github.com/Polyterative/Patcher/commit/192faa62a686a40a1c3c5ed04a32155cca0566fe))
* **module-editor:** unify setup-panel composition and remove step framing ([c89a4ed](https://github.com/Polyterative/Patcher/commit/c89a4ed79f1a686dd6cb2d4b2a07bdf9503bb263))
* **module-flag:** add module flagging feature with pending count indicator ([9d21b4b](https://github.com/Polyterative/Patcher/commit/9d21b4b7306d7e1f55f39db5eebf85944988cecd))
* **module-flag:** polish flag feature — extract component, fix cancel reset, add admin filters ([84e3760](https://github.com/Polyterative/Patcher/commit/84e37607267fb74a7b0ace2c9c2a87d64e32e754))
* **module-part-image:** add fixed-height option for alignment ([81f55cf](https://github.com/Polyterative/Patcher/commit/81f55cfeee9f1c1a450531f08bb2b7f1931a14ba))
* **module-submit:** Submit similar module button ([d87fd07](https://github.com/Polyterative/Patcher/commit/d87fd07d653879e5d7bc3067d1ea33ea36623ba6))
* **module-submit:** submitted modules are now public by default ([bde55a2](https://github.com/Polyterative/Patcher/commit/bde55a22c2494928f2c9ed910b3bcc7f9eff1dbc))
* **module-tags:** implement tag proposal and voting system with enhanced display logic, vote counts, login checks, and multi-tag support ([618ed04](https://github.com/Polyterative/Patcher/commit/618ed04a9aab7a0fb1c4da3e80e78d08bf16f0ff))
* **module:** add possession dialog ([73bfa38](https://github.com/Polyterative/Patcher/commit/73bfa38ccf1bdcd431e60fe592170988e4b25107))
* **module:** autofill blank power rails ([322ab0d](https://github.com/Polyterative/Patcher/commit/322ab0ddf85f0b3d1cce6a2be877baafcde1adc2))
* **module:** improve issue reporting ux ([063d3ed](https://github.com/Polyterative/Patcher/commit/063d3ed286dd5bdff8286c8ed444484a15c4c9cb))
* **modules:** add store URL per module — buy new link and admin edit ([9a24dcd](https://github.com/Polyterative/Patcher/commit/9a24dcdd1af3fe63e24c24b2a68743c447834a53))
* **modules:** alphabetize the CVs by name, numbers are in order smallest to largest ([c1b1327](https://github.com/Polyterative/Patcher/commit/c1b13270d4400e3a033348915c0a110ac8b94ed7))
* **modules:** better tooltips ([827903c](https://github.com/Polyterative/Patcher/commit/827903cd6c59450c13b51721ccd2a0ba95762593))
* **modules:** can now filter by format ([0bddaa2](https://github.com/Polyterative/Patcher/commit/0bddaa21ecfe0363a8a1687279d6e44c1164334e))
* **modules:** UI now flows well on smaller screens ([a62468e](https://github.com/Polyterative/Patcher/commit/a62468e789e90e37c60c59277ef5afac89954b3d))
* **notifications:** update snackbar messages for clarity and consistency ([4ed09a3](https://github.com/Polyterative/Patcher/commit/4ed09a3c55b4539540b33c99351a407bf02056c7))
* **onboarding:** polish auth and panel inspection ([9bdeaa3](https://github.com/Polyterative/Patcher/commit/9bdeaa341af3ba105d81587e93821ee9e01e464c))
* open sourced project ([49ce123](https://github.com/Polyterative/Patcher/commit/49ce12313929ada00d706c13f5ee7059ffaef93c))
* **package:** add scripts for switching and merging branches ([b530ec6](https://github.com/Polyterative/Patcher/commit/b530ec6ec06055b93390d16a457c56ef0f87a01d))
* **pagination:** persist page state across navigation for all four browser lists ([db303fd](https://github.com/Polyterative/Patcher/commit/db303fd1e738be4a1d7c072653601a6e4fe1e7ec))
* **pagination:** replace mat-paginator with Load More button in patch and manufacturer browsers ([c0f17eb](https://github.com/Polyterative/Patcher/commit/c0f17eb7634820892cb84b0b2dab003401e26faf))
* **panels:** Layer 1 — shared constants, derivePanelLabel utility, gallery UI ([e76dc3d](https://github.com/Polyterative/Patcher/commit/e76dc3d8da3dfc2f554f36073cb4b4906d5bdb8a))
* **panels:** Layer 2 — global panel color preference with localStorage persistence ([a8d923b](https://github.com/Polyterative/Patcher/commit/a8d923b3fad772610de704d09ced417e4f8678e6))
* **panels:** Layer 3 — discovery badge on multi-panel cards, click-to-preview in gallery ([a7833d8](https://github.com/Polyterative/Patcher/commit/a7833d886902fffdf0c25e20c3f4d19054c88b7e))
* **password-change:** add inline form password change form ([1863bb2](https://github.com/Polyterative/Patcher/commit/1863bb23aa0144b7d0accfb1afdd316f5cbf9a26))
* **password-reset:** enhance UI ([510a0f7](https://github.com/Polyterative/Patcher/commit/510a0f7fe5d720e9888277e87197187730dcff28))
* **password-reset:** implement complete password reset flow with token verification and user feedback ([4dee3b1](https://github.com/Polyterative/Patcher/commit/4dee3b1e95807960a3d453a154ff5b6a1612950c))
* **password-reset:** refactor password reset logic with improved email validation and error handling ([c0def89](https://github.com/Polyterative/Patcher/commit/c0def892af73d4b54c31b8090ba5bfc19282f53b))
* **patch-browser:** only show patches with connections ([7cbb7be](https://github.com/Polyterative/Patcher/commit/7cbb7bef18408fbe73bc241c8e95c1b080559088))
* **patch-creator, rack-creator:** enhance dialog content with descriptions and usage tips ([56997ce](https://github.com/Polyterative/Patcher/commit/56997ce18ebc92af1eedf21cc2027524d5ff48b8))
* **patch-creator:** implement unique patch name generation and update dialog layout ([18abe01](https://github.com/Polyterative/Patcher/commit/18abe019a89ae7ea6b8792d0c6643564fa7837ae))
* **patch-creator:** integrate LibShowcaseGridComponent and update patch info display ([a5f6e9d](https://github.com/Polyterative/Patcher/commit/a5f6e9ddfad6562bcbf968685788312d356204ae))
* **patch-detail-data:** enhance connection feedback ([71a9f2e](https://github.com/Polyterative/Patcher/commit/71a9f2e019c9d0287c1292b3dd98ec139b4e458c))
* **patch-detail:** improve connection handling and patch update logic -vibe- ([b66804d](https://github.com/Polyterative/Patcher/commit/b66804d17f5cb91b7f2de3ca67a8dca8c241847c))
* **patch-detail:** restructure layout with stats, modules, graph sections ([9c53145](https://github.com/Polyterative/Patcher/commit/9c5314518726998d7e5a94dde7fd1382be092523))
* **patch-details:** add fade-in animation to patch details component ([31ca7c3](https://github.com/Polyterative/Patcher/commit/31ca7c37a144f81f28e290c3d4d2608f3dba4cf1))
* **patch-details:** cleaner notes UI ([005d6e0](https://github.com/Polyterative/Patcher/commit/005d6e013acfd7271d34362045155f927115c97b))
* **patch-details:** implement patch privacy feature with public field and toggle functionality ([00e3afd](https://github.com/Polyterative/Patcher/commit/00e3afd3b5f5cbc744baa99f508f16f6b4b069a0))
* **patch-detail:** simplify modules-needed rows ([a0cb77b](https://github.com/Polyterative/Patcher/commit/a0cb77b50b24f23b2c23588aaba18b853be40d5c))
* **patch-details:** polish linked rack editing ui ([b1ba6a8](https://github.com/Polyterative/Patcher/commit/b1ba6a8ae0fdc92de0b1be7fb8dab37eb1a608b6))
* **patch-editor:** add compact sort/group controls ([2decdb7](https://github.com/Polyterative/Patcher/commit/2decdb7651f7b11f0c23689ea3d89172e5eb0421))
* **patch-editor:** add copies summary ([6865add](https://github.com/Polyterative/Patcher/commit/6865add280378b5f3435364a641fb0a3e02f1b17))
* **patch-editor:** add floating search for modules ([84c07e0](https://github.com/Polyterative/Patcher/commit/84c07e0fe0c619eabb8ceeff21d415670885e513))
* **patch-editor:** better UI ([1ba316f](https://github.com/Polyterative/Patcher/commit/1ba316fa6b550c6913c6713e09e688f98c57e51e))
* **patch-editor:** clarify workspace controls ([2d6c3bf](https://github.com/Polyterative/Patcher/commit/2d6c3bfeca923475b364e8cc7973091060e13bff))
* **patch-editor:** enhance patch editor UX with improved module titles, CV indicators, inline labels, stale state refresh ([83b2cb5](https://github.com/Polyterative/Patcher/commit/83b2cb544fa6b0e435e6e7260291ac9f66b14844))
* **patch-editor:** enhance sort/group controls with new options ([917fd7e](https://github.com/Polyterative/Patcher/commit/917fd7ec240cb5320ac4952071b1dffea62191d6))
* **patch-editor:** improve module instance UX ([c69a152](https://github.com/Polyterative/Patcher/commit/c69a1527e19a825ab7c4704616ade0ae70ffef57))
* **patch-editor:** linked rack visual with inline CV panel and connection feedback ([46808bd](https://github.com/Polyterative/Patcher/commit/46808bd0de44b11ca4bbce9a17f539a118613702))
* **patch-editor:** per-copy rack instance sync with visual feedback ([a191b18](https://github.com/Polyterative/Patcher/commit/a191b18db006e9cfd1a2601b6aa812094d13ae00))
* **patch-editor:** polish linked rack context ([e852024](https://github.com/Polyterative/Patcher/commit/e85202443ad681af25696cc6c667bcd155ea1ce1))
* **patch-editor:** rack cache fix and divergence detection ([2dc84ad](https://github.com/Polyterative/Patcher/commit/2dc84ad4fe7a252a4cd6f8dc6aabe7b833f10bbd))
* **patch-editor:** responsive rack visual with auto-scale and overlay CV popup ([7efcce5](https://github.com/Polyterative/Patcher/commit/7efcce510232f0e60c7243edd13902ce323cc55d))
* **patch-editor:** ux refinements, race condition fix, style consistency ([7b1fadb](https://github.com/Polyterative/Patcher/commit/7b1fadbaedf9aa577c762e7a725139792ef47351))
* **patch-graph:** add flow animation for edges ([137a857](https://github.com/Polyterative/Patcher/commit/137a857839d80495ae43398dba6c6a8688bf020f))
* **patch-graph:** add fullscreen graph viewer ([06c4d76](https://github.com/Polyterative/Patcher/commit/06c4d76781de2dd2c5f2654e91885178123877bb))
* **patch-graph:** brand and timestamp graph download filename ([ecef5a5](https://github.com/Polyterative/Patcher/commit/ecef5a5db8ac82bfab6cf4034cd2479e1d627539))
* **patch-graph:** download fullscreen graph as png ([d04df1a](https://github.com/Polyterative/Patcher/commit/d04df1ac397dd8c9e4a8244512273bfd113b4dc1))
* **patch-graph:** implement progressive reveal controller ([77669c6](https://github.com/Polyterative/Patcher/commit/77669c673fc004bc0c20cf17ccc8a6781d7fc1c8))
* **patch-graph:** scale fullscreen nodes 25% larger ([f89c55d](https://github.com/Polyterative/Patcher/commit/f89c55da7cd31c68d3e5cb1dc665d5efcd9ad2e1))
* **patch-graph:** show patch name title in fullscreen view ([ad83600](https://github.com/Polyterative/Patcher/commit/ad836007025bc5295fb0a4d17fc3adab98fce9ff))
* **patch-graph:** simplify node labels ([9663f83](https://github.com/Polyterative/Patcher/commit/9663f83dff1035c480736bddff5a73011114bef4))
* **patch-stats:** add PatchConnectionStatsPipe for connection statistics and integrate into patch composite view ([ade6965](https://github.com/Polyterative/Patcher/commit/ade69657b31a58a5c3eaa95613b454819cee23f7))
* **patch:** add auto-save ([0dc0c01](https://github.com/Polyterative/Patcher/commit/0dc0c01e818df0b5616291812e13be75f4a4347d))
* **patch:** add instance-aware multi-module patching ([a7c1ebd](https://github.com/Polyterative/Patcher/commit/a7c1ebd802a5951c8eec580328a1986c3ccd0874))
* **patch:** add privacy toggle to patch creator ([579f483](https://github.com/Polyterative/Patcher/commit/579f483879bee0290e055fda9ccc7a4354175297))
* **patch:** better success message for patch visibility updates in snackbar ([85e45a6](https://github.com/Polyterative/Patcher/commit/85e45a66096fd96500cf8236b9f7b58844cbf56a))
* **patches:** enrich linked rack help ([b2fac04](https://github.com/Polyterative/Patcher/commit/b2fac047e70129a4cb50bf72a5f3afc351890b2c))
* **patches:** new patch editing/view layout ([9589f6e](https://github.com/Polyterative/Patcher/commit/9589f6e2747464a407d012ca3de1a4d18b1b10af))
* **patch:** show linked rack to guests and non-owners in read-only mode ([5ba0749](https://github.com/Polyterative/Patcher/commit/5ba07493cc7001776fe887cb4517bd3aa74255a1))
* **patch:** show mode-aware empty-state tips in editor and hide stats when no connections ([4003db9](https://github.com/Polyterative/Patcher/commit/4003db937ff8b5efa9b06a1bf795b551575609ce))
* **playwright:** enhance local dev server setup ([77f0c76](https://github.com/Polyterative/Patcher/commit/77f0c76bc2d14912cdaf0f1669e6ec50208b31ea))
* **profile:** add public contributor stats ([ac20a43](https://github.com/Polyterative/Patcher/commit/ac20a43beac3e34f0b8dd0c6bacfe65a15e4d8d9))
* **profile:** refresh user area layout and stat icons ([c19c42d](https://github.com/Polyterative/Patcher/commit/c19c42d09be2520a52a0f3b8688baedcf9b7584c))
* **public-profile:** add public profile routes ([e47b5ed](https://github.com/Polyterative/Patcher/commit/e47b5ed309a9e27d8faf4abe0db6fec0ce29eb0d))
* **public-profile:** replace mat-paginator with load-more for racks and patches tabs ([b0591cc](https://github.com/Polyterative/Patcher/commit/b0591cc294c2d1c23ec037965a1c914462aa20e6))
* **public-profile:** set user avatar as og:image for social card previews ([8d2e9f8](https://github.com/Polyterative/Patcher/commit/8d2e9f8bd7da05b08d1a9dae0eb08a5df386d4de))
* **rack-analysis:** add comprehensive tests for RackAnalysisService and improve module analysis methods ([ce7cf4c](https://github.com/Polyterative/Patcher/commit/ce7cf4cf80819f702de3cef8b20add65ea1edc1e))
* **rack-analysis:** implement RackAnalysisService for intelligent rack configuration analysis and recommendations ([1551634](https://github.com/Polyterative/Patcher/commit/15516342164ccb3aa2e63901fcf9346b9658d0f2))
* **rack-browser,user-racks:** replace mat-paginator with load-more buttons ([a2f2cad](https://github.com/Polyterative/Patcher/commit/a2f2cad9fdef1c2ca3564e7e3fb6f2c2bcf80751))
* **rack-browser:** only show racks with modules ([5028a55](https://github.com/Polyterative/Patcher/commit/5028a558229d71d70876f4fad58fb58d0fbdba92))
* **rack-creator:** add privacy toggle to create rack dialog, default private ([fc720ba](https://github.com/Polyterative/Patcher/commit/fc720bac2ed640862141ed01ce5f72954dfb36c5))
* **rack-creator:** add unique name generation for rack creation ([425c17c](https://github.com/Polyterative/Patcher/commit/425c17c25cdfbdf8727dc43f940cc7cae27205ac))
* **rack-creator:** enhance rack analysis with user modules and dynamic recommendations ([49fa5df](https://github.com/Polyterative/Patcher/commit/49fa5dff01ebce34feb15d5289ed9c34eb0869a3))
* **rack-creator:** replace info box with LibShowcaseGridComponent for enhanced module display ([cfcc8a8](https://github.com/Polyterative/Patcher/commit/cfcc8a8693156d1e887fe99b8c012128ac6cd6be))
* **rack-details:** add depth/weight tracking ([3367d13](https://github.com/Polyterative/Patcher/commit/3367d13801d5957dfe93706390423308a7ddf280))
* **rack-details:** add row / remove row ([6c6e454](https://github.com/Polyterative/Patcher/commit/6c6e454be985c3f1986e0fded387437fc55291d8))
* **rack-details:** minor bugfix ([840b3d9](https://github.com/Polyterative/Patcher/commit/840b3d931859e93c6bbcd45898d6ed8c74782c10))
* **rack-details:** more accurate 1U height ([12f0433](https://github.com/Polyterative/Patcher/commit/12f04333ceefcf037b3d9e78d7ec4b37b57b05f0))
* **rack-details:** racks analytic view UI improvements ([06a9f5b](https://github.com/Polyterative/Patcher/commit/06a9f5b3a85067bf7017bfdbae874d2af632b01b))
* **rack-details:** racks can now be private ([e1cf2d4](https://github.com/Polyterative/Patcher/commit/e1cf2d4dce8338aba3369bea09884067e58c10dc))
* **rack-details:** show number of modules in each row ([7a9325b](https://github.com/Polyterative/Patcher/commit/7a9325b4676c02b78ec7f3e97c4a637f770d9b02))
* **rack-details:** statistics card in page ([bee00ef](https://github.com/Polyterative/Patcher/commit/bee00ef86cc993cfae75bbab76b4f9135849fc61))
* **rack-editor:** add exit animation to module tile on delete ([a61ea16](https://github.com/Polyterative/Patcher/commit/a61ea1640295cc20d43ff49f7e96204813e96062))
* **rack-editor:** add function analysis mode ([c8b5dc1](https://github.com/Polyterative/Patcher/commit/c8b5dc17a9d0cf219e99e5579c5643f7a0bd4787))
* **rack-editor:** add rack hp overrides ([14574dc](https://github.com/Polyterative/Patcher/commit/14574dc094b0cba693cf50b11baa122fd222b575))
* **rack-editor:** enhance power analysis ([7835d3a](https://github.com/Polyterative/Patcher/commit/7835d3a4f2b4790bcb7fc78c50195566c3d1e5b1))
* **rack-editor:** quick-add blank panel shortcut strip on row hover ([ecdb148](https://github.com/Polyterative/Patcher/commit/ecdb148dde4a54f84ff693c5cfed69e128c02a7e))
* **rack-editor:** refine responsive controls and rack defaults ([9bfbe61](https://github.com/Polyterative/Patcher/commit/9bfbe61d3763f609299684dc6f4defb8b77d1f1c))
* **rack-editor:** row HP overflow indicator with per-row badge and summary ([7e5aac6](https://github.com/Polyterative/Patcher/commit/7e5aac6dc8daa78f920b77c148c772969eecc4ac))
* **rack-editor:** show total consumption in rack ([22f6770](https://github.com/Polyterative/Patcher/commit/22f67706ad666f90c1e6fa92a08b5fc65e301b94))
* **rack:** add balance analysis panel ([2b34d32](https://github.com/Polyterative/Patcher/commit/2b34d32b01e0c290e384ac170280c51497868102))
* **rack:** add one-click linked patch creation ([094e414](https://github.com/Polyterative/Patcher/commit/094e4149599d029d5115ed222643178c4e58a133))
* **rack:** auto-scale rack to fit viewport width on all screen sizes ([482f488](https://github.com/Polyterative/Patcher/commit/482f488ee85d7ea557af553fce45865832fb1f49))
* **rack:** clean a whole single row functionality ([8329b72](https://github.com/Polyterative/Patcher/commit/8329b72c13e2efc373dc5264442d28aaff9f4bd7))
* **rack:** guide first-time placement with empty-state tips and scroll-into-view on picker add ([d11a923](https://github.com/Polyterative/Patcher/commit/d11a923950d6307e0b6e49e2103b65f5f7d1e8c4))
* **rack:** rack-local panel switching for multi-panel modules ([561bae6](https://github.com/Polyterative/Patcher/commit/561bae6be0f98e7ff4ac1f1a3fdf25853975148d))
* **rack:** refine and pause signal analysis mode ([f041e3a](https://github.com/Polyterative/Patcher/commit/f041e3ac57327fa28a54346868ab167a47ba45f9))
* **rack:** refine balance analysis panel ([93f51e7](https://github.com/Polyterative/Patcher/commit/93f51e7d57e1d066fe65196feb99ed2aa6035a0e))
* **rack:** refine mobile controls and power analysis ([e25e9e5](https://github.com/Polyterative/Patcher/commit/e25e9e583cd3ae9d9f8d10065e014fc6b60eb481))
* **rack:** refine module chooser browsing ([924912a](https://github.com/Polyterative/Patcher/commit/924912a4e7fded8c5da0ab831d6b586f0a13f0f1))
* **rack:** refine summary layout and comments ([772de1d](https://github.com/Polyterative/Patcher/commit/772de1da49a8c30b1c4e5c41a146266b1160c638))
* **racks:** allow to update image preview to show it in lists ([8aa419b](https://github.com/Polyterative/Patcher/commit/8aa419b79b4e0923899d3e0eb43ce6c7759fb314))
* **rack:** statistics ([#120](https://github.com/Polyterative/Patcher/issues/120)) ([51d23b7](https://github.com/Polyterative/Patcher/commit/51d23b728f53a0fe3f29bb690b2019379b69a011))
* **rack:** user can now replace a module with a blank directly from the interface ([0347fbc](https://github.com/Polyterative/Patcher/commit/0347fbc37d207d416f85d15231c9a0ba40935664))
* replace dom-to-image ([c3a7941](https://github.com/Polyterative/Patcher/commit/c3a794115f0c54595bd74546ce30a249d576e4da))
* **repo:** readme fixes ([19ea031](https://github.com/Polyterative/Patcher/commit/19ea0317b2a351c97bb397f8f7ca720e24a07072))
* **repo:** readme fixes ([1c554fb](https://github.com/Polyterative/Patcher/commit/1c554fb93049a4404690a9b57c6bca05e34ca8c3))
* **reset-password:** enhance UI with loading and error icons, improve responsiveness ([2579630](https://github.com/Polyterative/Patcher/commit/257963071403a49272c4315df7bf31143d0a254f))
* **scripts:** add local Supabase backup and restore harness ([a31e52b](https://github.com/Polyterative/Patcher/commit/a31e52b25c75cee5803cbb392e33f652f2a859c4))
* **search:** implement accent-insensitive normalization for search functionality and update related components ([5639492](https://github.com/Polyterative/Patcher/commit/563949291a621d69a382932d9bfccb7db57c61c5))
* **security:** replace enumerable rack/patch IDs with opaque public_id token URLs ([276a359](https://github.com/Polyterative/Patcher/commit/276a35940eb4bf24649b85f1319f0fcd3297dd7c))
* **selection-panel:** clear confirmed state on selection change ([3b8afda](https://github.com/Polyterative/Patcher/commit/3b8afda0197192727597af9f253de8988b889b3a))
* **selection-panel:** enhance confirm flow with persistent indicator ([e8c2dc5](https://github.com/Polyterative/Patcher/commit/e8c2dc5f4182218f0b59581458d0705f2a8b7361))
* **selection-panel:** enhance connection confirmation flow ([895c750](https://github.com/Polyterative/Patcher/commit/895c750c07ff3b94e1f610c39eff1442064f33d0))
* **selection-panel:** implement floating selection panel ([837aefc](https://github.com/Polyterative/Patcher/commit/837aefc0bf5ec20e0a46d37eb5abd3e58a131b39))
* **selection-panel:** implement sticky floating panel with deselect buttons ([c4cd081](https://github.com/Polyterative/Patcher/commit/c4cd081f6bfefea83dd00d5e181ac99c52ae25a0))
* **selection-panel:** integrate deselect buttons and clean up ([928d93b](https://github.com/Polyterative/Patcher/commit/928d93bb18e14855bd53be2ad1c446b8e3e70ad2))
* **selection-panel:** update confirmed state logic ([8225100](https://github.com/Polyterative/Patcher/commit/82251003fa00b70ffd113934640db88bf32a4892))
* **sentry:** add user identity, route tag, replay-on-error and noise filter ([f35ad24](https://github.com/Polyterative/Patcher/commit/f35ad24de8a4a60bd8d17853e683287226c1366c))
* **seo:** add Angular SSR with on-demand rendering and JSON-LD structured data ([3a30b2b](https://github.com/Polyterative/Patcher/commit/3a30b2b819d5afa6455d62998974329073b51b10))
* **seo:** add bot middleware and fallback social meta tags ([6330a0c](https://github.com/Polyterative/Patcher/commit/6330a0cb6a7fb4a221b3283198f3b5ad7a8d57d3))
* **seo:** add llms.txt for AI crawler guidance ([2edceff](https://github.com/Polyterative/Patcher/commit/2edceff9538c8ccff5bf0ec0b7a710cb2ed74c3a))
* **seo:** add manufacturer detail metadata to SEO middleware ([8f3fe14](https://github.com/Polyterative/Patcher/commit/8f3fe14bdabc3aa5496cef3509d024cd3ba7b909))
* **seo:** add manufacturer pages to sitemap ([c2927a1](https://github.com/Polyterative/Patcher/commit/c2927a13d0b0e10a8e4241012b9729e1dc6fb4ce))
* **seo:** add og:image to rack detail metadata; add SEO unit tests ([a06f4a6](https://github.com/Polyterative/Patcher/commit/a06f4a638d638ee91b89498c86b3b07c4c2b7aa2))
* **seo:** improvements ([de92be8](https://github.com/Polyterative/Patcher/commit/de92be826cfefe46ea04ed979d3e8e591e50ba13))
* **seo:** replace ngx-seo with custom SeoSocialShareData model and update related components ([ab0a8ad](https://github.com/Polyterative/Patcher/commit/ab0a8ad4d6bd4d737e1b170419a1e2d9511bbd18))
* **seo:** tagging improvements ([178cf1e](https://github.com/Polyterative/Patcher/commit/178cf1e27b8a1530a18f3a7bb5a202c4a998b8c6))
* **shell:** polish embedded header layouts ([b4104c7](https://github.com/Polyterative/Patcher/commit/b4104c790d7e8145614b6d9a4c4db29df5f5c49e))
* **signup-page:** enhance signup actions UI and improve component structure ([1b520af](https://github.com/Polyterative/Patcher/commit/1b520af778f3b109146fe97008f202fb4b681d51))
* **site:** add timed event banner surface ([46bcf72](https://github.com/Polyterative/Patcher/commit/46bcf72ab36520cee0833a5a962fdc1956a39c6b))
* **snackbar:** configure default snackbar options and adjust styling for improved visibility ([dc9e7c7](https://github.com/Polyterative/Patcher/commit/dc9e7c77dd2836e818eafe4b99a47c5b31e479b2))
* **snackbar:** enhance snackbar messages to include contextual names for better user feedback ([87e8985](https://github.com/Polyterative/Patcher/commit/87e89851606d7e24154c49fe15743289bdae2c4c))
* **snackbar:** enhance snackbar messages with improved clarity and semantic styling ([b27fda5](https://github.com/Polyterative/Patcher/commit/b27fda5bfcc17df8198bff973dee4f580bb6936a))
* **sso-buttons:** simplify SSO provider options and hide sections ([f1ac6d8](https://github.com/Polyterative/Patcher/commit/f1ac6d8df8cf952d7f5f380add378d417d77485c))
* **sso-buttons:** update SSO button styles ([57e1916](https://github.com/Polyterative/Patcher/commit/57e1916eff6cbebd77461acacf1aefd0c2f3274f))
* **ssr-host-config:** add request origin resolution and allowed hosts ([092871b](https://github.com/Polyterative/Patcher/commit/092871b540b5637c397e454045e17a10222dd461))
* **ssr:** wire Angular 21 on-demand SSR to Vercel via explicit serverless shim ([3fe40d8](https://github.com/Polyterative/Patcher/commit/3fe40d8f99e7c1a3ee20a79f33f31ee3d48a2899))
* statistics card ([268b46b](https://github.com/Polyterative/Patcher/commit/268b46b70155a757f4610992a527263017175f38))
* **stats:** unify detail stat cards ([8b1a115](https://github.com/Polyterative/Patcher/commit/8b1a115b228ff8397dccb7ab44cc34bc1056133d))
* **styles:** enhance heading styles ([88f2e15](https://github.com/Polyterative/Patcher/commit/88f2e15b02d716c00a955d384d6d3ce17f1fd061))
* **styles:** update component styles to use brand resources for consistency ([862d1c2](https://github.com/Polyterative/Patcher/commit/862d1c2c6ebebacff6cbb9e53ef3321c68016ffd))
* **submit-module:** improve layout ([59a65ea](https://github.com/Polyterative/Patcher/commit/59a65ea91f9876a66a6eb1acdd091b6d0878b1a5))
* **submit:** better UI ([ecc58d0](https://github.com/Polyterative/Patcher/commit/ecc58d02c66814061a32cd09c9ba6cf1a1429af3))
* **submit:** fixed security flaw ([4f51565](https://github.com/Polyterative/Patcher/commit/4f51565052a24b93d60fba716ac868e78af9678a))
* **supabase.service, user-management.service:** implement cross-tab logout synchronization using Supabase auth state changes ([e1f4dd3](https://github.com/Polyterative/Patcher/commit/e1f4dd3d07f74f015081c2b68eac96ddfd75b4f7))
* **supabase:** add store_url migration ([5d92a41](https://github.com/Polyterative/Patcher/commit/5d92a4152fd3c50199305ca5eb88a371cd926e2e))
* **system:** cleanup ([810c5e1](https://github.com/Polyterative/Patcher/commit/810c5e13c7610030f989bdf3ac7b1f189bdff87d))
* **system:** libs update ([c6253df](https://github.com/Polyterative/Patcher/commit/c6253df912e216cf763dbfce0477704eb4288635))
* **tablet:** harden ipad pro editing flows ([63c7b49](https://github.com/Polyterative/Patcher/commit/63c7b49173beb29f850374fe87756bcf1c8e0bdd))
* **tags:** keep proposer open for multi-tag add, show all tags with vote state, filter zero-vote tags ([69a9eeb](https://github.com/Polyterative/Patcher/commit/69a9eeb6f05d58e70700a10c863f80cf66b9c14a))
* **theme:** replace prebuilt Angular Material theme with custom material theme ([4f6efd7](https://github.com/Polyterative/Patcher/commit/4f6efd7c03b0f15ae83187c32f0a266b56c48561))
* **toolbar:** preserve branded home link states ([8d05213](https://github.com/Polyterative/Patcher/commit/8d052139c84fa1764c83c443a79d9de259d503b7))
* **toolbar:** refine embedded shell rollout ([8c38295](https://github.com/Polyterative/Patcher/commit/8c38295ee0c1f53b6d0c73286e23e83c21058b37))
* **ui:** add support links and fix module usage counts ([ab2a14f](https://github.com/Polyterative/Patcher/commit/ab2a14fa18f403310520fae47b20fa4f25fe73f0))
* **ui:** align app surface consistency ([99fef07](https://github.com/Polyterative/Patcher/commit/99fef0777d3b58aa2c078c3e1e794c22929eb932))
* **ui:** checkpoint current product refinements ([004c9dd](https://github.com/Polyterative/Patcher/commit/004c9ddc9d67d59c6d42d8186f398901b43c50a4))
* **ui:** polish patch and rack workflows ([f7f9424](https://github.com/Polyterative/Patcher/commit/f7f94249fede12bd9c591da7e5c97c1ba1cd939d))
* **ui:** redesign notices and linked rack picker ([2d22019](https://github.com/Polyterative/Patcher/commit/2d22019ac3626db494cc7b09eb872fd88b79e707))
* update Node.js version to 22.x and add Vercel configuration ([7bd6fc3](https://github.com/Polyterative/Patcher/commit/7bd6fc34ced569accd188bca899b0ae69b7bb2a9))
* update Safari image export ([6b652cf](https://github.com/Polyterative/Patcher/commit/6b652cf27e731205061cb488012e9de17482f0e7))
* Updated README.md ([#41](https://github.com/Polyterative/Patcher/issues/41)) ([0d50436](https://github.com/Polyterative/Patcher/commit/0d5043635b764c31c397ed9551c37e76f27f760e))
* **user-area:** add my modules and wishlist views ([1748b7b](https://github.com/Polyterative/Patcher/commit/1748b7b6270ef045de526db687fedad4507d337e))
* **user-area:** add owned column scroll shells ([858fe03](https://github.com/Polyterative/Patcher/commit/858fe03a29ab83ac08768df6f2fc7664d33b0337))
* **user-area:** add server-side pagination to comments, patches, racks; client-side to modules ([d947e30](https://github.com/Polyterative/Patcher/commit/d947e30d3b5e23999a11232b30e5d58e8182ee2e))
* **user-area:** bound utility rail column ([0628900](https://github.com/Polyterative/Patcher/commit/0628900e939c799ff173dc1dfcfd292ad3085da8))
* **user-area:** bound workspace search surface ([950c7ac](https://github.com/Polyterative/Patcher/commit/950c7ac9adb74f7d1e1aec6b65bd4c41dc1d33b2))
* **user-area:** compact profile header status ([1dfff3a](https://github.com/Polyterative/Patcher/commit/1dfff3ac034d1c0692115c8d062d53616c6ad9b3))
* **user-area:** compact utility rail content ([224267f](https://github.com/Polyterative/Patcher/commit/224267f024e59b34a783a1768036726a9afa39c0))
* **user-area:** compact utility rail statistics ([ea4ffd9](https://github.com/Polyterative/Patcher/commit/ea4ffd907a9a198ddc7588547aab3a5617b38238))
* **user-area:** establish workspace column grid ([e3d2d20](https://github.com/Polyterative/Patcher/commit/e3d2d209013f7171f470c213ef2d38828231b458))
* **user-area:** filter module collection states ([2ce0b6d](https://github.com/Polyterative/Patcher/commit/2ce0b6d395ae5cfcab901861e05df6006733e2a0))
* **user-area:** hide collections UI temporarily for production release ([028421f](https://github.com/Polyterative/Patcher/commit/028421fbc0720f11003a12b1d63a8f8dcac96854))
* **user-area:** implement unified floating search ([54fea83](https://github.com/Polyterative/Patcher/commit/54fea831e633698c0e4d544a7da93117a87b2cd7))
* **user-area:** manuals of modules section improvements ([5bd14e7](https://github.com/Polyterative/Patcher/commit/5bd14e7b6b43576cc80184f8e454668e3bb66c27))
* **user-area:** merge pagination feature from worktree ([4fb97bb](https://github.com/Polyterative/Patcher/commit/4fb97bb90120fcb0e7c4dc8670638ff8a6a9cdeb))
* **user-area:** modules now sorted by add date ([ca4570d](https://github.com/Polyterative/Patcher/commit/ca4570d5743c077606c0c9e80c60f7d7462aad69))
* **user-area:** move search into utility rail ([7cb2d5e](https://github.com/Polyterative/Patcher/commit/7cb2d5e791409faec45c3f32278a2b1af1a7aac4))
* **user-area:** new manuals of modules section in user profile ([408ef10](https://github.com/Polyterative/Patcher/commit/408ef101028db4e76870b2ffff1284c46487d3a1))
* **user-area:** normalize owned section layout ([701569f](https://github.com/Polyterative/Patcher/commit/701569fafbc49786245fba747f1dbd2ae72c94e3))
* **user-area:** replace modules paginator with load more ([8501bf4](https://github.com/Polyterative/Patcher/commit/8501bf40741cd7d494f4e8045f9dcd29b38aed00))
* **user-area:** replace plain empty-state subtitles with empty-state-tips across modules, racks, patches and comments ([bf177ad](https://github.com/Polyterative/Patcher/commit/bf177ad6ec430b0ac5761bac22932c7af81d0dbc))
* **user-area:** reset discovery search and expand manufacturer docs ([2b629c7](https://github.com/Polyterative/Patcher/commit/2b629c7b7bbadfd4c17d783a8bc982c1f29b482d))
* **user-area:** stack utility rail earlier ([c17351f](https://github.com/Polyterative/Patcher/commit/c17351f533c737c8ceabfdffca2b689a15a283c2))
* **user-area:** stagger macro section entrances via css keyframes ([75d6ca9](https://github.com/Polyterative/Patcher/commit/75d6ca9b96107c39f5cf64fc3830c9e346501127))
* **user-comments:** comments of user ([4be50f3](https://github.com/Polyterative/Patcher/commit/4be50f357f766fe4acadff7119073d47580462f9))
* **user-comments:** comments of user in user page ([e55d3bb](https://github.com/Polyterative/Patcher/commit/e55d3bbe5c6807971d7d8f8b414118e535cbc1e3))
* **user-management.service:** implement cross-tab login synchronization and user ID tracking ([68d0a5a](https://github.com/Polyterative/Patcher/commit/68d0a5a2949d6e66b44aa4f0c1079c356e85aec5))
* **user-management.service:** refactor user observables and actions for improved state management ([56895b8](https://github.com/Polyterative/Patcher/commit/56895b80b5359ca10acba8c278eafee332ba806c))
* **user-management:** align layout of user information display for improved UI ([b23c349](https://github.com/Polyterative/Patcher/commit/b23c3497f605a00f718d1b7107c6fda6a3f02439))
* **user-management:** implement username update functionality with validation ([be8ca66](https://github.com/Polyterative/Patcher/commit/be8ca660a72786859aa02e2c6824590d7fe1f83a))
* **user-manuals:** replace MatCardSubtitle empty states with empty-state-tips ([cca38cd](https://github.com/Polyterative/Patcher/commit/cca38cd5c4c0ae439f6fdee4a5967089f0cbb083))
* **user:** add contributor stats card ([0319575](https://github.com/Polyterative/Patcher/commit/03195753b61e26fb89a9d45b5956b96fd20a3bbb))
* **user:** add GDPR account data deletion ([dd5c0fc](https://github.com/Polyterative/Patcher/commit/dd5c0fc057f19670651154f304d6c3ec690cc1e0))
* **username-guard:** enforce username completion check ([5d85d08](https://github.com/Polyterative/Patcher/commit/5d85d0825443f6e02b90633d52da05820428b99c))
* **ux:** add copy-share-link button to my racks/patches and cache token RPC reads ([4e05221](https://github.com/Polyterative/Patcher/commit/4e05221337ff347da6b97ee4682dad20709b0584))


### Bug Fixes

* **a11y:** add aria-label to all remaining icon-only buttons ([8c64d71](https://github.com/Polyterative/Patcher/commit/8c64d71146923582ce1b781bcf291d7acd9c0912))
* **a11y:** add aria-label to icon-only buttons in comments and module-minimal ([12f944e](https://github.com/Polyterative/Patcher/commit/12f944ebfdac0c82c7f02d484982e4adac067eb3))
* **a11y:** add role=alert to standalone password-mismatch mat-error ([621d821](https://github.com/Polyterative/Patcher/commit/621d821135df5df98ffc77b9ef778848f64e3221))
* **a11y:** add role=link and tabindex to module-strip cards in manufacturer row ([7aeb985](https://github.com/Polyterative/Patcher/commit/7aeb98529c3ab39380a5e1b1507ccd1ea296b5e1))
* **a11y:** make CV-item interactive element keyboard accessible ([c5c80f1](https://github.com/Polyterative/Patcher/commit/c5c80f1a7e7940ee4dcbe3ebc21547be1dd20a07))
* **a11y:** make routerLink-driven title and image containers keyboard accessible ([ffe18c6](https://github.com/Polyterative/Patcher/commit/ffe18c6bf1f16f71475008db9c6a74bec1b1452c))
* **a11y:** remove nested <main> in home page ([10b4b77](https://github.com/Polyterative/Patcher/commit/10b4b77aa1cd4fbe8b2ba7239b7ba0143095e7a0))
* **account:** stabilize signup and account actions ([3959ae1](https://github.com/Polyterative/Patcher/commit/3959ae1c479959c35b55d70e12961d9ac1c51d74))
* **account:** verify rack cleanup on data deletion ([50bb868](https://github.com/Polyterative/Patcher/commit/50bb8683872e5297edccb9dd951c052e0465b17c))
* **actions:** cache fix ([905e485](https://github.com/Polyterative/Patcher/commit/905e4854c60633d1036476823fa589eec0f88703))
* **actions:** cache fix ([cdf0f54](https://github.com/Polyterative/Patcher/commit/cdf0f54f37b814582c9980e167baef0d495000d4))
* add TimeagoModule.forRoot() to APP_ROOT_IMPORTS for footer timestamp pipe ([6e6657d](https://github.com/Polyterative/Patcher/commit/6e6657dd5f6cd1c41ffd8f464379fdd1a144a88f))
* **admin-flags:** add delete confirmation and sort order toggle ([0f4366d](https://github.com/Polyterative/Patcher/commit/0f4366d685b5d0c659217446efc6ff30cb474460))
* **admin-flags:** surface supabase errors on delete/resolve and add admin RLS policies ([e510f60](https://github.com/Polyterative/Patcher/commit/e510f60a2e121f4af9addf0893c0c627f24c1034))
* **admin:** bypass submitter filter in update.module for admins and add role-gating tests ([254a7b3](https://github.com/Polyterative/Patcher/commit/254a7b3bfa1adb2d33d6111de0bab0bfadf90777))
* **admin:** use wide shell navigation ([a01022b](https://github.com/Polyterative/Patcher/commit/a01022b26ecbfeb990da53266d0a4639501c67ba))
* **angular-config:** enable tests and add standalone flag ([59d0dd4](https://github.com/Polyterative/Patcher/commit/59d0dd461b8ae931239abcbc713a8c792f70d305))
* **animations:** restore production-quality entrance cascades ([268e568](https://github.com/Polyterative/Patcher/commit/268e56861e4ab81c848329f89e02edd16d16060f))
* **animations:** restore stagger delay params broken by angular-animations migration ([6c55b63](https://github.com/Polyterative/Patcher/commit/6c55b6370cdeb02c2700e736acfaf12c9d152dcb))
* **app:** eagerly provide selection panel data services ([3737db4](https://github.com/Polyterative/Patcher/commit/3737db4cd0f244185f15c3459cf0b4ea12e572eb))
* **app:** fonts no longer flash ([b443e42](https://github.com/Polyterative/Patcher/commit/b443e421ad00b4b5ad4cd479c96ef10f025a861d))
* **app:** harden monkey flow regressions ([daf4f5a](https://github.com/Polyterative/Patcher/commit/daf4f5a86779f26c582b1e0c791c387509c16b3a))
* **app:** provide TimeagoFormatter at root to unbreak footer pipe ([b5ddfde](https://github.com/Polyterative/Patcher/commit/b5ddfde4aa029897cfa0e046e1f3ff3442ad8899))
* **app:** tighten admin gating and refresh docs links ([e99ab37](https://github.com/Polyterative/Patcher/commit/e99ab37de332c6135f7d41bd69a11ab386cf2fa9))
* **auth:** prevent clipped narrow-page titles ([b09f812](https://github.com/Polyterative/Patcher/commit/b09f812b430a6805496bfa43a0a5dbfcdefcde0e))
* **auto-update-loading:** improve loading indicator visibility ([f3570ec](https://github.com/Polyterative/Patcher/commit/f3570ecc4be2c5c19807ede90cb016fb29791194))
* **backend:** environment fixes ([8f00f44](https://github.com/Polyterative/Patcher/commit/8f00f44f093c9dbe086afa725496e417e7bc6c4b))
* **backend:** environment fixes ([9f1a83b](https://github.com/Polyterative/Patcher/commit/9f1a83b8c428e57d53fc77a8634a1fe54027a4a1))
* **backend:** harden public listing visibility ([8fd1aa2](https://github.com/Polyterative/Patcher/commit/8fd1aa248561bf5179ddf7f92598ff405e031114))
* **backend:** keep public patches visible from private profiles ([5d8e6ce](https://github.com/Polyterative/Patcher/commit/5d8e6ce0b9cf6417933292d27548764592fdd747))
* **backend:** stronger racked modules insert and update ([96c737a](https://github.com/Polyterative/Patcher/commit/96c737a05c7860d3c186341c4f44978be3dc4613))
* **backend:** taking care of comments on entity delete ([9e176d2](https://github.com/Polyterative/Patcher/commit/9e176d2f25ebb3c4f39a38b37ac5839a49829cf3))
* **balance-analysis:** repair broken axis scoring after tag type restructure ([8e19048](https://github.com/Polyterative/Patcher/commit/8e1904896131a324b5d48d78c5d9cbaa6c233c42))
* **boot:** resolve white page on cold start ([2832365](https://github.com/Polyterative/Patcher/commit/28323651dbf592c3304cae59dc7507d4ad42469c))
* **browser:** correct stale sort$ on navigation and wrong default across patches/modules/racks ([158a4cb](https://github.com/Polyterative/Patcher/commit/158a4cb5f1d5706bbdbd5708d8966df61b069cf1))
* **browser:** harden loading and empty states ([e8b6f75](https://github.com/Polyterative/Patcher/commit/e8b6f75405ef992403a2c2cec91bbdb136a99aea))
* **browser:** improve load more pagination ([25ba925](https://github.com/Polyterative/Patcher/commit/25ba925f67f5a9badd7d426f0ba1be5866f794c4))
* **browsers:** keep sidebars through tablet widths ([dcc560c](https://github.com/Polyterative/Patcher/commit/dcc560cbb05711a0a9698d36d5caa4b0afd26847))
* **browsers:** starting number of elements now correct on first opening ([79f26ff](https://github.com/Polyterative/Patcher/commit/79f26ffa0fc79931ab26179bc6dddc6942fe801a))
* **build:** pause production SSR ([e515e73](https://github.com/Polyterative/Patcher/commit/e515e7306ae8d50a3df614a7f3f160e01ca7aab3))
* **build:** remove supabase cli package from install deps ([9387a5a](https://github.com/Polyterative/Patcher/commit/9387a5a65231a6a1c896c4c81ee769bf81a7c89e))
* **build:** resolve two compile errors blocking app from building ([8fe2dc6](https://github.com/Polyterative/Patcher/commit/8fe2dc61ca291956e33182eed992fb3fb97db2c2))
* **cache:** add missing rackWithId/racksMinimal invalidations in rack mutation ops ([04a49ba](https://github.com/Polyterative/Patcher/commit/04a49ba98219836051213287dd859359821347fd))
* **cards:** correct labels for buttons when not logged ([dcf2592](https://github.com/Polyterative/Patcher/commit/dcf2592d6404245df4c42ee189f70fd798f28fe1))
* **changelog,faq:** point roadmap links to ROADMAP.md instead of dev backlog ([c4ca441](https://github.com/Polyterative/Patcher/commit/c4ca441ca6654e76c011d2490f09773181f5c5a5))
* **ci:** add packages field to pnpm-workspace.yaml for pnpm 11 compat ([984730d](https://github.com/Polyterative/Patcher/commit/984730dcf08c9491351d3453a412d53da62ada2e))
* **ci:** downgrade packageManager to pnpm@10.33.4 ([e5ed4f3](https://github.com/Polyterative/Patcher/commit/e5ed4f3dd26e1cc0fd3dd92e5694c1ef4d9a04e3))
* **ci:** downgrade to pnpm@10.33.4 and use --no-frozen-lockfile for Vercel ([0943191](https://github.com/Polyterative/Patcher/commit/09431917c277e014f1c2b8b015f9f4260b5c0d0e))
* **ci:** force corepack pnpm in Vercel installCommand to use pnpm@11 ([92f99ab](https://github.com/Polyterative/Patcher/commit/92f99ab355147a6250628fe9dfdf312f6876f6a3))
* **ci:** gate Vercel deploy on GitHub Actions check-runs ([d06776c](https://github.com/Polyterative/Patcher/commit/d06776c044c9dee098b8d20a5d2cfdb6940f1d06))
* **ci:** generate env files in CI and fix middleware tests missing SUPABASE_URL ([ed9dd02](https://github.com/Polyterative/Patcher/commit/ed9dd02e3090f806c17b65f634fa5cb544dad9fe))
* **ci:** pin karma minimatch for unit test stability ([631c875](https://github.com/Polyterative/Patcher/commit/631c8757a41c673f311c86e790b0ea118226a462))
* **ci:** port CI publish chain from develop ([caa8d97](https://github.com/Polyterative/Patcher/commit/caa8d973fa49d3ee04a66218aa874ffd8317c982))
* **ci:** regenerate lockfile with pnpm@10 to include overrides ([14a1b1f](https://github.com/Polyterative/Patcher/commit/14a1b1fadcfe756228efad71449f45996042eea9))
* **ci:** remove --frozen-lockfile from Vercel installCommand to fix pnpm overrides mismatch ([5b3193a](https://github.com/Polyterative/Patcher/commit/5b3193ae1275aa78a8f07ed356418681b8192d63))
* **ci:** remove duplicate packages keys in pnpm-workspace.yaml ([9e38870](https://github.com/Polyterative/Patcher/commit/9e38870fcf69e9064d71b448b0dddb1592185633))
* **ci:** replace jq with node for JSON parsing in vercel-ignore-build.sh ([55d8590](https://github.com/Polyterative/Patcher/commit/55d85903dc078fffe3aa671a0590bde7877d39c3))
* **ci:** run pnpm scripts explicitly in GitHub Actions ([53ee91b](https://github.com/Polyterative/Patcher/commit/53ee91b8aa6cd17b9744fac6ae9f1692e9892242))
* **clipboard:** add iOS Safari fallback for copy-on-click directive ([ec55a83](https://github.com/Polyterative/Patcher/commit/ec55a83e421d42d8ed71e6cfc5a3ab4f12cea033))
* **comments:** cleaner labels ([a83210c](https://github.com/Polyterative/Patcher/commit/a83210cdc5e8c56a3578b6111cb1bb7a714533c0))
* **comments:** pagination, ordering, error handling and UX improvements ([7eabbcd](https://github.com/Polyterative/Patcher/commit/7eabbcd90ea61c4bba3edf0c80dbdb13c24b0401))
* **components:** remove readonly from @Input() declarations causing TS2540 compile errors ([c3647e5](https://github.com/Polyterative/Patcher/commit/c3647e5c75bc14e7cb0fdbb0b01737dea89d1831))
* **csp:** allow blob: worker-src for FA2 layout Web Worker ([b66f050](https://github.com/Polyterative/Patcher/commit/b66f0503c58d8e4d762d6bee070e2fdba0ffb44d))
* **details:** align readable rails and overlay positioning ([cecb1d9](https://github.com/Polyterative/Patcher/commit/cecb1d95631aaae1bd4a14b6ed4556a03b91278c))
* **details:** streamline linked rack and patch actions ([71ac98c](https://github.com/Polyterative/Patcher/commit/71ac98c300adc2436272849e8c39dd78c2a62e3e))
* **dev-utils:** replace store URL input with manual URL in dev panel ([a30db27](https://github.com/Polyterative/Patcher/commit/a30db272f596c8d9280fb0d396ad1a9cf5c7257e))
* **dev:** stabilize local serve workflow ([059ca38](https://github.com/Polyterative/Patcher/commit/059ca380830a318b968e037471c6118a9dd2686b))
* **discovery-tips:** align user area callouts ([b342711](https://github.com/Polyterative/Patcher/commit/b342711efabb7b11993c799e11d321948ea7a5c7))
* **discovery-tips:** correct anchor targets for action-oriented tips ([e8cb9b3](https://github.com/Polyterative/Patcher/commit/e8cb9b3cb24ec4c0196babe287364b4f72108e17))
* **discovery-tips:** keep active tip stable ([54a1241](https://github.com/Polyterative/Patcher/commit/54a1241966bcd8accece31f3b717191fad13133b))
* **discovery-tips:** tighten callout targeting ([6fe3ba3](https://github.com/Polyterative/Patcher/commit/6fe3ba35bde982e9e54c2895ab63a78e4f052745))
* **docs:** record spacing pass ([f21c5bf](https://github.com/Polyterative/Patcher/commit/f21c5bf20719003f38cc534a6c21200c93da77f8))
* **e2e,types:** resolve 6 TypeScript errors in e2e specs and playwright config ([16104c1](https://github.com/Polyterative/Patcher/commit/16104c161d1b79e700c28224e4c04bce3d291e2b))
* **e2e:** repair 6 pre-existing spec failures ([dfb1d03](https://github.com/Polyterative/Patcher/commit/dfb1d035dfeb6054c69fa4f0b8d03e6815d8f966))
* **e2e:** stabilize owned detail coverage ([f98fdc7](https://github.com/Polyterative/Patcher/commit/f98fdc78e2fba16b6408b76a7402ff176f9261c5))
* **e2e:** update navigation spec selector after main→div rename ([34cc3e8](https://github.com/Polyterative/Patcher/commit/34cc3e80e48c81feaf618e08e117263142813912))
* **e2e:** use mat-icon selector to reliably toggle rack privacy ([edcf86b](https://github.com/Polyterative/Patcher/commit/edcf86ba6d70dc71ab0a9c3136c5f679f91f714e))
* **e2e:** wait for screenshot surfaces to settle ([8e61655](https://github.com/Polyterative/Patcher/commit/8e61655c1ed62f4a13b38bf7c8c6380023ef03a2))
* **event-banner:** align banner spacing to scale ([c3698c0](https://github.com/Polyterative/Patcher/commit/c3698c0e557528deabb4f045d681c1dd045a5cb8))
* **faq:** update roadmap links in FAQ and user guide ([68c1598](https://github.com/Polyterative/Patcher/commit/68c15984a7d9eb7b4c0eab6d4a109fcee80a17b1))
* **flexbox-row-fast:** cap item max-width via CSS vars to prevent last-item stretch ([20d0cf0](https://github.com/Polyterative/Patcher/commit/20d0cf0ce38ed533ca88d8408ff53fb1b9224ab5))
* **footer:** discord invite renew ([a4eaae6](https://github.com/Polyterative/Patcher/commit/a4eaae65925957efefcf24b99c343ce8e87f2eb0))
* **forms:** more resilient form entity ([86f4025](https://github.com/Polyterative/Patcher/commit/86f402598ba753ca0b6de2f2948df4bb0905a2c6))
* **forms:** preserve primitive control values in preset display function ([db81044](https://github.com/Polyterative/Patcher/commit/db81044eb0a8c91454a5158fb2da147abcf66fbf))
* **graph:** reduce patch graph jitter and deterministic sizing ([e4b7015](https://github.com/Polyterative/Patcher/commit/e4b70150f599362075552a79b8ad8eca1e7ce994))
* **graph:** remove circular layout override to preserve semantic node positioning ([ae6215c](https://github.com/Polyterative/Patcher/commit/ae6215cc0c6db1f1efae588377b540346979c797))
* **graph:** stabilize patch details layout and add regression e2e ([3d92be4](https://github.com/Polyterative/Patcher/commit/3d92be41403fd4dffd0719a0a31b0449267ddd33))
* guard linked rack writes before schema rollout ([ed34c91](https://github.com/Polyterative/Patcher/commit/ed34c916c26524423f9495b4133a59e35ea20596))
* **hero-card:** restore shared title spacing ([dc3d216](https://github.com/Polyterative/Patcher/commit/dc3d2162764d11930c326ae0e2af687cd7799fee))
* hide linked rack summary card when edit mode is open ([5cc85b3](https://github.com/Polyterative/Patcher/commit/5cc85b3256801da583e2ab8f3bb3942e784459dc))
* **home:** align toolbar breakpoint ([6aabbb6](https://github.com/Polyterative/Patcher/commit/6aabbb690937e40cb6b579db8c78199631d814b8))
* **home:** align wide toolbar spacing ([cc6196e](https://github.com/Polyterative/Patcher/commit/cc6196ef796a3ff906dc60366e29b06e0f65329b))
* **home:** hide homepage insights ([703b235](https://github.com/Polyterative/Patcher/commit/703b2352a490e18725f75d588f7a3c6729053504))
* **home:** keep entrance motion opaque ([db1aee3](https://github.com/Polyterative/Patcher/commit/db1aee31f60a60269fb66097fa28182d7704a477))
* **home:** normalize landing spacing scale ([1ea930d](https://github.com/Polyterative/Patcher/commit/1ea930dbe8344af8565d16032ec26761fd0778aa))
* **image-export:** replace html-to-image with modern-screenshot ([d05c10e](https://github.com/Polyterative/Patcher/commit/d05c10eeed5d4e9394ebe6e0460e98a0c19cdeec))
* **insights:** correct freshness pagination ([6e0b8ef](https://github.com/Polyterative/Patcher/commit/6e0b8efbc8072bcf197151759c986da446794d23))
* **insights:** gate public entry points in production ([01cd030](https://github.com/Polyterative/Patcher/commit/01cd030d06089fd39e3b8f9603f4173240047f0f))
* **insights:** include all module standards ([6d046b3](https://github.com/Polyterative/Patcher/commit/6d046b387f924ca04d08d834c0335ee34a54aa8c))
* **insights:** reduce chart color variety ([b269935](https://github.com/Polyterative/Patcher/commit/b2699355951104b7ca4c54197862d25b0c1cf762))
* **insights:** replace footprint progress bars ([ec49f0f](https://github.com/Polyterative/Patcher/commit/ec49f0f60d3df7bd2ed7bdba5ff658440e4993a2))
* **insights:** show in-page loading state ([b4f0ed9](https://github.com/Polyterative/Patcher/commit/b4f0ed97b998bdbacaf6066991bfef9c12ca0621))
* **insights:** split module explorations ([eb07b42](https://github.com/Polyterative/Patcher/commit/eb07b4279ed921f646117b0f3009327140eb2fb1))
* keep linked rack optional across patch creation ([af7042b](https://github.com/Polyterative/Patcher/commit/af7042b0da10ad6a2548807f659ba9c18484b95e))
* **layout:** unify page widths and brand link colors ([95834c0](https://github.com/Polyterative/Patcher/commit/95834c0bcaf7381d0a54f28d08d30bb51267fb5e))
* **login:** opening collection from scratch no longer breaks ([f97eee5](https://github.com/Polyterative/Patcher/commit/f97eee5a816c092b0b1c5284d0d3194c0cb42414))
* **login:** update success message for password reset email notification ([e0355e1](https://github.com/Polyterative/Patcher/commit/e0355e14b0dfea13e930b50b6d600be4ded72005))
* **manufacturer-browser:** update pagination to use 10 items per page ([c17e087](https://github.com/Polyterative/Patcher/commit/c17e0871a36a7e10096ae37210dadc95f9a1e44b))
* **manufacturers:** contain row preview overflow ([cffaa34](https://github.com/Polyterative/Patcher/commit/cffaa346964ccf1d7882fd35cbc525449486a675))
* **manufacturers:** hide private module previews ([cda0cdd](https://github.com/Polyterative/Patcher/commit/cda0cdda4ae778d49687f5cddb23f95890b8b56f))
* **manufacturers:** show initial browser loader ([1647a3a](https://github.com/Polyterative/Patcher/commit/1647a3a0cea636ad708c6ffb1399e57cd4255369))
* **module adder:** sending new modules no longer avoids saving data ([085097b](https://github.com/Polyterative/Patcher/commit/085097b99706165d1610f3f89bffe746c5fe2a7d))
* **module-browser:** avoid dimming loaded owned modules ([be6aa95](https://github.com/Polyterative/Patcher/commit/be6aa9597428cf19becda7a3536588b72b73ebc4))
* **module-browser:** filtering for 3U no longer shows 1U as well ([3bf635c](https://github.com/Polyterative/Patcher/commit/3bf635c8e4e0ec816c586a0c2d66a4a73a0aed64))
* **module-browser:** filtering on reset format ([5ad0037](https://github.com/Polyterative/Patcher/commit/5ad0037f563078cfef4acc54e8deeb406ce12644))
* **module-browser:** fix Schneidersladen search URL + tooltip + audit comment ([c6a55d7](https://github.com/Polyterative/Patcher/commit/c6a55d73a00a27af173266207cd8c47e462cba01))
* **module-browser:** improve description overflow ([126c2e8](https://github.com/Polyterative/Patcher/commit/126c2e8aa057bd3ff34b7ba9fdcbb332a79050e5))
* **module-browser:** improve mobile filter actions ([6db9a13](https://github.com/Polyterative/Patcher/commit/6db9a13d74eceec9df28fd80c37f4b58330fe8eb))
* **module-browser:** load full manufacturer lists ([71e6511](https://github.com/Polyterative/Patcher/commit/71e651178fca9e1945cd05b178726ead7f5fb35a))
* **module-browser:** reset now takes to first page ([b7e0ed2](https://github.com/Polyterative/Patcher/commit/b7e0ed27d246e0a3701675797f62af8268eee20b))
* **module-browser:** show loading state on filter input ([acd7308](https://github.com/Polyterative/Patcher/commit/acd7308e0b4f9e66141dc496df839805b2ca788e))
* **module-browser:** suppress empty-state when server reports more items to load ([e82f6b0](https://github.com/Polyterative/Patcher/commit/e82f6b08ee7d3eb167a52be01d873e0408d3e794))
* **module-cv:** narrow touch-first chip sizing ([26b9b2f](https://github.com/Polyterative/Patcher/commit/26b9b2f8b0896cb569a04f314370fc847e69e20e))
* **module-detail:** refine editor responsive layout ([323c5c8](https://github.com/Polyterative/Patcher/commit/323c5c82f959e2cb09149c8e41cd4036dd1a5547))
* **module-details:** constrain panel gallery images to parent width ([eca64e7](https://github.com/Polyterative/Patcher/commit/eca64e7432ee53bcb5db460124152ac9e7489b6c))
* **module-details:** edit security improvements ([4ab3baf](https://github.com/Polyterative/Patcher/commit/4ab3baf2045917c449e2d1a5f488849bc8464ec8))
* **module-detail:** show real community counters and bust cache on possession changes ([674297b](https://github.com/Polyterative/Patcher/commit/674297b2ed651173409387ac26f915cdcf229236))
* **module-details:** opening the rack after adding a module now works correctly ([c7cc1d1](https://github.com/Polyterative/Patcher/commit/c7cc1d1e54812060034572a1a9253919c72240a1))
* **module-details:** panel upload works again ([6edf5d6](https://github.com/Polyterative/Patcher/commit/6edf5d6af4fc8d42b8292b4e9d14f64008913fe4))
* **module-details:** polish panel previews and tag suggestions ([a0cdc55](https://github.com/Polyterative/Patcher/commit/a0cdc55345e3fe888765c9e352f57f38324ce322))
* **module-details:** power upload more reliable ([77519fa](https://github.com/Polyterative/Patcher/commit/77519fa57a5f479100fedc3c006fbe0655945efa))
* **module-details:** refine animation sequencing ([32d1f3f](https://github.com/Polyterative/Patcher/commit/32d1f3f7898f888a6685cdfef8ca2c9cdc59811c))
* **module-details:** refine responsive detail shell ([39073da](https://github.com/Polyterative/Patcher/commit/39073da1fb1872546205d6809f00cd919840ad88))
* **module-details:** title now updates correctly when changing module in page ([e2ef4ea](https://github.com/Polyterative/Patcher/commit/e2ef4ea9f6c7021a58c864d5f1238d1f9679824d))
* **module-editor:** add spacing under setup titles ([5b75496](https://github.com/Polyterative/Patcher/commit/5b75496f7cc0ff5a3b64be3c6b4fa1a96cc117d2))
* **module-editor:** harden responsive layout and remove detail-page flex-layout coupling ([94ee5d0](https://github.com/Polyterative/Patcher/commit/94ee5d0bd3a202f704115b5563ff5569b6d28585))
* **module-editor:** harden save-state validation and baseline sync ([1ff6d6e](https://github.com/Polyterative/Patcher/commit/1ff6d6eb2e30aa03cf48e43d4d7c777e50a93911))
* **module-editor:** preserve unspecified CV ranges ([1f9d2d8](https://github.com/Polyterative/Patcher/commit/1f9d2d8426e432cdde3239b16542130f4c309366))
* **module-editor:** refine panel crop workflow ([7a6994e](https://github.com/Polyterative/Patcher/commit/7a6994e8bbfb0d174d9d4e9e4553e541c2d9fba1))
* **module-editor:** remove duplicate backend call in savePhysical$, use SharedConstants for snackBar, drop unused URLReg and reload() method ([65a1082](https://github.com/Polyterative/Patcher/commit/65a1082cef7be2962df03cb4666e52456e84cc32))
* **module-editor:** restore floating action overlay ([4c8df51](https://github.com/Polyterative/Patcher/commit/4c8df515a1498a9b5fc3c803a35d0a0e62715e1b))
* **module-editor:** stack setup sections ([120851f](https://github.com/Polyterative/Patcher/commit/120851f83045143c58ebb27a1b5b6c812c59bb55))
* **module-sort:** enhance sorting options ([c5e3864](https://github.com/Polyterative/Patcher/commit/c5e3864fb728c9b15bb78928d956dd6c6ad9b762))
* **module-submit:** after submitting a new module to the system the module list correctly shows the new module without having to reload manually ([d4c8e4c](https://github.com/Polyterative/Patcher/commit/d4c8e4c269f83395b0cb886cb27311ac50cc6cdc))
* **module-submit:** now automatically routing user after module submit ([a895213](https://github.com/Polyterative/Patcher/commit/a8952134e1feb17fbd484ca33061cb9ffcda9e55))
* **module-submit:** refactor inline manufacturer creation logic ([41ad7db](https://github.com/Polyterative/Patcher/commit/41ad7dbfa6c099352b368a6b46d3d67199ef3d01))
* **module-submit:** standard now saved correctly ([0d97d1f](https://github.com/Polyterative/Patcher/commit/0d97d1fadeb8ce3101073ec65d8e66c3c31401c2))
* **module-tags:** fix visibleTags$ filter and proposeTag close ([422e4b2](https://github.com/Polyterative/Patcher/commit/422e4b2292ca024a1ca27c3c4dfe32bac3d1fbdf))
* **module-tile:** hide empty action divider ([3796d36](https://github.com/Polyterative/Patcher/commit/3796d36e44448788607bf8d708ca57a9ce4b3fff))
* **module:** fix imageless placeholder width in fixedHeight mode ([0c70af0](https://github.com/Polyterative/Patcher/commit/0c70af0c72833f27d3468f7299adcb26c3a51bf1))
* **module:** hide manual action in details ([f3a48f0](https://github.com/Polyterative/Patcher/commit/f3a48f0bb906d36a6d24e7e88238382b9666695f))
* **module:** restore edits and guard json-ld SSR ([a69c8df](https://github.com/Polyterative/Patcher/commit/a69c8df70670bf329d2306016e883a17655a186a))
* **module:** restore placeholder visibility by removing lib-screen-wrapper wrapper ([4b769ed](https://github.com/Polyterative/Patcher/commit/4b769ed1157d2c645526f5aa46820a0dc0071f35))
* **modules:** allow admin to delete complete modules and improve submit flow ([188ea0b](https://github.com/Polyterative/Patcher/commit/188ea0b30140bb29cef2a637fadd543bbf367010))
* **modules:** correct sorting of module inputs and outputs with numeric parts ([955c47a](https://github.com/Polyterative/Patcher/commit/955c47a5642fb21717addefb668fd0c70abbff75))
* **modules:** restore submit module navigation ([a669d57](https://github.com/Polyterative/Patcher/commit/a669d57e403f33d5a0937e3ef8fac3671fbac0f3))
* **modules:** scope dialog and embedded components in declaring modules ([1069ce0](https://github.com/Polyterative/Patcher/commit/1069ce09d9a401f113f54bf4d40ff5aa13c45578))
* **modules:** sending control voltages no longer avoids saving data ([ccb8c29](https://github.com/Polyterative/Patcher/commit/ccb8c295fa22f544328651e86aacc28a3c87f015))
* **module:** use explicit ngStyle width+height on 1U placeholder div ([e9949a7](https://github.com/Polyterative/Patcher/commit/e9949a7ecb6803c5d6c33db3edd3c21e314fd4eb))
* **module:** use explicit ngStyle width+height on 1U placeholder div ([b933258](https://github.com/Polyterative/Patcher/commit/b933258b231ce590c79e44f38bf73291b5e78006))
* **package.json:** update Node.js engine version range ([ded16e4](https://github.com/Polyterative/Patcher/commit/ded16e4e56ad44ed38d148e2352aa64d0792a37d))
* **package.json:** update Node.js engine version range to <26 ([5d82f25](https://github.com/Polyterative/Patcher/commit/5d82f25b41b9ca9f6e5deedc9cf3a85f6afd943b))
* **panels:** hide report-issue when hideButtons set; remove redundant color badge ([ba3a627](https://github.com/Polyterative/Patcher/commit/ba3a627f3685738f1e3f710c554b9ceb74c262ab))
* **patch-browser:** tighten modules-needed counters ([676518b](https://github.com/Polyterative/Patcher/commit/676518bc67cb7e92efabea42e153437609e345de))
* **patch-connection:** resolve textarea clipping issue ([fea4ba4](https://github.com/Polyterative/Patcher/commit/fea4ba461be70cb24dd7d7230cca27d59a6a29fa))
* **patch-detail:** fail clearly for private links ([bae3766](https://github.com/Polyterative/Patcher/commit/bae37667f0c910c19e1bd57edbc3e28db24f13de))
* **patch-editor:** contain horizontal overflow in edit mode ([f8fdc09](https://github.com/Polyterative/Patcher/commit/f8fdc092635fc62504baa74ed68460c57fc7c88b))
* **patch-editor:** guard linked rack editing edge cases ([294d08c](https://github.com/Polyterative/Patcher/commit/294d08ca6b2c876f016dad4e21d790131c70b132))
* **patch-editor:** hide IO counter badge and report issue button in patch editing ([c369c08](https://github.com/Polyterative/Patcher/commit/c369c088dc5d099680c54b3107e4c23ac668aa67))
* **patch-editor:** prevent auto-save on patch load ([18ab4e8](https://github.com/Polyterative/Patcher/commit/18ab4e837c196218a16176e49766bbed4ca613e6))
* **patch-editor:** show 'No rack linked yet' when kind is unlinked ([43cb5ed](https://github.com/Polyterative/Patcher/commit/43cb5edbad6a0334252ec08bd2da60c33abf3b62))
* **patch-editor:** stabilise trackingId to -module.id for single-instance cards ([c502071](https://github.com/Polyterative/Patcher/commit/c5020716c8b112fe118b81e3d306f3a747027dc1))
* **patch-graph:** kill fullscreen scrollbars and show loading placeholder ([28424d1](https://github.com/Polyterative/Patcher/commit/28424d1fefe7490cf060967760b432f32ddbb22b))
* **patch-graph:** remove gap between fullscreen title and graph ([5093ae8](https://github.com/Polyterative/Patcher/commit/5093ae8fb95abf9a85628880c0923988e275c624))
* **patch-micro:** handle null data in template ([ac71e91](https://github.com/Polyterative/Patcher/commit/ac71e91c71cc1c49bf85374fbaa54eb9221e8f92))
* **patch-module:** update delete logic for patches ([68f448e](https://github.com/Polyterative/Patcher/commit/68f448e7785784a694cb0eda67949bb3cc20637e))
* **patch:** add missing declarations to patch module ([bf8dfbf](https://github.com/Polyterative/Patcher/commit/bf8dfbfbf3afb729f61cb09056f3fa71c7d46834))
* **patch:** block ambiguous instance wiring ([1083d7f](https://github.com/Polyterative/Patcher/commit/1083d7fd4c1de98312f13d67d219470cc4c97bb2))
* **patches:** harden linked rack state ([cf4f937](https://github.com/Polyterative/Patcher/commit/cf4f937f8e465f4defa1e0037b89f2fa380031f8))
* **patches:** harden module lookups and public defaults ([f584eec](https://github.com/Polyterative/Patcher/commit/f584eec70e7a4ec81071289aabb02aa504d7edea))
* **patches:** respect auth state in detail view ([f01bd68](https://github.com/Polyterative/Patcher/commit/f01bd689f331b19d6e63d5753331225a9a920e3d))
* **patch:** fix readonly rack layout overlap with flow-positioned screen ([0f0dace](https://github.com/Polyterative/Patcher/commit/0f0dace68c11402e6292a01c3e414bb1eb9e27cc))
* **patch:** hide rack hint text in readonly view ([6c85a87](https://github.com/Polyterative/Patcher/commit/6c85a87833de418e934701088572912f3910b46b))
* **patch:** import reactive forms in patch module ([3e7f9a5](https://github.com/Polyterative/Patcher/commit/3e7f9a5a55a78bd0898bbd5652a8898523f67c99))
* **patch:** make linked rack preview clickable ([b9cb815](https://github.com/Polyterative/Patcher/commit/b9cb815e425b043768852f4cd8d4d5d30251793d))
* **patch:** restore auto-scale and centering for readonly rack view ([559a099](https://github.com/Polyterative/Patcher/commit/559a0994557fc9bd3c09acb3f23c24cfee20a468))
* **patch:** update privacy status handling and improve template bindings for patch details ([a45e7f7](https://github.com/Polyterative/Patcher/commit/a45e7f7d2c937625a32fb3d854b4d4de492c4ec4))
* **patch:** use editorConnections$ for empty-state source in patch-details template ([7d184e4](https://github.com/Polyterative/Patcher/commit/7d184e4982d66ad0bca7e3ff5d63898d4e77e441))
* preload custom font to prevent flash of unstyled text (FOUT) ([d0f0ef3](https://github.com/Polyterative/Patcher/commit/d0f0ef304693f3b2aba2bf43189b9f31ee2783d8))
* **privacy:** harden public profile query paths ([44e0709](https://github.com/Polyterative/Patcher/commit/44e0709c2ba4ba0831d09f92699f84ddd5c1f6b8))
* **public-profile:** add bottom shell breathing room ([5f33248](https://github.com/Polyterative/Patcher/commit/5f33248f7166f59570dfbbb8ddb7bbc4b95e64b5))
* **public-profile:** harden public profile queries ([2ea3f23](https://github.com/Polyterative/Patcher/commit/2ea3f234b9b95b277706d22f9e7f3fbea243fe05))
* **public-profile:** remove local width clamp ([9e56cca](https://github.com/Polyterative/Patcher/commit/9e56ccad62c36dc88249f990618709b770fab70e))
* **rack-balance:** exclude blank modules from coverage ([931e0d6](https://github.com/Polyterative/Patcher/commit/931e0d6010f34ecf6394c343ece59c2559ee9369))
* **rack-browser:** improve db request handling ([d7880ab](https://github.com/Polyterative/Patcher/commit/d7880abe08a9912831d0ebb970ba40d9d869fc51))
* **rack-browser:** make load-more button reactive with async pipe ([387f45d](https://github.com/Polyterative/Patcher/commit/387f45d093870ea77883fc08b6cd9c4c1555e509))
* **rack-browser:** remove scroll-to-top on load-more ([18743bf](https://github.com/Polyterative/Patcher/commit/18743bfa6345efaa2e58bdf172bc3bc685feceaa))
* **rack-detail:** hide hp badges during image capture ([3150e25](https://github.com/Polyterative/Patcher/commit/3150e2557a97cdaf86b943964316053961e56d17))
* **rack-detail:** pre-fill name form control when activating edit mode ([1534e2f](https://github.com/Polyterative/Patcher/commit/1534e2ffebb9fce10621e274b41e00d311c438a5))
* **rack-details:** refine summary analysis placement ([5ca223a](https://github.com/Polyterative/Patcher/commit/5ca223abe6465041fc7e8ca85dc1866630738929))
* **rack-details:** refine summary layout breakpoints ([85f8e36](https://github.com/Polyterative/Patcher/commit/85f8e36ed38cb20dd85c391f8e698c67b74d4315))
* **rack-editor:** add optimistic rollback on remove and reorder failures ([7d7f34c](https://github.com/Polyterative/Patcher/commit/7d7f34c1c1394621a76331723f0334229dd8ecb7))
* **rack-editor:** harden tablet touch interactions ([150526d](https://github.com/Polyterative/Patcher/commit/150526dc6837f77e3634296173681917a0e8b7b3))
* **rack-editor:** improve cross-row drag animation and suppress ghost ([9830b2c](https://github.com/Polyterative/Patcher/commit/9830b2c9d44fd0346cc8e68a13470fa9d55a0e51))
* **rack-editor:** make blank panel shortcut strip an overlay (position:absolute) ([4a37d9e](https://github.com/Polyterative/Patcher/commit/4a37d9edfe3077194e6a07553c84ac213eedad93))
* **rack-editor:** polish drag reveal and remove edit prompt ([ca9f78b](https://github.com/Polyterative/Patcher/commit/ca9f78bbf00a2392390ab1a30f23435a65ff15da))
* **rack-editor:** prevent dragged panel flash ([964bde5](https://github.com/Polyterative/Patcher/commit/964bde53f558628fae4f1003d612eccec1ebf100))
* **rack-editor:** remove analysis mode tooltips ([fec0086](https://github.com/Polyterative/Patcher/commit/fec0086d31152de252ed52a407b4b4e6f86f1179))
* **rack-editor:** remove lock/unlock button for current rack ([23fad4f](https://github.com/Polyterative/Patcher/commit/23fad4f4e80281cf7630fed5a17013b63582aee3))
* **rack-editor:** remove mobile quick-toggle shadow ([b9ebc77](https://github.com/Polyterative/Patcher/commit/b9ebc774f5e1617e6b3f319506cbb8a112b70eda))
* **rack-editor:** replace HP overflow indicators with animated module border ([8652424](https://github.com/Polyterative/Patcher/commit/8652424fc056322bd5e3150c739e63a264eab25b))
* **rack-editor:** replace with black for 1U ([5f61c70](https://github.com/Polyterative/Patcher/commit/5f61c70e4552650f18bd34b2d7de9520209036db))
* **rack-editor:** restore drag-and-drop module preview (cdkDragPreview) ([7576bbb](https://github.com/Polyterative/Patcher/commit/7576bbb90cbb0d6e0097efb648832114180c370a))
* **rack-editor:** restore natural drag-and-drop behavior ([72c60bf](https://github.com/Polyterative/Patcher/commit/72c60bff5c3d77baf5477e664135e65f520063a1))
* **rack-editor:** smooth drag handoff landing ([fa62eac](https://github.com/Polyterative/Patcher/commit/fa62eac676324d0011767c7f43fa8452d07451a3))
* **rack-editor:** smooth safari module dragging ([77d136e](https://github.com/Polyterative/Patcher/commit/77d136edad6ef2f1acd07bab7b0a6434a09f7d4c))
* **rack-editor:** stabilize drag preview sizing ([277ea30](https://github.com/Polyterative/Patcher/commit/277ea30d67f6fa97d1d0a79d2f3d0ee0bb3db8b0))
* **rack-editor:** tighten mobile spacing ([ddb502e](https://github.com/Polyterative/Patcher/commit/ddb502e5fabaacce5c845654f05edd94e2c1e3d7))
* **rack-editor:** update advice tooltip to display only when no modules are present ([ab317dc](https://github.com/Polyterative/Patcher/commit/ab317dc30c10b916f392763c55f6bd8ece1714e0))
* **rack-function-visuals:** show most-voted tag as primary tooltip label ([c8e0960](https://github.com/Polyterative/Patcher/commit/c8e0960d560f8cf16a292084e5262126c932c890))
* **rack-parts:** exclude blank spacing modules from all rack statistics ([f26a593](https://github.com/Polyterative/Patcher/commit/f26a5938d69769a1747c81eff7e56398bd99954c))
* **rack-signal-analysis:** import missing sortNames and CV ([918b839](https://github.com/Polyterative/Patcher/commit/918b8397eedd0507931a497eefe28a4de9208cb9))
* **rack:** add undo for destructive row actions ([db3513b](https://github.com/Polyterative/Patcher/commit/db3513b7092c996d190ca2164d5f6b38f5ce6c2d))
* **rack:** align balance analysis palette ([10d2b9f](https://github.com/Polyterative/Patcher/commit/10d2b9fbbe2ef83a68675ca6cc8323dee9180845))
* **rack:** align scaled rack viewport ([4d2d6da](https://github.com/Polyterative/Patcher/commit/4d2d6dae968329d694d614350ac684510f3d5cdb))
* **rack:** append picker modules locally ([c78097f](https://github.com/Polyterative/Patcher/commit/c78097f940f5580b87a0bb5dd7454f7e75988ae9))
* **rack:** avoid reload after preview update ([94ba0a1](https://github.com/Polyterative/Patcher/commit/94ba0a10e13d3ccfacce1e2b8c2097ffdb6b60f0))
* **rack:** clarify HP label as 'HP per row' to avoid confusion with total HP ([a5b50b4](https://github.com/Polyterative/Patcher/commit/a5b50b4380e4cb32d56182f6d3d57dcb6b6c3346))
* **rack:** compact balance panel on mobile ([5adcb1a](https://github.com/Polyterative/Patcher/commit/5adcb1ad620d6273390b8e0fc6ab0cbdf3252ffb))
* **rack:** delay summary section stacking ([e2f35e8](https://github.com/Polyterative/Patcher/commit/e2f35e8b1cf380749b919a9a292e24d73e227de7))
* **rack:** extend row backgrounds to full rack width when wider than viewport ([7324184](https://github.com/Polyterative/Patcher/commit/73241842e0d5d4eb757a8efa00381263c083c0de))
* **rack:** handle missing preview images ([e9b43da](https://github.com/Polyterative/Patcher/commit/e9b43da33675a93288dbbe1678086be362129bad))
* **rack:** keep module picker scroll stable ([cbd094f](https://github.com/Polyterative/Patcher/commit/cbd094f56da9d3dab81062163b380cc686ab833e))
* **rack:** load module tags in rack details ([f1b71e9](https://github.com/Polyterative/Patcher/commit/f1b71e9c8e6581e0610c4f0cb889aca883e0ffd8))
* **rack:** lower phone-only breakpoints ([f6621a1](https://github.com/Polyterative/Patcher/commit/f6621a14a4bf5b7d8d7cf37b2a5ea32dddc61b81))
* **rack:** make row edits delta based ([42384dc](https://github.com/Polyterative/Patcher/commit/42384dc084483de43a6967244908afda16407c74))
* **rack:** preserve rows when changing count ([4b74d84](https://github.com/Polyterative/Patcher/commit/4b74d84cc7e8df6a1a76c4b6f690937f2fd8c547))
* **rack:** recognize legacy balance tags ([9824cfe](https://github.com/Polyterative/Patcher/commit/9824cfe271d7c09994df73f3e01d12e16f9bbf52))
* **rack:** refine row action updates ([e55b121](https://github.com/Polyterative/Patcher/commit/e55b1217770e6fc7d2193bd35e64827080cfad59))
* **rack:** remove editor internal scrollbar ([c8519cc](https://github.com/Polyterative/Patcher/commit/c8519cc677d019bf280ba1341ac3c78f209bef1f))
* **rack:** remove hp override persistence ([610f23b](https://github.com/Polyterative/Patcher/commit/610f23bd3eed8850458a4f96e32a5d450b34f3c4))
* **rack:** replace 'Default' panel label with positional 'Panel 1' ([4bbe29f](https://github.com/Polyterative/Patcher/commit/4bbe29f2e26d0fafc6baa06a4a730e7b1340a21b))
* **rack:** resolve inside loader state ([ff0501c](https://github.com/Polyterative/Patcher/commit/ff0501ca356fb0c940879b549c6ede88ed591012))
* **rack:** restore right-click context menu actions and add e2e coverage ([ebd28a0](https://github.com/Polyterative/Patcher/commit/ebd28a04db1328e8ad8a67f3077180093ddf15a3))
* **rack:** restore scale animation and fix background over-extending on small racks ([f4f3d2d](https://github.com/Polyterative/Patcher/commit/f4f3d2d459257caf83db5a6d48486e1463e777cd))
* **rack:** restore smallerScale transform by blockifying rack visual model in flex container ([edd4eaa](https://github.com/Polyterative/Patcher/commit/edd4eaa50df1ec649ac22cc4eed685d3f5d305a6))
* **racks:** add DB triggers to bump parent updated on child-table writes ([1c0bcc8](https://github.com/Polyterative/Patcher/commit/1c0bcc88323db01acb388c402b0fdce26ab1500d))
* **rack:** show modules after rack duplication ([379cb8e](https://github.com/Polyterative/Patcher/commit/379cb8e63096e615156e59530551c6030aa64cdd))
* **racks:** make old-image delete best-effort and surface update.rack errors in preview flow ([4e26fae](https://github.com/Polyterative/Patcher/commit/4e26fae09e1049d57f23f7bce7d9aa8d8c814a04))
* **racks:** restore private detail access and copy previews ([98fd86c](https://github.com/Polyterative/Patcher/commit/98fd86cbd4ba4cb7401b96e1973805a92bfb5f87))
* **rack:** swapping unracked modules inline no longer makes them disappear ([9549e1a](https://github.com/Polyterative/Patcher/commit/9549e1a92d970b57d6ad8370764568ad399ed77f))
* **rack:** unify inside power palette ([722c3ba](https://github.com/Polyterative/Patcher/commit/722c3ba3d0f23bbfabc3dcb74056efa309cdf3c3))
* **rack:** update row count locally ([4ed6156](https://github.com/Polyterative/Patcher/commit/4ed6156f91f953e8dc53c7eb6f8595b2b55f3654))
* **reactive:** replace switchMap with exhaustMap on remaining write operations ([ffd7ea7](https://github.com/Polyterative/Patcher/commit/ffd7ea7374e003846d7bf9c5b41a27f5ed96ef3e))
* **reactive:** replace switchMap with exhaustMap on write operations ([23831ef](https://github.com/Polyterative/Patcher/commit/23831ef0423bf314fc7b7ddd2c19109a1ae6b030))
* remove shadow from user-area utility search block ([b1a0ffd](https://github.com/Polyterative/Patcher/commit/b1a0ffdac82937ef949ed0f10d3c303f105041f7))
* remove unused CSS classes and adjust component style budgets ([6c8e401](https://github.com/Polyterative/Patcher/commit/6c8e40193f2968df0bddb8cac1c913b88be2b601))
* resolve TS2729 init order in module-details, fix patchTags cache key ([a179b09](https://github.com/Polyterative/Patcher/commit/a179b0943de5b09d541caefbfc3dcf0c02d971c2))
* **responsive:** improve mobile and tablet usability ([b511408](https://github.com/Polyterative/Patcher/commit/b511408d2715863afd5ec2e57c0994bb5d61c192))
* **responsive:** refine tablet drag and patch layouts ([cb4f544](https://github.com/Polyterative/Patcher/commit/cb4f544caf0d295527a058a6281a6abfcbbe3759))
* **responsive:** stabilize drag feedback and tip routing ([2b6c330](https://github.com/Polyterative/Patcher/commit/2b6c3309d8c00032809561ff418fad27bb3194ed))
* **routing:** prevent feature route module leakage ([d67fa68](https://github.com/Polyterative/Patcher/commit/d67fa68a0ec2825c81c2e66ac66ff3061f38f23a))
* **safari:** viewport, backdrop-filter, clipboard, structuredClone + webkit E2E ([f80c57e](https://github.com/Polyterative/Patcher/commit/f80c57eca3794b9f3afd210d3d71f5294014c800))
* **search:** harden browser search states ([25fa9b7](https://github.com/Polyterative/Patcher/commit/25fa9b717ebc69fe22ada845baca9cac81837c05))
* **search:** increased wait time before search for smoother operation ([83a2490](https://github.com/Polyterative/Patcher/commit/83a2490a1ff3f28d553b171160799f80281cf639))
* **security:** harden auth guards across write/delete/storage operations ([e8e9880](https://github.com/Polyterative/Patcher/commit/e8e9880534b7a666acfe9f1fee407890d2d0e3ea))
* **selection-panel:** prevent spurious auto-save on patch open ([41eeb25](https://github.com/Polyterative/Patcher/commit/41eeb253daf5d6d120ea7462274bf4fb4184a254))
* **seo:** canonicalize spa bypass urls ([cd0e693](https://github.com/Polyterative/Patcher/commit/cd0e693f73258fe94f848c8250ed129867ac8a15))
* **seo:** harden middleware caching and bot metadata responses ([9103c54](https://github.com/Polyterative/Patcher/commit/9103c5474920c9539e93aa361132eb9a16c9b3e6))
* **seo:** harden middleware metadata privacy and rack image resolution ([64c1774](https://github.com/Polyterative/Patcher/commit/64c1774a7bc886436e0f2c665d9eabfccc42d107))
* **seo:** replace next server middleware api for edge runtime ([cf664f6](https://github.com/Polyterative/Patcher/commit/cf664f6460e3b9261797b9289460df3d832a9565))
* **seo:** use request host canonical metadata and source diagnostics ([d0a2099](https://github.com/Polyterative/Patcher/commit/d0a209926cdae620484e3cf8425dd29d2c6fa455))
* **shell:** add bottom breathing room to user pages ([2d99d64](https://github.com/Polyterative/Patcher/commit/2d99d64bb5c90bb6e39c74458731176484edbcb0))
* **shell:** stabilize sticky toolbar state ([1a08b1b](https://github.com/Polyterative/Patcher/commit/1a08b1b340ac9793d6791ab3d5601d5b42a0bc9a))
* **shell:** tune wide card surface contrast ([661db6c](https://github.com/Polyterative/Patcher/commit/661db6cc11481d3d9d537bf17f569aab1bc36c6c))
* **sitemap:** add /home to static routes ([06b663a](https://github.com/Polyterative/Patcher/commit/06b663ae23be7f5fee9d9ad3863902ea949ae6de))
* **ssr:** add FlexLayoutServerModule, withFetch(), remove moment dependency ([2a84437](https://github.com/Polyterative/Patcher/commit/2a84437b55accdb54f437940192b3e382eecd399))
* **ssr:** add server.ts to TypeScript compilation ([85defde](https://github.com/Polyterative/Patcher/commit/85defdee9ca1aa8a4e8efc10cf89da2f429fda1a))
* **ssr:** broaden localStorage polyfill for Node.js 22 and skip data-fetch timers during SSR ([2dacd3b](https://github.com/Polyterative/Patcher/commit/2dacd3be5cd3e4dffc303207620f4a3d651104da))
* **ssr:** disable build-time prerender to unblock deploy, rely on on-demand SSR ([39981d8](https://github.com/Polyterative/Patcher/commit/39981d876dc9b5fe5d45e5f0d5c64ab07c7589be))
* **ssr:** export NgModule class from server entry so route extractor works ([92ec57c](https://github.com/Polyterative/Patcher/commit/92ec57c7263a839abf29ae9caa684d656865b9e1))
* **ssr:** harden lottie browser loading ([a97e144](https://github.com/Polyterative/Patcher/commit/a97e14484677e3442ef4cce079b67ebc99ae11c7))
* **ssr:** remove browser commonjs path ([b9760da](https://github.com/Polyterative/Patcher/commit/b9760dafcc2c0bf2c14bc98a6fff7dc03f880304))
* **ssr:** switch to CommonEngine for NgModule SSR compatibility, fix Express 5 wildcard syntax ([1fbbf25](https://github.com/Polyterative/Patcher/commit/1fbbf25ac8335683004f00f6ebbc6d3292bcc3bc))
* **ssr:** use InMemoryStorageStrategy for ts-cacheable in SSR context to avoid localStorage crash on Node.js 22 ([a2d9932](https://github.com/Polyterative/Patcher/commit/a2d9932cac67a1ac0b89a362402533be2bdcc132))
* **ssr:** wire Angular 21 on-demand SSR to Vercel via explicit serverless shim ([b51c5a7](https://github.com/Polyterative/Patcher/commit/b51c5a7ae896a8ab624fa2a4fe506fcbf7669e33))
* **stats:** stabilize detail stat rendering ([70278b5](https://github.com/Polyterative/Patcher/commit/70278b5cb0cbd1103a3db2dcf7f48c42df8bd6f4))
* **styles:** correct font format from opentype to truetype ([499fa5e](https://github.com/Polyterative/Patcher/commit/499fa5eecbaf48079d4bded3b8264e30e02dfe32))
* **styles:** globally centre mat-menu-item icon and label via flex wrapper ([0c32b75](https://github.com/Polyterative/Patcher/commit/0c32b7524fa5a1d40bd825fd4c7e0299899b5513))
* **styles:** prevent repeated font blocking ([e7f8068](https://github.com/Polyterative/Patcher/commit/e7f8068451ceed477575a632e0bf24772ef0c897))
* **styles:** prevent safari horizontal rubber-banding ([df82bad](https://github.com/Polyterative/Patcher/commit/df82bad4398c14c6fb2d770e8bde457465c73e56))
* **supabase.service:** filter public patches and handle null results ([a18c19d](https://github.com/Polyterative/Patcher/commit/a18c19d3ee9d851be6136614444e7090066bd2d5))
* **supabase.service:** implement custom lock to prevent NavigatorLockAcquireTimeoutError during token refresh ([6fac8ea](https://github.com/Polyterative/Patcher/commit/6fac8eafb6cd004e9dc9848881e9e828fe4a9998))
* **supabase.service:** restore patch save ([4e67150](https://github.com/Polyterative/Patcher/commit/4e671506b66ed62a5b3d6ec795997f305476ab96))
* **supabase:** qualify public id token generator ([c34022c](https://github.com/Polyterative/Patcher/commit/c34022cff9bff2c3a55faece4dca7c783cc2fadf))
* **supabase:** run public id helpers as definer ([77be941](https://github.com/Polyterative/Patcher/commit/77be94129f3b3a35a1f4f9081acd3d391ede7efa))
* sync spec constructor calls with current service signatures ([1bdc034](https://github.com/Polyterative/Patcher/commit/1bdc0349d9c9c04d04d4adc02fbec20b8f51e8df))
* **tests:** add isAdmin$ to UserManagementService mock in user-manuals spec ([fb5bd59](https://github.com/Polyterative/Patcher/commit/fb5bd59130aad263d5659a59c071bdac92a1aeee))
* **tests:** fix 4 failing unit tests on Chrome Headless 147 ([eb12e56](https://github.com/Polyterative/Patcher/commit/eb12e56fa9e4450261916a7987c3d43278c6528d))
* **tests:** resolve 15 pre-existing test failures ([79e58e3](https://github.com/Polyterative/Patcher/commit/79e58e398164362cf07a89e4a301aee33c78cfd6))
* **time:** normalize backend timestamps ([90d3587](https://github.com/Polyterative/Patcher/commit/90d3587a747b84f6adeb4c486c62f0aafaf42754))
* **toolbar:** compact sticky shell nav ([81c85a2](https://github.com/Polyterative/Patcher/commit/81c85a26e0780408064517fafc3c11e9110a18e0))
* **toolbar:** relax wide hero description clamp ([ce32436](https://github.com/Polyterative/Patcher/commit/ce324367249d43f7e350d96359444a96d33950ff))
* **toolbar:** show username in wide-shell header ([b58c8e0](https://github.com/Polyterative/Patcher/commit/b58c8e03b382a1c0664a2d42200210299396be96))
* **toolbar:** stabilize sticky nav layout ([02c428d](https://github.com/Polyterative/Patcher/commit/02c428dd15386c18b436e05d1eaf108f33c73384))
* **toolbar:** unify account action styling ([8225ac5](https://github.com/Polyterative/Patcher/commit/8225ac519ca0d1bfccab43cb9ac1773f701a12c7))
* **toolbar:** unify responsive shell navigation ([cf4be70](https://github.com/Polyterative/Patcher/commit/cf4be700b319fb1d985dcd0bc31578916a73935b))
* **touch:** respect explicit matchMedia: undefined in environment override ([606aaa9](https://github.com/Polyterative/Patcher/commit/606aaa923de22ce07f08790a8682d43ddfeba635))
* **ui:** improve linked-rack editing and tooltip placement ([c7116e1](https://github.com/Polyterative/Patcher/commit/c7116e10ccc518921dd16d5e9551728cb4f8ac07))
* **ui:** normalize card title typography ([97b0b49](https://github.com/Polyterative/Patcher/commit/97b0b49c31793515167f080608bcd5dab1909fc8))
* **ui:** polish module detail and loading states ([67fe80d](https://github.com/Polyterative/Patcher/commit/67fe80df5a273a79368b89ab4db57ac4e09b3e9e))
* **ui:** polish tag filter sidebar - group label pill and thin scrollbar ([cb154b9](https://github.com/Polyterative/Patcher/commit/cb154b972c831ba3bea666fd117a6176acfd4531))
* **ui:** refine comment and detail surfaces ([a3894ad](https://github.com/Polyterative/Patcher/commit/a3894ad09f6575c8edda0963cbafca598b8849be))
* **ui:** stabilize async hero titles ([0ef9086](https://github.com/Polyterative/Patcher/commit/0ef9086fd40e708fa2e950d8fc6e1c647ecb8ddc))
* **update-module:** preserve standard=0 (3U Doepfer) stripped by falsy check ([78da589](https://github.com/Polyterative/Patcher/commit/78da589231532079b78101e8427a8b909bbc457d))
* use index.csr.html and allow all hosts for Angular 21 SSR ([c7fc0dd](https://github.com/Polyterative/Patcher/commit/c7fc0dd08162f266897ef7bb21e8c453239d1bd5))
* **user-area:** fetch workspace data on init and keep stats card visible when counts are zero ([902594a](https://github.com/Polyterative/Patcher/commit/902594aa5542225788e7b0d22c56ad55a9d63e52))
* **user-area:** hide unfinished panel preference toggle from user profile ([8e0b159](https://github.com/Polyterative/Patcher/commit/8e0b15902e170e5bfca44e46dc0b6a64aa00a55a))
* **user-area:** preserve module data and sidebar layout ([0493ae7](https://github.com/Polyterative/Patcher/commit/0493ae7f137fdbf9d0c92c922fd0afb152733889))
* **user-area:** remove search shadow and ensure stats card always renders ([a71b022](https://github.com/Polyterative/Patcher/commit/a71b022a153909abc1e424b95223adc63ba8cd4e))
* **user-area:** remove search shadow and ensure stats card always renders ([e3dbb89](https://github.com/Polyterative/Patcher/commit/e3dbb892a3d62f347ad4e51e3cf0b747d0c7b7f6))
* **user-area:** restore section surface contrast ([00161a7](https://github.com/Polyterative/Patcher/commit/00161a7bc020b9f7dac43c50d6bc2a73a9b654ea))
* **user-area:** search before pagination ([1c7c04d](https://github.com/Polyterative/Patcher/commit/1c7c04d9eabb0cbc1977f953e0d314fe0f93d69c))
* **user-comments:** remove unused MatCardSubtitle import ([c384e5b](https://github.com/Polyterative/Patcher/commit/c384e5bfea1d28ca2c502775c83d34be97069c5a))
* **user-management.service:** update tests to use private observables for user state management ([b89fa4b](https://github.com/Polyterative/Patcher/commit/b89fa4bcfacf57655194419bc1eb67479e98d852))
* **user-model:** remove email exposure in queries ([dd00611](https://github.com/Polyterative/Patcher/commit/dd006110c144a21b1f19a8a2d60aa8c2c0f17b1b))
* **vercel.json:** remove functions configuration and retain output directory ([2c3f235](https://github.com/Polyterative/Patcher/commit/2c3f2359525b63230017aa80636393881d479f5f))
* **vercel:** proceed when checks are unavailable ([9ae999e](https://github.com/Polyterative/Patcher/commit/9ae999e032591eed3a52fd6a3986b8642ca2653b))
* **vercel:** route all requests through SSR function, include browser assets in function bundle ([8065a12](https://github.com/Polyterative/Patcher/commit/8065a12ccf55af90f238bc5ad0112833b3c6a033))
* **vercel:** sitemap fix ([46aaa07](https://github.com/Polyterative/Patcher/commit/46aaa07f285a68139d99b53cd3470b31e90ab257))
* **vercel:** update ignoreCommand logic ([858258b](https://github.com/Polyterative/Patcher/commit/858258bc94c366e62b853b743f4481ecf405b085))
* **vercel:** use routes with handle:filesystem so SSR function takes priority over SPA index.html fallback ([f3759c1](https://github.com/Polyterative/Patcher/commit/f3759c17743bb9e16ed9aa9fdda2b72bc8a5c97c))

### [6.1.2](https://github.com/Polyterative/Patcher/compare/v6.1.1...v6.1.2) (2026-05-24)


### Bug Fixes

* **rack-editor:** improve cross-row drag animation and suppress ghost ([fcc1ddb](https://github.com/Polyterative/Patcher/commit/fcc1ddbca57467c8b401a8a3c5b1529e1bbfe09e))
* **rack-editor:** replace HP overflow indicators with animated module border ([e071d93](https://github.com/Polyterative/Patcher/commit/e071d93bbaee4fa0d5c53055942802e508faa3d6))
* **rack-editor:** restore natural drag-and-drop behavior ([d4d40c0](https://github.com/Polyterative/Patcher/commit/d4d40c099f92e35c6f58daca54810d222939b3c0))

### [6.1.1](https://github.com/Polyterative/Patcher/compare/v6.1.0...v6.1.1) (2026-05-24)


### Features

* **module-browser:** restructure tag filter UI and fix tag type handling ([ef58f83](https://github.com/Polyterative/Patcher/commit/ef58f83678a73949094d43f406858aea10196333))


### Bug Fixes

* **balance-analysis:** repair broken axis scoring after tag type restructure ([9863332](https://github.com/Polyterative/Patcher/commit/9863332f3ec78ea1f96bf2a1b706822194a7e872))
* **rack-function-visuals:** show most-voted tag as primary tooltip label ([66c388d](https://github.com/Polyterative/Patcher/commit/66c388d2628105b674fc84c0361719f8569f69fd))

## [6.1.0](https://github.com/Polyterative/Patcher/compare/v6.0.2...v6.1.0) (2026-05-19)


### Features

* **collection:** add module possession states — Own / Want / Sell segmented control ([dfacc2a](https://github.com/Polyterative/Patcher/commit/dfacc2a781206e22fa078bc1744fc315b6a3b0f0))
* **collection:** filter module pickers to HAS+SELLS — exclude WANTS from patch editor + rack creator ([9bd0147](https://github.com/Polyterative/Patcher/commit/9bd0147e1f01c918865f2f5bd11f990140b6c74d))
* **collection:** merge module possession states (Layer 1+2) from agent/autonomous-20260515 ([4cc3e67](https://github.com/Polyterative/Patcher/commit/4cc3e67f5ccb0d79aaea82c91a732a94d6b081a4))
* **collection:** show SELLS inline badge in module-minimal meta row ([8e10db8](https://github.com/Polyterative/Patcher/commit/8e10db811544a59964e4c4ed9dd9fbda43e78f4f))
* **forms:** add preset quick-select chip overlay to mat-form-entity ([354d8cb](https://github.com/Polyterative/Patcher/commit/354d8cb9a5fa7ef931abca00e7b318cedb1b03a9))
* **manufacturer-detail:** add Standard / HP / tag client-side filters to module list ([dc1a9eb](https://github.com/Polyterative/Patcher/commit/dc1a9ebadda7fb062a6dac7a92cf5d50b5087b0e))
* **module-browser:** add community possession stats card on module detail page ([07139e0](https://github.com/Polyterative/Patcher/commit/07139e0a14afc22ca7100a2c84a41f84409e98b0))
* **module-browser:** replace mat-paginator with load-more button ([c874817](https://github.com/Polyterative/Patcher/commit/c874817a7c93e9cd8a8fd0df3c942995eba03f18))
* **module-browser:** replace tag MULTISELECT with grouped chip picker + AND/OR toggle + best-match sort ([277e645](https://github.com/Polyterative/Patcher/commit/277e6457a448ca37c62d938470c806d0d79f3691))
* **module:** add possession dialog ([a109d58](https://github.com/Polyterative/Patcher/commit/a109d58b874a354024a897148ba9bdeb6febbdbc))
* **pagination:** replace mat-paginator with Load More button in patch and manufacturer browsers ([25240a4](https://github.com/Polyterative/Patcher/commit/25240a445e602cead50e1c23110d03497e76bb03))
* **public-profile:** replace mat-paginator with load-more for racks and patches tabs ([f796f72](https://github.com/Polyterative/Patcher/commit/f796f72ac9697c6c825c2c1e73a1cc94541b48bb))
* **rack-browser,user-racks:** replace mat-paginator with load-more buttons ([a4f4fe2](https://github.com/Polyterative/Patcher/commit/a4f4fe250182bd3cdf99db13921a0e29d90a4ceb))
* **rack-editor:** add exit animation to module tile on delete ([8b04dd3](https://github.com/Polyterative/Patcher/commit/8b04dd3e16d84156ab3f2d41b5adf3e57d2b32c6))
* **rack-editor:** quick-add blank panel shortcut strip on row hover ([76030b9](https://github.com/Polyterative/Patcher/commit/76030b99647838f486bb7e282827c1753df86b04))
* **rack-editor:** row HP overflow indicator with per-row badge and summary ([62dc868](https://github.com/Polyterative/Patcher/commit/62dc868f898eca8c6879e54b0a466c95a284b272))
* **user-area:** filter module collection states ([4ff72bf](https://github.com/Polyterative/Patcher/commit/4ff72bfb08a740ca76749dadb9e1666fe096738a))


### Bug Fixes

* **browser:** harden loading and empty states ([017b6d4](https://github.com/Polyterative/Patcher/commit/017b6d43b277c98bbc8932375e9c31732afea4c3))
* **browser:** improve load more pagination ([e0752f6](https://github.com/Polyterative/Patcher/commit/e0752f6779d3f96c9f345a8905bc73e5295f8fae))
* **ci:** add packages field to pnpm-workspace.yaml for pnpm 11 compat ([b122b78](https://github.com/Polyterative/Patcher/commit/b122b789df5101fb2fa97775f958bde66c90292d))
* **ci:** downgrade packageManager to pnpm@10.33.4 ([e91f27a](https://github.com/Polyterative/Patcher/commit/e91f27a9d079a5f811e3c112c97a63d97c85b6d3))
* **ci:** downgrade to pnpm@10.33.4 and use --no-frozen-lockfile for Vercel ([389ddad](https://github.com/Polyterative/Patcher/commit/389ddadb49d47a286176711c8ebb4a1c446f0379))
* **ci:** force corepack pnpm in Vercel installCommand to use pnpm@11 ([f740cbb](https://github.com/Polyterative/Patcher/commit/f740cbb672b99586cb11392074a8966fcdf897a1))
* **ci:** gate Vercel deploy on GitHub Actions check-runs ([3a913da](https://github.com/Polyterative/Patcher/commit/3a913da73de8d582ff935e425bc75ed69af77e06))
* **ci:** port CI publish chain from develop ([4d9207c](https://github.com/Polyterative/Patcher/commit/4d9207cb2f15c4646d9e3a698b03f3d19ef3d08d))
* **ci:** regenerate lockfile with pnpm@10 to include overrides ([348e658](https://github.com/Polyterative/Patcher/commit/348e658bc579bb0236114244545dd802ca068582))
* **ci:** remove --frozen-lockfile from Vercel installCommand to fix pnpm overrides mismatch ([8ab1269](https://github.com/Polyterative/Patcher/commit/8ab12697e4a57625b28d77214446686d7804d0e6))
* **ci:** remove duplicate packages keys in pnpm-workspace.yaml ([893dd6a](https://github.com/Polyterative/Patcher/commit/893dd6aa7cfaa37a87fd812107e89ed361e71558))
* **ci:** replace jq with node for JSON parsing in vercel-ignore-build.sh ([a03002f](https://github.com/Polyterative/Patcher/commit/a03002f563e5c564e28f3fd4f5016a7dddbfc99f))
* **module-browser:** fix Schneidersladen search URL + tooltip + audit comment ([9726b8e](https://github.com/Polyterative/Patcher/commit/9726b8e432cdd119c9286eb0b0735107136b959a))
* **module-browser:** improve mobile filter actions ([1402a98](https://github.com/Polyterative/Patcher/commit/1402a98675101c4be4af83e12b531ced3dfaeb55))
* **module-browser:** suppress empty-state when server reports more items to load ([3caf9ca](https://github.com/Polyterative/Patcher/commit/3caf9ca9637480fc80013409470df567fbf58afa))
* **module:** fix imageless placeholder width in fixedHeight mode ([44e08ca](https://github.com/Polyterative/Patcher/commit/44e08cab714ecb96e29f2acab40ddb9596c8a568))
* **module:** restore placeholder visibility by removing lib-screen-wrapper wrapper ([90e1d02](https://github.com/Polyterative/Patcher/commit/90e1d02516b34d72635668f32e1b31f6ccf8e11d))
* **module:** use explicit ngStyle width+height on 1U placeholder div ([31b6856](https://github.com/Polyterative/Patcher/commit/31b6856cd69d1ee87cc83d5e7aa6193086a55cd2))
* **rack-browser:** make load-more button reactive with async pipe ([62c5788](https://github.com/Polyterative/Patcher/commit/62c57885957021c645ce7940dd47c1ca8a71624b))
* **rack-browser:** remove scroll-to-top on load-more ([e6f921e](https://github.com/Polyterative/Patcher/commit/e6f921e36111c9684e6d62ceadc003aef68f76a4))
* **rack-editor:** add optimistic rollback on remove and reorder failures ([b0036d8](https://github.com/Polyterative/Patcher/commit/b0036d833fd247d4f7b94a9c0d451149ca51a828))
* **rack-editor:** make blank panel shortcut strip an overlay (position:absolute) ([6646faf](https://github.com/Polyterative/Patcher/commit/6646fafc370fb1fac1569651526f37879ed766ab))
* **rack-editor:** restore drag-and-drop module preview (cdkDragPreview) ([f611785](https://github.com/Polyterative/Patcher/commit/f611785a086c9d98b57ca9c3cf2a67ad283fc116))
* **tests:** add isAdmin$ to UserManagementService mock in user-manuals spec ([a527f74](https://github.com/Polyterative/Patcher/commit/a527f7454bc5b143b0dbe1710fa322aac337a1b6))
* **tests:** fix 4 failing unit tests on Chrome Headless 147 ([b3b3cc6](https://github.com/Polyterative/Patcher/commit/b3b3cc6289e6c2564bc1ec47a1339190a0690068))
* **touch:** respect explicit matchMedia: undefined in environment override ([404d88f](https://github.com/Polyterative/Patcher/commit/404d88f305c42fb0ba0cc58eeb1019f2a9804148))
* **ui:** polish tag filter sidebar - group label pill and thin scrollbar ([2460c89](https://github.com/Polyterative/Patcher/commit/2460c89d9c586eeeab5d682e1c86ef512254a812))

### [6.0.2](https://github.com/Polyterative/Patcher/compare/v6.0.1...v6.0.2) (2026-05-17)


### Bug Fixes

* **module:** use explicit ngStyle width+height on 1U placeholder div ([90a4b19](https://github.com/Polyterative/Patcher/commit/90a4b19ba404010056c88bd552a3d8ff80bee483))

### [6.0.1](https://github.com/Polyterative/Patcher/compare/v6.0.0...v6.0.1) (2026-05-15)

### Features

* **a11y:** add skip-to-content link and main landmark to app shell ([0c6853a](https://github.com/Polyterative/Patcher/commit/0c6853a2b6ae309cdb8715f681489020b34de64b))
* **changelog:** upgrade to new toolbar and refine UI to match app standard ([2807a9b](https://github.com/Polyterative/Patcher/commit/2807a9be557659215ed3cbc913d9517cf18e1af7))
* **manufacturer:** logo display, standard grouping default, data-report guidance ([7247874](https://github.com/Polyterative/Patcher/commit/72478744d3b8706c5a19cd43122a11ea3a47d27c))
* **manufacturer:** set og:image to logo URL for richer social sharing ([994f68f](https://github.com/Polyterative/Patcher/commit/994f68fb7797a207800d8699535a732941f018ad))
* **module-detail:** include panel image in og:image / twitter:image meta ([d68975d](https://github.com/Polyterative/Patcher/commit/d68975d204b0c8d7fac4bb8ca20d5ca8959c6bca))
* **public-profile:** set user avatar as og:image for social card previews ([cf4b861](https://github.com/Polyterative/Patcher/commit/cf4b861f5deab887b04b7a069bdc4042cd7d28c4))
* **security:** replace enumerable rack/patch IDs with opaque public_id token URLs ([f03e3cb](https://github.com/Polyterative/Patcher/commit/f03e3cb63af8412ceda13bd9d6ea68d81a0fce90))
* **seo:** add manufacturer detail metadata to SEO middleware ([907e676](https://github.com/Polyterative/Patcher/commit/907e676a1b8d0b51c614ab426409aff44319bb12))
* **seo:** add manufacturer pages to sitemap ([b530cd1](https://github.com/Polyterative/Patcher/commit/b530cd1156bc812c81cdcfc79ffcbda2860b3979))
* **seo:** add og:image to rack detail metadata; add SEO unit tests ([88430a8](https://github.com/Polyterative/Patcher/commit/88430a869ced6cbfce5a5d5544ea083e9d7a8c74))
* **ux:** add copy-share-link button to my racks/patches and cache token RPC reads ([81b0e08](https://github.com/Polyterative/Patcher/commit/81b0e0898db2666fddfb9aa0f5dde9758c2a9747))


### Bug Fixes

* **a11y:** add aria-label to all remaining icon-only buttons ([dcbdd9e](https://github.com/Polyterative/Patcher/commit/dcbdd9eda81da62e0ddd9aca3267ff4f4afdcf10))
* **a11y:** add aria-label to icon-only buttons in comments and module-minimal ([5d525f2](https://github.com/Polyterative/Patcher/commit/5d525f2b3e4da24d663fde3c21f71cf2bca245ec))
* **a11y:** add role=alert to standalone password-mismatch mat-error ([6aa8237](https://github.com/Polyterative/Patcher/commit/6aa8237e056983c4fc9e3b26602c2aba09b15c0f))
* **a11y:** add role=link and tabindex to module-strip cards in manufacturer row ([eddb99c](https://github.com/Polyterative/Patcher/commit/eddb99ceb519cafb569b6006853edac498d6bc56))
* **a11y:** make CV-item interactive element keyboard accessible ([ff7ad24](https://github.com/Polyterative/Patcher/commit/ff7ad248920ea29d8b6e56ac9042adf85786aa78))
* **a11y:** make routerLink-driven title and image containers keyboard accessible ([205ff3a](https://github.com/Polyterative/Patcher/commit/205ff3a603ddba1d7366d062c027a91ca3bed146))
* **a11y:** remove nested <main> in home page ([b258e18](https://github.com/Polyterative/Patcher/commit/b258e18d11f6f55707c841a75d6e6ba36e723412))
* **admin-flags:** add delete confirmation and sort order toggle ([06fca8b](https://github.com/Polyterative/Patcher/commit/06fca8b5d525fb24f829a5b49926850d249ac93c))
* **admin:** use wide shell navigation ([4e8a829](https://github.com/Polyterative/Patcher/commit/4e8a829931f04eff64617e332b6c342742c3f353))
* **cache:** add missing rackWithId/racksMinimal invalidations in rack mutation ops ([d5fc8ec](https://github.com/Polyterative/Patcher/commit/d5fc8ec9eaf285c5f50a5dbe24d3a9aabd7e4b21))
* **changelog,faq:** point roadmap links to ROADMAP.md instead of dev backlog ([0c40884](https://github.com/Polyterative/Patcher/commit/0c40884ff6527e0b262dd4944c5d84e11c619945))
* **docs:** record spacing pass ([4a69e5e](https://github.com/Polyterative/Patcher/commit/4a69e5ecd40513335d31127528bb93f84c913160))
* **e2e:** repair 6 pre-existing spec failures ([c17e763](https://github.com/Polyterative/Patcher/commit/c17e76301f6cf25c01a5deee0f091646a229c579))
* **e2e:** update navigation spec selector after main→div rename ([1f809b7](https://github.com/Polyterative/Patcher/commit/1f809b728808b129474a1aad4b6102356fe667cc))
* **event-banner:** align banner spacing to scale ([1183842](https://github.com/Polyterative/Patcher/commit/118384241ea7e0b579098b604dfaead69722a9f1))
* **home:** normalize landing spacing scale ([0baa0b9](https://github.com/Polyterative/Patcher/commit/0baa0b9dfdf1decf513d535edffdc6b508df95d0))
* **module-editor:** stack setup sections ([ca502a2](https://github.com/Polyterative/Patcher/commit/ca502a2a7ec31a09c4630c2d93a77c046ee3428f))
* **patch-editor:** show 'No rack linked yet' when kind is unlinked ([4394865](https://github.com/Polyterative/Patcher/commit/4394865a1905e2b8ff7261208eb0acad48606856))
* **patch:** use editorConnections$ for empty-state source in patch-details template ([50af7e7](https://github.com/Polyterative/Patcher/commit/50af7e75b47ff5809860bcd2e7d62650af41d0fb))
* **rack:** handle missing preview images ([ed4a7d1](https://github.com/Polyterative/Patcher/commit/ed4a7d181f02d9f574331a419804695c49ad3ae0))
* **racks:** add DB triggers to bump parent updated on child-table writes ([6ccd18a](https://github.com/Polyterative/Patcher/commit/6ccd18ad64852569c6a64d45f823d29d9e31b442))
* **racks:** make old-image delete best-effort and surface update.rack errors in preview flow ([1feefcf](https://github.com/Polyterative/Patcher/commit/1feefcf22e2dc7d1736fe49bc13d4eba1c505dfd))
* **reactive:** replace switchMap with exhaustMap on remaining write operations ([25ec05a](https://github.com/Polyterative/Patcher/commit/25ec05a1ee7a05505b073dc5b6f81d4b162d3c7e))
* **reactive:** replace switchMap with exhaustMap on write operations ([f16ecf0](https://github.com/Polyterative/Patcher/commit/f16ecf00b8deb41b034a6d48bd541a9d5a01a051))
* **supabase:** qualify public id token generator ([e88e5b7](https://github.com/Polyterative/Patcher/commit/e88e5b7601eb491bf654f07957d360d516776ce0))
* **supabase:** run public id helpers as definer ([ea85cb1](https://github.com/Polyterative/Patcher/commit/ea85cb1e9b0d246f575da5e8dc311a855a3e5fa1))

## [6.0.0](https://github.com/Polyterative/Patcher/compare/v5.7.3...v6.0.0) (2026-05-13)


### Features

* add linked rack controls to patch details ([042d9bb](https://github.com/Polyterative/Patcher/commit/042d9bb1c4829de542f9200b7bfd6a86232bd0f2))
* add linked rack schema groundwork ([92dcfb6](https://github.com/Polyterative/Patcher/commit/92dcfb627016b8ab0a733a74507ce9fea4a9ccb9))
* add patch editor linked rack mode ([94a8dac](https://github.com/Polyterative/Patcher/commit/94a8dacae4254e3dbec2c98c17d46fbb1bb825c0))
* **comments:** bound comment cards on host pages ([5330955](https://github.com/Polyterative/Patcher/commit/5330955860ecf8c514a9eb3b0c0b693a17b46638))
* **comments:** bound wide-screen comment rails ([dc9540a](https://github.com/Polyterative/Patcher/commit/dc9540a9f025e99265c0e1af37a6ef32fbd97e5f))
* **empty-state-tips:** add compact banner variant ([75fa833](https://github.com/Polyterative/Patcher/commit/75fa833ab50d1c3465c9ca87c3528e430584050a))
* **insights:** load page from backend snapshot ([7d45778](https://github.com/Polyterative/Patcher/commit/7d4577880d41c153f3fd1c3e38449cf52608841c))
* **layout:** align faq shell support rail ([1c89c3e](https://github.com/Polyterative/Patcher/commit/1c89c3e462b45f74e37a0bb9121f8240fa8ed11f))
* **layout:** align root shell support surfaces ([137728c](https://github.com/Polyterative/Patcher/commit/137728c19b0e3b57591cda705d3af3ffdfdd802b))
* **layout:** align wide shell navigation groups ([ea68d8e](https://github.com/Polyterative/Patcher/commit/ea68d8efc7d66f40d409c30d58f70b4b1bb8a698))
* **layout:** modernize footer shell layout ([7d0d46e](https://github.com/Polyterative/Patcher/commit/7d0d46e2ad027d892cd1c9255e85430718d4b483))
* **layout:** scope floating surfaces to shell ([f0f6d76](https://github.com/Polyterative/Patcher/commit/f0f6d76dfa74353448993feadd685ac38ea8ea2b))
* make linked rack modules interactive in patch editor ([6765600](https://github.com/Polyterative/Patcher/commit/6765600979d2109bec2226adc143e70abb79716a))
* **module-adder:** rework submit page with stepper, sidebar duplicate check and celebration overlay ([7e30385](https://github.com/Polyterative/Patcher/commit/7e3038523edb0ae459b465e49f1641d59b53a843))
* **module-browser:** stabilize tag filter loading ([852ba4e](https://github.com/Polyterative/Patcher/commit/852ba4ecbbb59eb8c620bd26bc77cec35a96cfa9))
* **module-details:** add hidden usage buckets ([13b3d55](https://github.com/Polyterative/Patcher/commit/13b3d55f2600f33972dd262f8d3d7c991f5d781d))
* **patch-detail:** restructure layout with stats, modules, graph sections ([23b2b12](https://github.com/Polyterative/Patcher/commit/23b2b1263bb45813fec3ac65d8360def33583605))
* **patch-detail:** simplify modules-needed rows ([ed16a80](https://github.com/Polyterative/Patcher/commit/ed16a803a63861c2f01938100c556657667599fd))
* **patch-details:** polish linked rack editing ui ([ad1ac73](https://github.com/Polyterative/Patcher/commit/ad1ac73c202700d84c70ecb13792a25e31ba7dae))
* **patch-editor:** clarify workspace controls ([790f6cb](https://github.com/Polyterative/Patcher/commit/790f6cb5a29da5b4d66f30bbc71041ee7d9964e0))
* **patch-editor:** linked rack visual with inline CV panel and connection feedback ([06bf53a](https://github.com/Polyterative/Patcher/commit/06bf53a4d71feb9b99b6ed88b0b1b2f5816dc42f))
* **patch-editor:** per-copy rack instance sync with visual feedback ([b7857d5](https://github.com/Polyterative/Patcher/commit/b7857d5831206fd43cdadbd63e0319c944f9a0c6))
* **patch-editor:** polish linked rack context ([43b3d8d](https://github.com/Polyterative/Patcher/commit/43b3d8d087fcb2fb3c84097f2a01978b74884419))
* **patch-editor:** rack cache fix and divergence detection ([6f349a6](https://github.com/Polyterative/Patcher/commit/6f349a6a46b9ccd3cd59e5178781e2966781480d))
* **patch-editor:** responsive rack visual with auto-scale and overlay CV popup ([fc87ac0](https://github.com/Polyterative/Patcher/commit/fc87ac0909a7b3e6dd10a7dfe3a16ff955ae503d))
* **patch-editor:** ux refinements, race condition fix, style consistency ([afa05ad](https://github.com/Polyterative/Patcher/commit/afa05ada51499d699d266ed8064b36fb9f7e9d54))
* **patches:** enrich linked rack help ([ba304cb](https://github.com/Polyterative/Patcher/commit/ba304cb97b51fce46f369cac90945051047bf982))
* **patch:** show linked rack to guests and non-owners in read-only mode ([6500485](https://github.com/Polyterative/Patcher/commit/650048572d672a8a124e493b3ed35ae8353b2cba))
* **patch:** show mode-aware empty-state tips in editor and hide stats when no connections ([3615212](https://github.com/Polyterative/Patcher/commit/3615212019c62e9150fd629b9e8075261019fc37))
* **profile:** refresh user area layout and stat icons ([fd4fbfb](https://github.com/Polyterative/Patcher/commit/fd4fbfbf5ca38072d7d223422444e06fa9b6c016))
* **rack:** add one-click linked patch creation ([3aac565](https://github.com/Polyterative/Patcher/commit/3aac565e0503f7f786040fabad74c76be60090aa))
* **rack:** guide first-time placement with empty-state tips and scroll-into-view on picker add ([274e5bf](https://github.com/Polyterative/Patcher/commit/274e5bf3d88adb844e7f28b5b1e15a189fa492aa))
* **rack:** refine module chooser browsing ([b5b6b05](https://github.com/Polyterative/Patcher/commit/b5b6b052136d4ccf37a90c814390991b6cc71d31))
* **shell:** polish embedded header layouts ([5783f9a](https://github.com/Polyterative/Patcher/commit/5783f9a2686bd8e8ea16c6627dbe5e56ed409789))
* **toolbar:** preserve branded home link states ([dc0dfb0](https://github.com/Polyterative/Patcher/commit/dc0dfb0f468872fa5e606373c342d921371c6c94))
* **toolbar:** refine embedded shell rollout ([1ef3693](https://github.com/Polyterative/Patcher/commit/1ef36937494b16397f7d2e916c1df8385228e88b))
* **ui:** align app surface consistency ([2461cfa](https://github.com/Polyterative/Patcher/commit/2461cfacad660c4f48eb9dc5828a5f99f9934a94))
* **ui:** checkpoint current product refinements ([6c193d7](https://github.com/Polyterative/Patcher/commit/6c193d76027b8625d1fc4c5f2eccbda629d7d1ad))
* **ui:** polish patch and rack workflows ([39b62ab](https://github.com/Polyterative/Patcher/commit/39b62abc93ebac157a91131717f8f92bfc0a5d54))
* **ui:** redesign notices and linked rack picker ([c29bedd](https://github.com/Polyterative/Patcher/commit/c29bedd36b2c496b2cc2b2c8bc2576e0eb195f59))
* **user-area:** add owned column scroll shells ([dd2131b](https://github.com/Polyterative/Patcher/commit/dd2131bd248104d11abf0573b74fc2086cab4b6d))
* **user-area:** bound utility rail column ([2a51037](https://github.com/Polyterative/Patcher/commit/2a51037c1982a43f265ec8d4e8ff67fdd458986d))
* **user-area:** bound workspace search surface ([720e7a2](https://github.com/Polyterative/Patcher/commit/720e7a2c8cb5aec587541b25554fe43d904f2ae4))
* **user-area:** compact profile header status ([50b881c](https://github.com/Polyterative/Patcher/commit/50b881c0c3be29ca08c842cfed914db199f07c93))
* **user-area:** compact utility rail content ([be6f587](https://github.com/Polyterative/Patcher/commit/be6f587ab4ea538926ede4615309b90e01bec652))
* **user-area:** compact utility rail statistics ([60d701d](https://github.com/Polyterative/Patcher/commit/60d701df48c357c1940fa7ba6082d8d27d8efa05))
* **user-area:** establish workspace column grid ([92e720d](https://github.com/Polyterative/Patcher/commit/92e720d3056e553d6e7b806a13c612e33747ac06))
* **user-area:** move search into utility rail ([207cb17](https://github.com/Polyterative/Patcher/commit/207cb1730d0c7dc30801ab4e9e2935c0be20194f))
* **user-area:** normalize owned section layout ([4f43e85](https://github.com/Polyterative/Patcher/commit/4f43e856fd94215217137cb9f43cb52fad2a28fa))
* **user-area:** replace plain empty-state subtitles with empty-state-tips across modules, racks, patches and comments ([de1860c](https://github.com/Polyterative/Patcher/commit/de1860cc683bea7f94af8c909e429a5ff4e2218e))
* **user-area:** stack utility rail earlier ([b569cd9](https://github.com/Polyterative/Patcher/commit/b569cd90623ab01184a28440901b4ecfb0f898b6))
* **user-manuals:** replace MatCardSubtitle empty states with empty-state-tips ([13e909e](https://github.com/Polyterative/Patcher/commit/13e909eace6ce09fef27498ebcf5172bf000e861))


### Bug Fixes

* **app:** harden monkey flow regressions ([b88504c](https://github.com/Polyterative/Patcher/commit/b88504c74d4a67e333d1638b60f5bcab047b2a3b))
* **details:** align readable rails and overlay positioning ([6015a5c](https://github.com/Polyterative/Patcher/commit/6015a5c44c5418739a1d302d8a313c514a186a14))
* **details:** streamline linked rack and patch actions ([e161ebf](https://github.com/Polyterative/Patcher/commit/e161ebf5cd3e17e82ece915bdefd50e05dcc394f))
* **discovery-tips:** correct anchor targets for action-oriented tips ([08858a3](https://github.com/Polyterative/Patcher/commit/08858a37c114502d3156e4e3fe2fe060f12184df))
* **e2e,types:** resolve 6 TypeScript errors in e2e specs and playwright config ([2e25cb1](https://github.com/Polyterative/Patcher/commit/2e25cb1f5875fdf3a073612e920bd59106d1fa56))
* **flexbox-row-fast:** cap item max-width via CSS vars to prevent last-item stretch ([5d923af](https://github.com/Polyterative/Patcher/commit/5d923aff9a235a5fbd408b4fbf7d0314aeeb10ea))
* guard linked rack writes before schema rollout ([5113a5d](https://github.com/Polyterative/Patcher/commit/5113a5d050698cd32ffff326817187376b86a1aa))
* hide linked rack summary card when edit mode is open ([fb8f0fc](https://github.com/Polyterative/Patcher/commit/fb8f0fc1dcf6f1c3adb3187d8645389a230049e2))
* keep linked rack optional across patch creation ([80ae670](https://github.com/Polyterative/Patcher/commit/80ae6703cf1be54bef88a05bfabc976dddb4956e))
* **layout:** unify page widths and brand link colors ([d022154](https://github.com/Polyterative/Patcher/commit/d0221549413cc5c6c14b3cfc54462987b3e98ffb))
* **module-cv:** narrow touch-first chip sizing ([37b8947](https://github.com/Polyterative/Patcher/commit/37b8947284be25a417d33dea59bff92567647050))
* **module-detail:** refine editor responsive layout ([1e5240b](https://github.com/Polyterative/Patcher/commit/1e5240b8342bc29f8146013441c65e8c2f34e252))
* **module-editor:** add spacing under setup titles ([2a166fb](https://github.com/Polyterative/Patcher/commit/2a166fb91482b59bfc9eb821284204317d61f68a))
* **module-editor:** preserve unspecified CV ranges ([7dd898e](https://github.com/Polyterative/Patcher/commit/7dd898e1337dd7ece92d3a1bbab1314de688d869))
* **module-editor:** restore floating action overlay ([f1abb83](https://github.com/Polyterative/Patcher/commit/f1abb83a45ca1976eb126186ea367eff7d5fc664))
* **module-tile:** hide empty action divider ([43d2333](https://github.com/Polyterative/Patcher/commit/43d23330d8b03dbbf0aa90903a16aa58a473d6c5))
* **modules:** allow admin to delete complete modules and improve submit flow ([5355f57](https://github.com/Polyterative/Patcher/commit/5355f5799fb98e84f6eecf84ec658d1a7c6e53b0))
* **patch-browser:** tighten modules-needed counters ([26b2e66](https://github.com/Polyterative/Patcher/commit/26b2e667aa7e8c746106f9bb5baa42ff50a073f0))
* **patch-detail:** fail clearly for private links ([32dc001](https://github.com/Polyterative/Patcher/commit/32dc001912b62b279c736ed0de207972bb2b27fe))
* **patch-editor:** contain horizontal overflow in edit mode ([5c37270](https://github.com/Polyterative/Patcher/commit/5c37270079efc0f97cce9e2056151d61e528bc6d))
* **patch-editor:** guard linked rack editing edge cases ([d1bf9e8](https://github.com/Polyterative/Patcher/commit/d1bf9e83a7adf96f165208e38630df1f5d7fb161))
* **patches:** harden linked rack state ([8e935df](https://github.com/Polyterative/Patcher/commit/8e935df0d2f7cab7e007e41404550aa82ef38458))
* **patch:** fix readonly rack layout overlap with flow-positioned screen ([99ec96d](https://github.com/Polyterative/Patcher/commit/99ec96de702b2728711cb4e1de8f420963ff4ef3))
* **patch:** hide rack hint text in readonly view ([4f98862](https://github.com/Polyterative/Patcher/commit/4f98862fda5a03d36a49580e125e1c269ddec535))
* **patch:** make linked rack preview clickable ([a9d0ad0](https://github.com/Polyterative/Patcher/commit/a9d0ad0fe24375c461f590ececa285558bafd68b))
* **patch:** restore auto-scale and centering for readonly rack view ([efacfbd](https://github.com/Polyterative/Patcher/commit/efacfbd3370f641202475883168adfa0abfdfb8d))
* **public-profile:** add bottom shell breathing room ([c4b7b2b](https://github.com/Polyterative/Patcher/commit/c4b7b2b3d55627f21854c3c2f33df65f8b9438e1))
* **rack-balance:** exclude blank modules from coverage ([003dab4](https://github.com/Polyterative/Patcher/commit/003dab468bee2212c9883c44f482ce05ddc57ca0))
* **rack-detail:** hide hp badges during image capture ([2a76363](https://github.com/Polyterative/Patcher/commit/2a7636387c5ddcf62a9e1ef526863721a6a77d87))
* **rack-signal-analysis:** import missing sortNames and CV ([ee3a32f](https://github.com/Polyterative/Patcher/commit/ee3a32f40fab5e05dfba01947df3ccf201bc80fd))
* **rack:** restore right-click context menu actions and add e2e coverage ([e86bee0](https://github.com/Polyterative/Patcher/commit/e86bee03c1896092d4afe9d888a40f24eb6ad78b))
* **search:** harden browser search states ([6d8f604](https://github.com/Polyterative/Patcher/commit/6d8f6043dce32183b61f75d6e1a529e7dd8599ae))
* **shell:** add bottom breathing room to user pages ([ab649fc](https://github.com/Polyterative/Patcher/commit/ab649fcfaced688d548f896823a807eb0e65dd6a))
* sync spec constructor calls with current service signatures ([c837f10](https://github.com/Polyterative/Patcher/commit/c837f10a613529832e7c46e80ea6780629d0e705))
* **toolbar:** relax wide hero description clamp ([87f1b1b](https://github.com/Polyterative/Patcher/commit/87f1b1ba2c178950375193cf7d936a7cfb36629b))
* **toolbar:** show username in wide-shell header ([05b6655](https://github.com/Polyterative/Patcher/commit/05b66554354457d68f6d92fc3813a8b50fc34a94))
* **toolbar:** unify account action styling ([75530f4](https://github.com/Polyterative/Patcher/commit/75530f4327b59e83a3ca3104110e417190253b32))
* **ui:** improve linked-rack editing and tooltip placement ([0c1c65e](https://github.com/Polyterative/Patcher/commit/0c1c65e629e706f7ef4821ea120cf8dbc39eca8d))
* **user-comments:** remove unused MatCardSubtitle import ([afec7a9](https://github.com/Polyterative/Patcher/commit/afec7a9bbc84b23d5dd6ed03a845cbadbaa76c06))

### [5.7.3](///compare/v5.7.2...v5.7.3) (2026-05-12)


### Bug Fixes

* **module-browser:** show loading state on filter input 9432455

### [5.7.2](https://github.com/Polyterative/Patcher/compare/v5.7.1...v5.7.2) (2026-05-11)


### Features

* **footer:** add changelog link ([0c58ad3](https://github.com/Polyterative/Patcher/commit/0c58ad3a4bce17e589305418b1cb7b745a4970d9))
* **home:** soften insights framing ([76b4b56](https://github.com/Polyterative/Patcher/commit/76b4b565f4d3ed455fad135f5401481bc069acbc))


### Bug Fixes

* **app:** tighten admin gating and refresh docs links ([968aca0](https://github.com/Polyterative/Patcher/commit/968aca086e27fcc2962a23f7c651922d98df5813))
* **backend:** keep public patches visible from private profiles ([fd4aab9](https://github.com/Polyterative/Patcher/commit/fd4aab99824553cb0d5e2eb4387bece79ce727ce))
* **e2e:** stabilize owned detail coverage ([e860ff4](https://github.com/Polyterative/Patcher/commit/e860ff4dc136792b0eecb25ac74257e345097626))
* **e2e:** wait for screenshot surfaces to settle ([8f03cc4](https://github.com/Polyterative/Patcher/commit/8f03cc40a2396684ba64f76aa92c545c9a866573))
* **patches:** respect auth state in detail view ([b5d389d](https://github.com/Polyterative/Patcher/commit/b5d389de3fcd3ba094542d4c5d728424324eeb48))
* **ui:** polish module detail and loading states ([c38b598](https://github.com/Polyterative/Patcher/commit/c38b59850730768f7b617e1cb7452522ed59df5b))

### [5.7.1](https://github.com/Polyterative/Patcher/compare/v5.7.0...v5.7.1) (2026-05-04)


### Features

* **module-details:** adapt portrait module layouts ([fef4c47](https://github.com/Polyterative/Patcher/commit/fef4c47d8039ecbf3d94204f5c6479856233e0e3))
* **module-details:** streamline module card tagging ([76edef6](https://github.com/Polyterative/Patcher/commit/76edef697bd22a9043ed8c45f77af670ae149396))
* **rack:** refine and pause signal analysis mode ([849c4ab](https://github.com/Polyterative/Patcher/commit/849c4abdf8d639bf3ed6fc3ff01b25bd3547b7b9))
* **tablet:** harden ipad pro editing flows ([e2fe133](https://github.com/Polyterative/Patcher/commit/e2fe1335db2132418db931105bf902025ce2826d))


### Bug Fixes

* **module-details:** refine animation sequencing ([cd37396](https://github.com/Polyterative/Patcher/commit/cd37396fb53899407e395900c749e81ef84fe131))
* **patches:** harden module lookups and public defaults ([860ca97](https://github.com/Polyterative/Patcher/commit/860ca97240a06baef3b4ac529c5e92be868a2bd9))
* **rack-editor:** tighten mobile spacing ([c2f07a1](https://github.com/Polyterative/Patcher/commit/c2f07a13efedf9af449d77682b6245566c1e68dd))

## [5.7.0](https://github.com/Polyterative/Patcher/compare/v5.6.0...v5.7.0) (2026-05-04)


### Features

* **home:** add application insights teaser ([d1266dd](https://github.com/Polyterative/Patcher/commit/d1266dd58d3241b7bd18091ef903dce8c26b2baf))
* **home:** refresh hero messaging ([a86d998](https://github.com/Polyterative/Patcher/commit/a86d998b04825e34cd1a59945defa9035a8d6719))
* **insights:** add catalogue age analytics ([fc755a9](https://github.com/Polyterative/Patcher/commit/fc755a92ae4688fd4c9a33c1206bc53e89fa22c2))
* **insights:** add catalogue health signals ([8dd0233](https://github.com/Polyterative/Patcher/commit/8dd02332e421ea108b4c1cd66c74c51b08ea1ca1))
* **insights:** add dedicated application surface ([65141f7](https://github.com/Polyterative/Patcher/commit/65141f7c48ef8886ccedc6dd9a938f4652cd9066))
* **insights:** add derived signals ([eebdcf3](https://github.com/Polyterative/Patcher/commit/eebdcf31a4a135880b6104c8d80f58c14eada45a))
* **insights:** add freshness signals ([f7d6a84](https://github.com/Polyterative/Patcher/commit/f7d6a84535c8ddd9f2d662b1d32c14197a49240b))
* **insights:** add maker competition views ([4004df0](https://github.com/Polyterative/Patcher/commit/4004df0c048531f132851bb4102a25bc52a933c7))
* **insights:** add participation rates ([d399304](https://github.com/Polyterative/Patcher/commit/d3993042c520ec248f15dceb8125e8d423e33061))
* **insights:** add patch network signals ([210c0bb](https://github.com/Polyterative/Patcher/commit/210c0bb32cf35755a11198b61dd2508f7e336f72))
* **insights:** add sharing mix signals ([7568898](https://github.com/Polyterative/Patcher/commit/7568898206fdf832244047d6292608b09dc36c96))
* **insights:** deepen format and sharing signals ([64084e7](https://github.com/Polyterative/Patcher/commit/64084e7c88518b2a5e454cdc3bf6e5c7f1c72041))
* **insights:** deepen freshness and maker context ([e8f28ef](https://github.com/Polyterative/Patcher/commit/e8f28ef1b2515b2f3181c3a060e6335196a0a98f))
* **insights:** deepen module analytics ([d595f95](https://github.com/Polyterative/Patcher/commit/d595f95907fc46440f09ce5ab98661bd7153a08c))
* **insights:** deepen module size analytics ([7f16bf1](https://github.com/Polyterative/Patcher/commit/7f16bf16cdf235cb9c8e92ed4714485a6fb823f2))
* **insights:** expand comparative analytics ([b4fba92](https://github.com/Polyterative/Patcher/commit/b4fba9221f13674a766a49574004edb588e47277))
* **insights:** explain coverage suppression ([a5888fa](https://github.com/Polyterative/Patcher/commit/a5888faefb2085a45bc0fc3fe396ff52286c5ddb))
* **insights:** normalize freshness rates ([572b472](https://github.com/Polyterative/Patcher/commit/572b472b67da71d7b788d1a958b9d0cc30f962da))
* **insights:** redesign public insights page ([3d30437](https://github.com/Polyterative/Patcher/commit/3d30437073b05eb993b1a6b450ec4e04f6b797e7))
* **insights:** sharpen hierarchy and velocity signals ([f98be24](https://github.com/Polyterative/Patcher/commit/f98be247e68e411e455caa7f3f0d3404d7426e47))
* **insights:** suppress low-volume derived signals ([b8c02e6](https://github.com/Polyterative/Patcher/commit/b8c02e61dce2baf178da6e2ccafd9fa7ac743854))
* **rack-editor:** add function analysis mode ([0ea432d](https://github.com/Polyterative/Patcher/commit/0ea432d341b566eacc681f7c8e614d4579fbd72f))
* **rack:** refine mobile controls and power analysis ([eb0d858](https://github.com/Polyterative/Patcher/commit/eb0d85814fab106d6c44374396bc2307b301933c))
* **site:** add timed event banner surface ([9c83338](https://github.com/Polyterative/Patcher/commit/9c833387f83065f2eaacc8b21a3c4cbbcd61f029))


### Bug Fixes

* **auth:** prevent clipped narrow-page titles ([f51f4b6](https://github.com/Polyterative/Patcher/commit/f51f4b61cbccaf2952b93efaa95273d45c549c07))
* **backend:** harden public listing visibility ([9190806](https://github.com/Polyterative/Patcher/commit/9190806aa204d6a145d246757e7f444eb825d36f))
* **insights:** correct freshness pagination ([d01d8c5](https://github.com/Polyterative/Patcher/commit/d01d8c58e86d20b05c89910111b5e809e8cf2613))
* **insights:** gate public entry points in production ([d713fbb](https://github.com/Polyterative/Patcher/commit/d713fbb8e882d76443c065c6074f3b0ecdcd4929))
* **insights:** include all module standards ([c49edad](https://github.com/Polyterative/Patcher/commit/c49edad892f9f9c626d18a6953ee0fbc2569bb4f))
* **insights:** reduce chart color variety ([c2f10c0](https://github.com/Polyterative/Patcher/commit/c2f10c050516e706586eb54e364728c1324cc3e9))
* **insights:** replace footprint progress bars ([b5cdb7f](https://github.com/Polyterative/Patcher/commit/b5cdb7fc98d99647b93587fcc1ef8a13a0878b24))
* **insights:** show in-page loading state ([ad7fabb](https://github.com/Polyterative/Patcher/commit/ad7fabb8f11f1e4c018712376e66259351ca41b1))
* **insights:** split module explorations ([b01ebb7](https://github.com/Polyterative/Patcher/commit/b01ebb7bcf762965a35b900376c63ac604fd8a81))
* **module-details:** polish panel previews and tag suggestions ([ced6913](https://github.com/Polyterative/Patcher/commit/ced6913baf5ed8b9278fbc022219b34a79ff856e))
* **module-details:** refine responsive detail shell ([79fd5b3](https://github.com/Polyterative/Patcher/commit/79fd5b3a346dac9c8a35a5df551573355aebf8f3))
* **privacy:** harden public profile query paths ([89cf969](https://github.com/Polyterative/Patcher/commit/89cf969be39cc8922e2fc9a04decf8128dda4afb))
* **rack-editor:** harden tablet touch interactions ([df5c57c](https://github.com/Polyterative/Patcher/commit/df5c57c49fefffa4019f2acc4b5273589c58b4ee))
* **rack-editor:** polish drag reveal and remove edit prompt ([17a6c0a](https://github.com/Polyterative/Patcher/commit/17a6c0a7ca1c31820936838888e3a683491097cd))
* **rack-editor:** prevent dragged panel flash ([2ddc147](https://github.com/Polyterative/Patcher/commit/2ddc147f89fa70d92f7d6ee24aede24640aaac62))
* **rack-editor:** remove analysis mode tooltips ([51b5024](https://github.com/Polyterative/Patcher/commit/51b502425c49eed8cef26098457ff2f26b7b50a6))
* **rack-editor:** remove mobile quick-toggle shadow ([eafac4b](https://github.com/Polyterative/Patcher/commit/eafac4bc76d23ff6882b4f58a46277b52ece276f))
* **rack-editor:** smooth drag handoff landing ([8d35837](https://github.com/Polyterative/Patcher/commit/8d3583775513b3eae9abdd89e435a6d6671071f0))
* **rack-editor:** stabilize drag preview sizing ([af74ff8](https://github.com/Polyterative/Patcher/commit/af74ff8510d6fc4bb7a5a205fcac84239ecc43b9))
* **rack:** align balance analysis palette ([2d2c723](https://github.com/Polyterative/Patcher/commit/2d2c7233af630bd750ac957754cce7dfe0c82de9))
* **rack:** resolve inside loader state ([1a1f7b3](https://github.com/Polyterative/Patcher/commit/1a1f7b3f902c1c2ab580ff954cb96e79ed5f14b6))
* **racks:** restore private detail access and copy previews ([e8808bb](https://github.com/Polyterative/Patcher/commit/e8808bb8810fb6b1614f0beee8e5f122467bf174))
* **rack:** unify inside power palette ([55561f0](https://github.com/Polyterative/Patcher/commit/55561f0996c429d95d9f8bed607f66a5b3f07443))
* **responsive:** improve mobile and tablet usability ([d9c368d](https://github.com/Polyterative/Patcher/commit/d9c368dce26dbb94bf7f7a9bdf9dccc92d8705a1))
* **responsive:** refine tablet drag and patch layouts ([fbc288f](https://github.com/Polyterative/Patcher/commit/fbc288f90c9aab6f69db5cb379e61bfd086c1cb6))
* **responsive:** stabilize drag feedback and tip routing ([84a362a](https://github.com/Polyterative/Patcher/commit/84a362a5cb7e7b328ff51858f5d92084ef17be27))

## [5.6.0](https://github.com/Polyterative/Patcher/compare/v5.5.1...v5.6.0) (2026-05-02)


### Features

* **profile:** add public contributor stats ([b33e14e](https://github.com/Polyterative/Patcher/commit/b33e14edd80c0e493dd446eac7a08a5e60384767))
* **rack-editor:** enhance power analysis ([2d96c2e](https://github.com/Polyterative/Patcher/commit/2d96c2e0ed4814410bf86f88416a2534eb8795fc))
* **rack-editor:** refine responsive controls and rack defaults ([257a0b5](https://github.com/Polyterative/Patcher/commit/257a0b5fd0562a801d6f060a84f54516d31354ae))
* **rack:** add balance analysis panel ([881eec9](https://github.com/Polyterative/Patcher/commit/881eec90e023de8b79a2d178587f9b57e06375e0))
* **rack:** refine balance analysis panel ([6bee5ca](https://github.com/Polyterative/Patcher/commit/6bee5ca72fea6fa0fcfa81f4de469b9c3a9f2b14))
* **rack:** refine summary layout and comments ([24acc10](https://github.com/Polyterative/Patcher/commit/24acc103edf3e4d1b74c400be673a8a1306e5feb))
* **stats:** unify detail stat cards ([637a562](https://github.com/Polyterative/Patcher/commit/637a562e36935409d3db22985131c85efcf675bf))
* **user:** add contributor stats card ([b1b11ee](https://github.com/Polyterative/Patcher/commit/b1b11ee7c26e234244fa86ea36e1eadcc9b8f96f))


### Bug Fixes

* **module:** hide manual action in details ([5b29ca7](https://github.com/Polyterative/Patcher/commit/5b29ca7757f8efbd4167167059c30a9d9cb29b63))
* **patch:** block ambiguous instance wiring ([1520c36](https://github.com/Polyterative/Patcher/commit/1520c36ce41fe415064840b41a9f210f14805289))
* **rack-details:** refine summary analysis placement ([2c5a6cc](https://github.com/Polyterative/Patcher/commit/2c5a6ccb21513d4cd61558091bc2faa15833d5c4))
* **rack-details:** refine summary layout breakpoints ([b94e701](https://github.com/Polyterative/Patcher/commit/b94e7010432713c840a5ff643ba40396b9171e93))
* **rack:** align scaled rack viewport ([df94eea](https://github.com/Polyterative/Patcher/commit/df94eea36bcff6c49039b0345588c0b1e2c86c4f))
* **rack:** compact balance panel on mobile ([7d46dd0](https://github.com/Polyterative/Patcher/commit/7d46dd0beea204690ecfc14baf201f99cdeeaaad))
* **rack:** load module tags in rack details ([0b401cb](https://github.com/Polyterative/Patcher/commit/0b401cb4644d693c46643cd34144ddf65a4ce117))
* **rack:** recognize legacy balance tags ([219b095](https://github.com/Polyterative/Patcher/commit/219b095b43dcfcaf91e0239a3d18a01ca21f8e7d))
* **stats:** stabilize detail stat rendering ([76060d2](https://github.com/Polyterative/Patcher/commit/76060d21dc7f5eb8d0101c0cd67dd439b9b5403c))

### [5.5.1](https://github.com/Polyterative/Patcher/compare/v5.5.0...v5.5.1) (2026-04-29)


### Features

* **module-browser:** add module maintenance actions ([bb65665](https://github.com/Polyterative/Patcher/commit/bb65665287f0e619f154398220c2ddc69e602306))
* **module-editor:** improve module panel image handling ([c63fca3](https://github.com/Polyterative/Patcher/commit/c63fca31a96098f51e4d5ad5b69909377fb13919))


### Bug Fixes

* **module-browser:** load full manufacturer lists ([7f47119](https://github.com/Polyterative/Patcher/commit/7f4711957b002b76d2de49e8d7fd00f7a2e74d88))

## [5.5.0](https://github.com/Polyterative/Patcher/compare/v5.4.4...v5.5.0) (2026-04-27)


### Features

* **module-editor:** add local panel crop workflow ([fd39731](https://github.com/Polyterative/Patcher/commit/fd3973186776a305778c92503fc39ea2eabe3608))


### Bug Fixes

* **module-editor:** refine panel crop workflow ([deb68e4](https://github.com/Polyterative/Patcher/commit/deb68e4f116780bfa29b715f9671e9500339f6f0))

### [5.4.4](https://github.com/Polyterative/Patcher/compare/v5.4.3...v5.4.4) (2026-04-27)


### Bug Fixes

* **discovery-tips:** keep active tip stable ([31396d1](https://github.com/Polyterative/Patcher/commit/31396d1f2e6ca28e9c9cb47f49c944ab0c94a846))
* **rack:** remove hp override persistence ([3d26a72](https://github.com/Polyterative/Patcher/commit/3d26a72feead27d1f263dbcb47a43685820a56ee))

### [5.4.3](https://github.com/Polyterative/Patcher/compare/v5.4.2...v5.4.3) (2026-04-23)


### Features

* **discovery:** improve search matching and rack hover details ([a273911](https://github.com/Polyterative/Patcher/commit/a273911af09eff720c5bc000f42d6a20acc0a1f6))
* **patch:** add privacy toggle to patch creator ([0b9efff](https://github.com/Polyterative/Patcher/commit/0b9efffea45dac4edad6adf28b5daec42effb061))
* **user-area:** reset discovery search and expand manufacturer docs ([85c4b9d](https://github.com/Polyterative/Patcher/commit/85c4b9d1c4a79e1892b0c46336d8a725c505f316))


### Bug Fixes

* **account:** stabilize signup and account actions ([7c3337d](https://github.com/Polyterative/Patcher/commit/7c3337dddb9426d41fb38df4f018a6cafe78cac2))
* **patch:** import reactive forms in patch module ([9b29799](https://github.com/Polyterative/Patcher/commit/9b29799c50525db590489b6e4d3b764977a9d485))
* **user-area:** search before pagination ([f4c8f99](https://github.com/Polyterative/Patcher/commit/f4c8f9910b53c65090162c950e32c5bf123bd54a))

### [5.4.2](https://github.com/Polyterative/Patcher/compare/v5.4.1...v5.4.2) (2026-04-14)


### Features

* **comments:** refactor comments UI with improved layout and styling ([6b1b34a](https://github.com/Polyterative/Patcher/commit/6b1b34adefd26c2d3067a12ff265159e524c2ff5))
* **discovery-tips:** add global pause action ([b076cc7](https://github.com/Polyterative/Patcher/commit/b076cc779849c2d88872fc14da73b21319a91c06))
* **onboarding:** polish auth and panel inspection ([de399d5](https://github.com/Polyterative/Patcher/commit/de399d5069c4c34f09f304bdf82debaf84274dc0))
* **public-profile:** add public profile routes ([bfa40b4](https://github.com/Polyterative/Patcher/commit/bfa40b4fdbd1cffc537666f3bc9e28ee466942fc))
* **rack-editor:** add rack hp overrides ([09854b2](https://github.com/Polyterative/Patcher/commit/09854b2577ea64b635a653e3f04a4502e3732226))
* **scripts:** add local Supabase backup and restore harness ([2e49b4f](https://github.com/Polyterative/Patcher/commit/2e49b4f463b9372aafbced75b4d15cb980b08873))


### Bug Fixes

* **comments:** pagination, ordering, error handling and UX improvements ([ed1db72](https://github.com/Polyterative/Patcher/commit/ed1db726ff4a69deee973325d0a1dde8e7589444))
* **public-profile:** harden public profile queries ([3a33223](https://github.com/Polyterative/Patcher/commit/3a332234696d4d2019cc3218f68a0610fa040cf0))

### [5.4.1](https://github.com/Polyterative/Patcher/compare/v5.4.0...v5.4.1) (2026-04-08)


### Bug Fixes

* **user-area:** hide unfinished panel preference toggle from user profile ([63c0e31](https://github.com/Polyterative/Patcher/commit/63c0e31a39d5c49d8ff57a5cb1f8511c4cf49073))

## [5.4.0](https://github.com/Polyterative/Patcher/compare/v5.3.8...v5.4.0) (2026-04-07)


### Features

* **panels:** Layer 1 — shared constants, derivePanelLabel utility, gallery UI ([afdbe70](https://github.com/Polyterative/Patcher/commit/afdbe70c7d4ae726b666de25f56c5dfbe9c3af02))
* **panels:** Layer 2 — global panel color preference with localStorage persistence ([5399907](https://github.com/Polyterative/Patcher/commit/53999076c18f118958368a901769f8dd7c99daf7))
* **panels:** Layer 3 — discovery badge on multi-panel cards, click-to-preview in gallery ([ddd6980](https://github.com/Polyterative/Patcher/commit/ddd6980dabbb5c9a5a4da1b02da39a06aec3d22b))
* **rack-creator:** add privacy toggle to create rack dialog, default private ([5aec5eb](https://github.com/Polyterative/Patcher/commit/5aec5ebe0c056b5531ceafa2d8c32d6e074c96c6))
* **rack:** rack-local panel switching for multi-panel modules ([4169798](https://github.com/Polyterative/Patcher/commit/4169798282762af379ed0a8b50ac6e8b91bf9619))


### Bug Fixes

* **build:** resolve two compile errors blocking app from building ([0cd2a13](https://github.com/Polyterative/Patcher/commit/0cd2a13e56cb915c8284218acbbe4ab6429fdf08))
* **dev-utils:** replace store URL input with manual URL in dev panel ([aa66026](https://github.com/Polyterative/Patcher/commit/aa660267bf1f502d0c19186cabf5b4f42fe2a86d))
* **e2e:** use mat-icon selector to reliably toggle rack privacy ([d670895](https://github.com/Polyterative/Patcher/commit/d670895049790005e6b062dd663600651d31dfb1))
* **module-details:** constrain panel gallery images to parent width ([14d2fbb](https://github.com/Polyterative/Patcher/commit/14d2fbbaad92e6dd8285d6ed62a717a51adfd1db))
* **panels:** hide report-issue when hideButtons set; remove redundant color badge ([9f103ea](https://github.com/Polyterative/Patcher/commit/9f103ea34e8b00eec2faf7b520c3dbfc9cbe4011))
* **patch-editor:** hide IO counter badge and report issue button in patch editing ([531b688](https://github.com/Polyterative/Patcher/commit/531b688a394b603eac1b6a072433dc9618f5258d))
* **rack:** replace 'Default' panel label with positional 'Panel 1' ([db3a6d3](https://github.com/Polyterative/Patcher/commit/db3a6d38efd8f4425118ff8837a122446b3c3dd2))
* resolve TS2729 init order in module-details, fix patchTags cache key ([de8a555](https://github.com/Polyterative/Patcher/commit/de8a5556a09c104c1aa071c62bfd0519b59224a6))

### [5.3.8](https://github.com/Polyterative/Patcher/compare/v5.3.7...v5.3.8) (2026-04-03)


### Features

* **admin:** add admin flags panel with resolve/delete UI and toolbar link ([065ef41](https://github.com/Polyterative/Patcher/commit/065ef41ed203954d4188a68f02b71082b4b3aec8))
* **admin:** gate dev-utils section visibility on JWT admin role ([d3ac3c2](https://github.com/Polyterative/Patcher/commit/d3ac3c2ea4a14898000ac753999e1795596f1f5b))
* **discovery-tips:** add contextual user-area onboarding tips ([149663c](https://github.com/Polyterative/Patcher/commit/149663c6ce33734effe91e6971b2da4729d07e16))
* **module-flag:** add module flagging feature with pending count indicator ([bdf67bb](https://github.com/Polyterative/Patcher/commit/bdf67bb9a78583619b515de6a1e2b1bea3952628))
* **module-flag:** polish flag feature — extract component, fix cancel reset, add admin filters ([d9a40f1](https://github.com/Polyterative/Patcher/commit/d9a40f16cbf17c50730ef646227a6038db120bfc))
* **module:** autofill blank power rails ([5017570](https://github.com/Polyterative/Patcher/commit/5017570bc2ea170d635250ce19764d033d8a6e4e))
* **module:** improve issue reporting ux ([5094f60](https://github.com/Polyterative/Patcher/commit/5094f60e7100ffb9ed2a2278658deff4356f64cd))
* **modules:** add store URL per module — buy new link and admin edit ([209a311](https://github.com/Polyterative/Patcher/commit/209a311632783c2e420f99da82fefe599005d8ee))
* **pagination:** persist page state across navigation for all four browser lists ([a7dec10](https://github.com/Polyterative/Patcher/commit/a7dec108f212ece2b8b01fe68867ab5ea6daf90f))
* **seo:** add Angular SSR with on-demand rendering and JSON-LD structured data ([c451ac7](https://github.com/Polyterative/Patcher/commit/c451ac7c2a7356eda4be93ccc4b99ec686ad3bd5))
* **ssr-host-config:** add request origin resolution and allowed hosts ([85ad3f5](https://github.com/Polyterative/Patcher/commit/85ad3f512e79d324ab2a9a9ba38937f24e650358))
* **ssr:** wire Angular 21 on-demand SSR to Vercel via explicit serverless shim ([bb1ffc7](https://github.com/Polyterative/Patcher/commit/bb1ffc72699a0f51e18ff1a3d67f629d1897fc63))
* **supabase:** add store_url migration ([df70c30](https://github.com/Polyterative/Patcher/commit/df70c3015635860eb6548954d4c239e543f0d46c))
* **username-guard:** enforce username completion check ([e2b56d0](https://github.com/Polyterative/Patcher/commit/e2b56d0bea8692477d96dde172d5a0f17a1f1eb4))


### Bug Fixes

* **admin-flags:** surface supabase errors on delete/resolve and add admin RLS policies ([4889843](https://github.com/Polyterative/Patcher/commit/4889843fe3aa6b6dd220e7706ebbe2d764f94840))
* **admin:** bypass submitter filter in update.module for admins and add role-gating tests ([503c01e](https://github.com/Polyterative/Patcher/commit/503c01e0b8635b3bc43d7a0869f4667ac19f17d7))
* **build:** pause production SSR ([98c0ce6](https://github.com/Polyterative/Patcher/commit/98c0ce6f63d2a9a8223058a0f5896d000047926b))
* **ci:** run pnpm scripts explicitly in GitHub Actions ([cb2b678](https://github.com/Polyterative/Patcher/commit/cb2b678fc4c1fbd08d4f67c3afd82885b1194e01))
* **dev:** stabilize local serve workflow ([557fe5a](https://github.com/Polyterative/Patcher/commit/557fe5a9cbba7f1c22ca23e53b8d1291d66ed4af))
* **module:** restore edits and guard json-ld SSR ([7088c95](https://github.com/Polyterative/Patcher/commit/7088c9597bedbcdaf7370fd9b4a686041de3de71))
* **ssr:** add FlexLayoutServerModule, withFetch(), remove moment dependency ([91fe840](https://github.com/Polyterative/Patcher/commit/91fe840a38e38ea7a689087d6fe08a7a75f961ba))
* **ssr:** add server.ts to TypeScript compilation ([8f2a900](https://github.com/Polyterative/Patcher/commit/8f2a9007a8a4de48fb25dc97830117988489b1b0))
* **ssr:** broaden localStorage polyfill for Node.js 22 and skip data-fetch timers during SSR ([c386c2f](https://github.com/Polyterative/Patcher/commit/c386c2f1fbebc51d324e9f66f0fca370ee3352e9))
* **ssr:** disable build-time prerender to unblock deploy, rely on on-demand SSR ([be0f479](https://github.com/Polyterative/Patcher/commit/be0f479e78876d3e34e231b377e6f8654d8528e7))
* **ssr:** export NgModule class from server entry so route extractor works ([01be690](https://github.com/Polyterative/Patcher/commit/01be690f7f54cafc16c1ace74a77048a02c65bbf))
* **ssr:** harden lottie browser loading ([99073ae](https://github.com/Polyterative/Patcher/commit/99073ae0e5da1b26505c19d91eec8785f114a9b6))
* **ssr:** remove browser commonjs path ([bf30cac](https://github.com/Polyterative/Patcher/commit/bf30cac80c49cdd7d3f8df1b36f6f8dd32a4764d))
* **ssr:** switch to CommonEngine for NgModule SSR compatibility, fix Express 5 wildcard syntax ([f8afd70](https://github.com/Polyterative/Patcher/commit/f8afd70fea27e2afde635bc54bbb7247a59d9a80))
* **ssr:** use InMemoryStorageStrategy for ts-cacheable in SSR context to avoid localStorage crash on Node.js 22 ([b65111a](https://github.com/Polyterative/Patcher/commit/b65111a6b777f0caac2e0b3c70af5b97159664e8))
* **ssr:** wire Angular 21 on-demand SSR to Vercel via explicit serverless shim ([dbd0dd7](https://github.com/Polyterative/Patcher/commit/dbd0dd77e9b97470d56722efa089698c1827d6e9))
* **update-module:** preserve standard=0 (3U Doepfer) stripped by falsy check ([663aa75](https://github.com/Polyterative/Patcher/commit/663aa7535e63d414fa9228fc62031fbba94d1885))
* use index.csr.html and allow all hosts for Angular 21 SSR ([2d4c837](https://github.com/Polyterative/Patcher/commit/2d4c837a3b7b65917c9f7f8b3c9f84f90d96dbbc))
* **vercel:** route all requests through SSR function, include browser assets in function bundle ([4e19762](https://github.com/Polyterative/Patcher/commit/4e197624970ff0481d511f9f24d5941a091bef08))
* **vercel:** use routes with handle:filesystem so SSR function takes priority over SPA index.html fallback ([4e2757e](https://github.com/Polyterative/Patcher/commit/4e2757ea1e01a30ea51c5ae2e6c83a8166ef45dd))

### [5.3.7](https://github.com/Polyterative/Patcher/compare/v5.3.6...v5.3.7) (2026-03-13)


### Bug Fixes

* **csp:** allow blob: worker-src for FA2 layout Web Worker ([5a09e3f](https://github.com/Polyterative/Patcher/commit/5a09e3feea31da0bed5adc2bedeec02a8b0e4c4e))

### [5.3.6](https://github.com/Polyterative/Patcher/compare/v5.3.5...v5.3.6) (2026-03-13)


### Bug Fixes

* **graph:** remove circular layout override to preserve semantic node positioning ([295f974](https://github.com/Polyterative/Patcher/commit/295f974844e476685d07bbf524986193f6cf584e))

### [5.3.5](https://github.com/Polyterative/Patcher/compare/v5.3.4...v5.3.5) (2026-03-12)


### Bug Fixes

* **sitemap:** add /home to static routes ([039e4fe](https://github.com/Polyterative/Patcher/commit/039e4fe932a6fc00032289eeac7c680cbc532a67))

### [5.3.4](https://github.com/Polyterative/Patcher/compare/v5.3.3...v5.3.4) (2026-03-08)

### [5.3.3](https://github.com/Polyterative/Patcher/compare/v5.3.2...v5.3.3) (2026-03-08)

### [5.3.2](https://github.com/Polyterative/Patcher/compare/v5.3.1...v5.3.2) (2026-03-08)


### Features

* **auth:** improve OAuth profile handling and user management flow ([a8e086b](https://github.com/Polyterative/Patcher/commit/a8e086b6a1eecaea1cdafe7c5ddadcc4194c23f3))
* **auth:** temporarily hide Google SSO button ([e8a090e](https://github.com/Polyterative/Patcher/commit/e8a090ebb9601bf633b2374c4891dbddad991519))
* **home:** add placeholders for sections ([c6d5951](https://github.com/Polyterative/Patcher/commit/c6d5951cf03d4f30e9b36aa0292a58ebaa83885a))
* **module-browser:** add tag filtering to module list ([adde6eb](https://github.com/Polyterative/Patcher/commit/adde6ebcbc48f9ec916caec8787cf0037c4bb0a2))
* **rack:** auto-scale rack to fit viewport width on all screen sizes ([e105cc5](https://github.com/Polyterative/Patcher/commit/e105cc5f41be18952b2a28111e0e2ac3b9118c5c))


### Bug Fixes

* **ci:** generate env files in CI and fix middleware tests missing SUPABASE_URL ([5550edf](https://github.com/Polyterative/Patcher/commit/5550edf04dc9db0175c7d8f309e8fd17179fdad9))
* **rack:** clarify HP label as 'HP per row' to avoid confusion with total HP ([0fb1928](https://github.com/Polyterative/Patcher/commit/0fb1928128ed2abf8c5834b1aa04087f81753386))
* **rack:** extend row backgrounds to full rack width when wider than viewport ([9e2cf2c](https://github.com/Polyterative/Patcher/commit/9e2cf2c90f8ad556998d3a6e21abc9de0e7e89ea))
* **rack:** restore scale animation and fix background over-extending on small racks ([eb192ac](https://github.com/Polyterative/Patcher/commit/eb192acdca8cb4aa6e19d0234b0978a486a17911))
* **rack:** restore smallerScale transform by blockifying rack visual model in flex container ([e864f08](https://github.com/Polyterative/Patcher/commit/e864f086dc086311b22dec65ad39d7abd31531fd))

### [5.3.1](https://github.com/Polyterative/Patcher/compare/v5.3.0...v5.3.1) (2026-03-04)


### Bug Fixes

* **user-model:** remove email exposure in queries ([b972975](https://github.com/Polyterative/Patcher/commit/b972975f40be125b7f0f7a6e5c92fa5adfa7fb7a))

## [5.3.0](https://github.com/Polyterative/Patcher/compare/v5.2.0...v5.3.0) (2026-03-03)


### Features

* **manufacturer-browser:** add manufacturer module and UI components ([7e5a2ed](https://github.com/Polyterative/Patcher/commit/7e5a2ed1677c391946af094c47329025fa46414d))
* **manufacturer-browser:** add pagination to manufacturer list ([db64360](https://github.com/Polyterative/Patcher/commit/db643600fcb64d95e1e59b3f6da3566e119dd1cf))
* **manufacturer-browser:** implement sidebar filters and manufacturer rows ([d8367d1](https://github.com/Polyterative/Patcher/commit/d8367d1be3ebce42b92ad6100a97ddf88f8473ed))
* **manufacturer-browser:** integrate module parts for enhanced functionality ([c367dd4](https://github.com/Polyterative/Patcher/commit/c367dd421a5ea029a13268cc507a69f19aa95a3a))
* **manufacturer-detail:** add floating action button to submit module for manufacturer ([dc4747b](https://github.com/Polyterative/Patcher/commit/dc4747b318340f8cdfda1fae9fd0d3d6058113c9))
* **manufacturer-detail:** implement read-only manufacturer page with SEO enhancements ([f01c1b1](https://github.com/Polyterative/Patcher/commit/f01c1b1b9f98888d58ce64be71df13cb930f5be1))
* **manufacturer-detail:** merge floating action button for module submission ([6bd03c2](https://github.com/Polyterative/Patcher/commit/6bd03c2caf16e8df7183264dbd938943c4803b1e))
* **manufacturer-row:** add updated badge component ([ef0aede](https://github.com/Polyterative/Patcher/commit/ef0aede3f1936e5b24eafeeb48d52a6a8d290bd1))
* **manufacturer-row:** enhance module display with links ([588eade](https://github.com/Polyterative/Patcher/commit/588eade932551c83df7855b5bf4564b4c9c51126))
* **module-browser:** add recent activity block for modules ([312ecf2](https://github.com/Polyterative/Patcher/commit/312ecf22774292e72e26b27f0624923982932374))
* **module-browser:** implement recent activity service ([3751129](https://github.com/Polyterative/Patcher/commit/37511295b9ab73574f15720b0a047a3d6ee17884))
* **module-part-image:** add fixed-height option for alignment ([94acb0c](https://github.com/Polyterative/Patcher/commit/94acb0c0e6e554bf00ed065f5939242ca3026c18))
* **user-area:** add server-side pagination to comments, patches, racks; client-side to modules ([2318d9f](https://github.com/Polyterative/Patcher/commit/2318d9fffa61d3804a0483558cd3762a84a6858b))
* **user-area:** merge pagination feature from worktree ([f12d4c1](https://github.com/Polyterative/Patcher/commit/f12d4c1bb114e5eebf5591ef19aeb53653693cc8))


### Bug Fixes

* **auto-update-loading:** improve loading indicator visibility ([82edd46](https://github.com/Polyterative/Patcher/commit/82edd46b1c9287542a410f4803c05ddbefd307ea))
* **browser:** correct stale sort$ on navigation and wrong default across patches/modules/racks ([4177a43](https://github.com/Polyterative/Patcher/commit/4177a4306c5b5b72d4068dd2fc833a4f4d34dc74))
* **manufacturer-browser:** update pagination to use 10 items per page ([fb6a14c](https://github.com/Polyterative/Patcher/commit/fb6a14cba50da1bb27cb1f4f93527041d44255dc))
* **module-sort:** enhance sorting options ([fdae250](https://github.com/Polyterative/Patcher/commit/fdae250d4c50be104c2a620f8311fb9413800bbf))
* **security:** harden auth guards across write/delete/storage operations ([38af1e8](https://github.com/Polyterative/Patcher/commit/38af1e8a95e9ceea1361257de51f06a36aa6a0f5))
* **styles:** globally centre mat-menu-item icon and label via flex wrapper ([a1eda9a](https://github.com/Polyterative/Patcher/commit/a1eda9a57806debfd8e92051a340eb8bf0dbd746))
* **tests:** resolve 15 pre-existing test failures ([6fc60c8](https://github.com/Polyterative/Patcher/commit/6fc60c883890764993b332bf534452e68e7e5834))

## [5.2.0](https://github.com/Polyterative/Patcher/compare/v5.1.1...v5.2.0) (2026-02-26)


### Features

* **app:** enhance UX ([8ffc4af](https://github.com/Polyterative/Patcher/commit/8ffc4af97bfc0714f12427091863038bd7500a87))
* **comments:** add commentText pipe for safe HTML rendering ([4349e3c](https://github.com/Polyterative/Patcher/commit/4349e3c3adffd9bb46b1dd40cbb3453ace8c916a))
* **footer:** update changelog to v5.1.0, add Discord/GitHub links, move inline styles to SCSS ([#124](https://github.com/Polyterative/Patcher/issues/124)) ([ebeefaa](https://github.com/Polyterative/Patcher/commit/ebeefaa675089bbf34ffd74015ca3dc050bc52ec))
* **graph:** enhance node data structure ([e91075f](https://github.com/Polyterative/Patcher/commit/e91075f6c1ce187139c0978f298683fe0401ef5d))
* **graph:** enhance node label rendering ([21a9989](https://github.com/Polyterative/Patcher/commit/21a99895aeaa216e9c87828f726d11b71d752f27))
* **graph:** implement progressive rendering for nodes ([0110488](https://github.com/Polyterative/Patcher/commit/0110488041d2d469ee3d43b0d05a76938ed62bcc))
* **home:** add real-world use cases section ([5f78b45](https://github.com/Polyterative/Patcher/commit/5f78b45947c2e6a8509467b2099b6c99f1ab63a2))
* **home:** enhance homepage with new components ([6cb05fa](https://github.com/Polyterative/Patcher/commit/6cb05faf0c7e6c9ad18c0d9845eda7765971d581))
* **home:** enhance layout with modular sections ([6d94075](https://github.com/Polyterative/Patcher/commit/6d9407538ae32cfff6728bfbf525c798d799841d))
* **home:** redesign homepage layout and visuals ([2ff9f8b](https://github.com/Polyterative/Patcher/commit/2ff9f8b5f596eb24e959306bc5764ec8b6b8eeb4))
* **home:** update patch description for clarity ([55a3e00](https://github.com/Polyterative/Patcher/commit/55a3e00d887922c11f13e1fcb2f63e84f6d4500c))
* **home:** update section titles and descriptions ([8afdbae](https://github.com/Polyterative/Patcher/commit/8afdbae517fa42687414401f02282fea2c73a60c))
* **module-browser:** UX improvements ([1f01cd4](https://github.com/Polyterative/Patcher/commit/1f01cd41629c03de45c769ce8a43acd4030332aa))
* **module-editor:** compact workflow layout and secondary save FAB ([e1065ff](https://github.com/Polyterative/Patcher/commit/e1065ffbb8e35da08273fa8dcb61d0411120254e))
* **module-editor:** enhance save FAB accessibility and UX ([38b4381](https://github.com/Polyterative/Patcher/commit/38b438148f8d70d0e7cc0f0df6a25a8aa03d2a4a))
* **module-editor:** harden close/discard flow and CSS fab spacing ([d17536e](https://github.com/Polyterative/Patcher/commit/d17536e3e713fe1e9b84a3facf18fcd63079ddfd))
* **module-editor:** improve draft CV editing UX and safeguards ([4a9870b](https://github.com/Polyterative/Patcher/commit/4a9870b243bffabc3b3446cab944eeb69020be6e))
* **module-editor:** ship MVP layout framing for CV editing ([49c5d95](https://github.com/Polyterative/Patcher/commit/49c5d956b40d951bcfc163da7009917e52befe5b))
* **module-editor:** unify save flow and ship workflow layout scaffold ([f10ea25](https://github.com/Polyterative/Patcher/commit/f10ea25ec7c6d0ce41b3c0220837cd6b26d1012d))
* **module-editor:** unify setup-panel composition and remove step framing ([a9b4d92](https://github.com/Polyterative/Patcher/commit/a9b4d92d53ec2a458767469dc81cf529cc5a72df))
* **patch-editor:** add compact sort/group controls ([999f576](https://github.com/Polyterative/Patcher/commit/999f576ae1a9b22d82d91c5c7700235188f6caf4))
* **patch-editor:** add floating search for modules ([c193969](https://github.com/Polyterative/Patcher/commit/c193969a00e2201ed3e350c4cc5967398b62ee0f))
* **patch-editor:** enhance sort/group controls with new options ([355c13b](https://github.com/Polyterative/Patcher/commit/355c13b203dab96db08ad376d9bd4091a315b3da))
* **patch-graph:** add flow animation for edges ([52c1421](https://github.com/Polyterative/Patcher/commit/52c1421ff8f0f1613fe0b1a8524a18216f58f4b8))
* **patch-graph:** implement progressive reveal controller ([20ec8c2](https://github.com/Polyterative/Patcher/commit/20ec8c2622563cc2eeafa47de2cb41d90ca00f04))
* **patch-graph:** simplify node labels ([5ffbf79](https://github.com/Polyterative/Patcher/commit/5ffbf79d556cfd71a1094f0881a046cb2b39cd99))
* **playwright:** enhance local dev server setup ([0be00ad](https://github.com/Polyterative/Patcher/commit/0be00ad3cf73f1a9151f94e7e74d1b8a50400cb0))
* **user-area:** implement unified floating search ([aa31ac8](https://github.com/Polyterative/Patcher/commit/aa31ac8297b9c04ea2fe4c4139f231153ba37825))


### Bug Fixes

* **faq:** update roadmap links in FAQ and user guide ([225871f](https://github.com/Polyterative/Patcher/commit/225871f191de0e29722150fc646c97762fe8b9c4))
* **module-editor:** harden responsive layout and remove detail-page flex-layout coupling ([0dafb1a](https://github.com/Polyterative/Patcher/commit/0dafb1adab73fcdb1599a070976cb58d06dcd32e))
* **module-editor:** harden save-state validation and baseline sync ([9414b75](https://github.com/Polyterative/Patcher/commit/9414b75d51a93b1d7ac47d70769e73f6bf5c8dea))
* **patch-micro:** handle null data in template ([4fe2512](https://github.com/Polyterative/Patcher/commit/4fe251232fc5b8e1b65757889f65e5868fb50f5a))
* **rack-browser:** improve db request handling ([d7f8117](https://github.com/Polyterative/Patcher/commit/d7f81177051c64e8a97e95f31ed65b7bfad0dfe1))
* **supabase.service:** filter public patches and handle null results ([521a472](https://github.com/Polyterative/Patcher/commit/521a47228d657adb0130f66a9b170be47f591c77))
* **vercel:** sitemap fix ([9d08651](https://github.com/Polyterative/Patcher/commit/9d0865115db786434ef3d415385762fd5b2dc7b8))
* **vercel:** update ignoreCommand logic ([dcff90e](https://github.com/Polyterative/Patcher/commit/dcff90e2ef2b80cd0361f7af350377b79c18a7b2))

### [5.1.1](https://github.com/Polyterative/Patcher/compare/v5.1.0...v5.1.1) (2026-02-23)


### Features

* **seo:** add bot middleware and fallback social meta tags ([88b5f3a](https://github.com/Polyterative/Patcher/commit/88b5f3abd13c625c7966466ef5eef975ebf53cea))
* **seo:** add llms.txt for AI crawler guidance ([7756b2d](https://github.com/Polyterative/Patcher/commit/7756b2d82abf0d2bea06a1e22ae27250b8192695))


### Bug Fixes

* **build:** remove supabase cli package from install deps ([72e61e5](https://github.com/Polyterative/Patcher/commit/72e61e58ab7bf1c7ac89b4cff01ca48bf6813b59))
* **ci:** pin karma minimatch for unit test stability ([b12c67d](https://github.com/Polyterative/Patcher/commit/b12c67d147f2c9b5dbdd407e4042420277d7f598))
* **graph:** reduce patch graph jitter and deterministic sizing ([532b0f8](https://github.com/Polyterative/Patcher/commit/532b0f80062920c90b55db175fc4da2b0a1341d6))
* **graph:** stabilize patch details layout and add regression e2e ([4de2e28](https://github.com/Polyterative/Patcher/commit/4de2e289de0d958ba4cc3c782b40727baedcb264))
* **seo:** harden middleware caching and bot metadata responses ([d48d6fe](https://github.com/Polyterative/Patcher/commit/d48d6fec2968beef08b5c1d593c889205d0d4c31))
* **seo:** harden middleware metadata privacy and rack image resolution ([05ea2d6](https://github.com/Polyterative/Patcher/commit/05ea2d6ef8deb6220747397b51ba907c1b3ea67d))
* **seo:** replace next server middleware api for edge runtime ([2dd49a7](https://github.com/Polyterative/Patcher/commit/2dd49a75203d66cf2c48b1caa42d7496f92641c7))
* **seo:** use request host canonical metadata and source diagnostics ([277bffd](https://github.com/Polyterative/Patcher/commit/277bffd152ae376c3bc0daebe4d3eda56502bd61))

## [5.1.0](https://github.com/Polyterative/Patcher/compare/v5.0.0...v5.1.0) (2026-02-22)


### Features

* add auto-save for notes ([b0f603f](https://github.com/Polyterative/Patcher/commit/b0f603f891eb535ced7af2dd9d964927b4cb5b8b))
* add duplicate panel detection ([8bfc827](https://github.com/Polyterative/Patcher/commit/8bfc82773e88c68457ae496f0df9333b0baddcca))
* add instance stats ([5d5bc73](https://github.com/Polyterative/Patcher/commit/5d5bc730d1448a37c3574cc2e234c2d2b97d9a19))
* add left-sidebar filter ([3ab2246](https://github.com/Polyterative/Patcher/commit/3ab2246b657396f3afb7839cb2f0eb40b42e9402))
* add patch cable/multiples statistics panel ([e33d013](https://github.com/Polyterative/Patcher/commit/e33d013b71119294b00163634d6473b5b1ec08bc))
* add totalInstances count ([1309df5](https://github.com/Polyterative/Patcher/commit/1309df5225461d9fb20e67ef70d507bad5899a68))
* **auth:** restructure login and signup components ([2af0255](https://github.com/Polyterative/Patcher/commit/2af0255948f69f97926719e76130638c708f0352))
* **buttons:** add icon support to app-brand-primary-button across multiple components ([262462f](https://github.com/Polyterative/Patcher/commit/262462f8286cf1daebcd0af63a9ecf4b31cba341))
* **buttons:** add icon support to app-brand-primary-button for various actions ([bdf0682](https://github.com/Polyterative/Patcher/commit/bdf068234dfcd75f8478f6f4ad8f0014458a4451))
* **buttons:** replace mat-button with app-brand-primary-button for consistent styling and add icon support ([75f343c](https://github.com/Polyterative/Patcher/commit/75f343c38c2f58bff3e02542ded6b93348ceae90))
* **danger-actions:** implement consistent styling for destructive actions across components ([de1092d](https://github.com/Polyterative/Patcher/commit/de1092dfcc6a5931e5e551a8c90991b6ef552ff6))
* **docs:** add user guide for Patcher application ([9a553dd](https://github.com/Polyterative/Patcher/commit/9a553dd229b861e14a4c73ea78ecb2ed08305a09))
* **docs:** enhance guidelines for AI agents on tool usage and autonomy ([7d679f0](https://github.com/Polyterative/Patcher/commit/7d679f077257aab007534027d6e3f138fad8e064))
* **docs:** update ([2dea029](https://github.com/Polyterative/Patcher/commit/2dea029ab2577428b6f048956090ee805d419f03))
* **documentation:** add PRODUCT_NEEDS.md for feature planning and updates ([e5b0eed](https://github.com/Polyterative/Patcher/commit/e5b0eed43b288af546c05ac3df0ca160049b17a8))
* **documentation:** expand development philosophy and capture guidelines ([19b1f5e](https://github.com/Polyterative/Patcher/commit/19b1f5ecd142ff362c132f6a8143426acefc0faa))
* **e2e:** add Playwright setup ([259c93a](https://github.com/Polyterative/Patcher/commit/259c93ac51f7b4eb267588736c889ce210bfe197))
* **edit-fab:** add bounce animation on toggle ([23fdbc2](https://github.com/Polyterative/Patcher/commit/23fdbc27231130fb072f24d6e2d7ea3739a43dad))
* **empty-state:** add empty state component with icon and message ([a17802d](https://github.com/Polyterative/Patcher/commit/a17802d386e640be0a71a92736da82bee494b500))
* enhance patch editor UX ([900e23f](https://github.com/Polyterative/Patcher/commit/900e23f6e7b872ab9bf2551e908cddb8b1eee1f4))
* **faq:** add FAQ entry for adding gaps in rack and improve feature suggestion answer ([c52192c](https://github.com/Polyterative/Patcher/commit/c52192ca5861a8fc12cc1f27eadefa730748cbe9))
* **filter-sidebar:** enhance reset button logic ([44817c6](https://github.com/Polyterative/Patcher/commit/44817c6ee0731f8dc890a3235a872f2b44a77ba1))
* implement duplicate panel detection ([d0644dc](https://github.com/Polyterative/Patcher/commit/d0644dc5de26a59a7dc4fd1497fe60a42cc4b06f))
* **login:** add SSO login options and refactor module imports ([9feeb1d](https://github.com/Polyterative/Patcher/commit/9feeb1d035fe0df1e61ec1dfde9a75c48536b397))
* **login:** prepare for OAuth support ([c453e10](https://github.com/Polyterative/Patcher/commit/c453e105717094716225c8bb7ce596a409027316))
* **module-browser:** add inline manufacturer creation ([117baf3](https://github.com/Polyterative/Patcher/commit/117baf3c52854dca2368f1e82a1a54737f62dc5f))
* **module-browser:** improve reset button logic ([f582034](https://github.com/Polyterative/Patcher/commit/f582034f905e72542efcc91a0722f2ab4ea138e8))
* **module-browser:** update button text for clarity ([e2023a9](https://github.com/Polyterative/Patcher/commit/e2023a9a27db8c0df78ba513d2dd34db129f1159))
* **module-tags:** implement tag proposal and voting system with enhanced display logic, vote counts, login checks, and multi-tag support ([11df804](https://github.com/Polyterative/Patcher/commit/11df8043b9bcf616bc47729aec17990500f36687))
* **notifications:** update snackbar messages for clarity and consistency ([50ddbf8](https://github.com/Polyterative/Patcher/commit/50ddbf81bd0406f273a56358d9163ba6768a80c1))
* **package:** add scripts for switching and merging branches ([a607dc6](https://github.com/Polyterative/Patcher/commit/a607dc61e3b315204b9b81d0c0463a2491d6fdd7))
* **password-change:** add inline form password change form ([98de47e](https://github.com/Polyterative/Patcher/commit/98de47e2f4fa437674b772758aaee974ef0dd761))
* **patch-creator:** integrate LibShowcaseGridComponent and update patch info display ([a684265](https://github.com/Polyterative/Patcher/commit/a68426577cbc6b8985b41245fd22f5cbe615764d))
* **patch-details:** add fade-in animation to patch details component ([37b9cf3](https://github.com/Polyterative/Patcher/commit/37b9cf39bac5f2675a16f7457f5540ea83f650d1))
* **patch-details:** implement patch privacy feature with public field and toggle functionality ([b4d1a81](https://github.com/Polyterative/Patcher/commit/b4d1a8139bc4f04759fa3cdfc0c9909007412ec9))
* **patch-editor:** add copies summary ([a38c4f0](https://github.com/Polyterative/Patcher/commit/a38c4f05e2a482a25a51db92a7190dc8e5b0cc6c))
* **patch-editor:** enhance patch editor UX with improved module titles, CV indicators, inline labels, stale state refresh ([1d1e2ce](https://github.com/Polyterative/Patcher/commit/1d1e2cea5be4f042db16eaedcecb4d18ea3c9d92))
* **patch-editor:** improve module instance UX ([6556f1c](https://github.com/Polyterative/Patcher/commit/6556f1cc70904b9f1327ea08acefb27bd4d76a54))
* **patch-stats:** add PatchConnectionStatsPipe for connection statistics and integrate into patch composite view ([2598783](https://github.com/Polyterative/Patcher/commit/259878304d06a2ee6ef6d33f30a3cc665d22270a))
* **patch:** add auto-save ([5aee00c](https://github.com/Polyterative/Patcher/commit/5aee00cf28690e6050a6d0c6dec907a9385bcbae))
* **patch:** add instance-aware multi-module patching ([37b4847](https://github.com/Polyterative/Patcher/commit/37b4847f0b51c7084b63165dbe42d995e1f3bcca))
* **patch:** better success message for patch visibility updates in snackbar ([27d0eab](https://github.com/Polyterative/Patcher/commit/27d0eab5956f21f3ec4960c457ad0476951c1a91))
* **rack-creator:** replace info box with LibShowcaseGridComponent for enhanced module display ([2ca4094](https://github.com/Polyterative/Patcher/commit/2ca4094cddcd1a5ecd0380b4d87c093000029caf))
* replace dom-to-image ([e069d50](https://github.com/Polyterative/Patcher/commit/e069d50721a2a95114af84fbe59564ff79084827))
* **selection-panel:** clear confirmed state on selection change ([fcd39af](https://github.com/Polyterative/Patcher/commit/fcd39afaeb53ad87c7a0183a4332b25f042d0170))
* **selection-panel:** enhance confirm flow with persistent indicator ([6a916c6](https://github.com/Polyterative/Patcher/commit/6a916c619046d2fcffe8c3f09b2d5851ec1d1c54))
* **selection-panel:** enhance connection confirmation flow ([637236e](https://github.com/Polyterative/Patcher/commit/637236e667b8dd8a583fabe390251c67b5e8832b))
* **selection-panel:** implement floating selection panel ([983ad6b](https://github.com/Polyterative/Patcher/commit/983ad6b919ce0813d51a8d9943b2f7d9d985a1ba))
* **selection-panel:** implement sticky floating panel with deselect buttons ([f8b2c33](https://github.com/Polyterative/Patcher/commit/f8b2c33420e09ae2e5199cdc5f0f846fdab01ddb))
* **selection-panel:** integrate deselect buttons and clean up ([a048f42](https://github.com/Polyterative/Patcher/commit/a048f42982620021fa860cb63c0bfd8c32adaf1d))
* **selection-panel:** update confirmed state logic ([3e430a8](https://github.com/Polyterative/Patcher/commit/3e430a8a0201c011f7fba6928c6358b57c4dc5e1))
* **snackbar:** configure default snackbar options and adjust styling for improved visibility ([980d706](https://github.com/Polyterative/Patcher/commit/980d706f63ec8b4cc3702260b028bb0c3ba2c8cc))
* **snackbar:** enhance snackbar messages to include contextual names for better user feedback ([5a9cf9d](https://github.com/Polyterative/Patcher/commit/5a9cf9d2fd7c51a1475baa2238a6ef1ebd71467d))
* **snackbar:** enhance snackbar messages with improved clarity and semantic styling ([f44c60d](https://github.com/Polyterative/Patcher/commit/f44c60d7121e4edf7c481dfb9301c9c5f4172496))
* **sso-buttons:** simplify SSO provider options and hide sections ([e5414d1](https://github.com/Polyterative/Patcher/commit/e5414d16836c22d4a25b66ecbea476c190de87dc))
* **sso-buttons:** update SSO button styles ([93c95af](https://github.com/Polyterative/Patcher/commit/93c95af999bae32473c013b28f0d73be3510d221))
* statistics card ([40772ff](https://github.com/Polyterative/Patcher/commit/40772ff026d92870317233440c3371cee8358d7a))
* **styles:** update component styles to use brand resources for consistency ([bc05074](https://github.com/Polyterative/Patcher/commit/bc050741bb812eab5a913a98507607b5fdc5e525))
* **supabase.service, user-management.service:** implement cross-tab logout synchronization using Supabase auth state changes ([1875269](https://github.com/Polyterative/Patcher/commit/187526986340f621c4198af43d285c6ecfda4015))
* **theme:** replace prebuilt Angular Material theme with custom material theme ([4434168](https://github.com/Polyterative/Patcher/commit/443416858c5490f7dd4fed4dfd91b0d80936f94b))
* update Safari image export ([85bd02a](https://github.com/Polyterative/Patcher/commit/85bd02a76ff2c235cdf49b007635333ee2ff6c66))
* **user-management.service:** implement cross-tab login synchronization and user ID tracking ([a012c1b](https://github.com/Polyterative/Patcher/commit/a012c1b11b3f20599268810db4cdb19086cc2343))
* **user-management.service:** refactor user observables and actions for improved state management ([8beca7c](https://github.com/Polyterative/Patcher/commit/8beca7ca63fedba38cd2b7eb42743cab4e1a9557))
* **user-management:** implement username update functionality with validation ([0be442d](https://github.com/Polyterative/Patcher/commit/0be442d6550526b36b788ac8dcd1239a85db6c49))
* **user:** add GDPR account data deletion ([8ad7907](https://github.com/Polyterative/Patcher/commit/8ad79071b9c8f84a846cc5eab2ff4114d44c9292))


### Bug Fixes

* **angular-config:** enable tests and add standalone flag ([c72cfd5](https://github.com/Polyterative/Patcher/commit/c72cfd5a921a6c6d0d264bca19cbbcc691523e67))
* **clipboard:** add iOS Safari fallback for copy-on-click directive ([52d3a8a](https://github.com/Polyterative/Patcher/commit/52d3a8a62cbca2776ad8049e48dd0b471d7a12b7))
* **components:** remove readonly from @Input() declarations causing TS2540 compile errors ([151d6e3](https://github.com/Polyterative/Patcher/commit/151d6e3abcbb5df75e83ff29e279658d935ed8b4))
* **image-export:** replace html-to-image with modern-screenshot ([9fda6ac](https://github.com/Polyterative/Patcher/commit/9fda6aca9c1bf1bac2d2c1a35de55d28ee3a3b6c))
* **module-editor:** remove duplicate backend call in savePhysical$, use SharedConstants for snackBar, drop unused URLReg and reload() method ([0cb3d93](https://github.com/Polyterative/Patcher/commit/0cb3d930bada8dac2421d9373dee20f63d6112c5))
* **module-submit:** refactor inline manufacturer creation logic ([2c5be4c](https://github.com/Polyterative/Patcher/commit/2c5be4c21a62824733a0f742791c4fc39e25edfd))
* **patch-connection:** resolve textarea clipping issue ([1b7049e](https://github.com/Polyterative/Patcher/commit/1b7049ed54304c315deb921bcd74984854ac9196))
* **patch-editor:** prevent auto-save on patch load ([5f91b71](https://github.com/Polyterative/Patcher/commit/5f91b71bd2120e987505f75edd1db3f4c6b17705))
* **patch-module:** update delete logic for patches ([17597ee](https://github.com/Polyterative/Patcher/commit/17597ee09d33c9c197497555f7c33b6a5b1141da))
* **patch:** update privacy status handling and improve template bindings for patch details ([8ebf79e](https://github.com/Polyterative/Patcher/commit/8ebf79e9067d7d1eee2044802a547fd9624e4eee))
* **rack-editor:** remove lock/unlock button for current rack ([42138cb](https://github.com/Polyterative/Patcher/commit/42138cbc714b5de272203f1758091396977bfbdf))
* **rack-editor:** update advice tooltip to display only when no modules are present ([bfc94e7](https://github.com/Polyterative/Patcher/commit/bfc94e7d1849813b9de6816fcd8f7dee4742141a))
* **rack-parts:** exclude blank spacing modules from all rack statistics ([f343d85](https://github.com/Polyterative/Patcher/commit/f343d8537c581455cdf58b2533b1afb198a964d8))
* **selection-panel:** prevent spurious auto-save on patch open ([18acd0d](https://github.com/Polyterative/Patcher/commit/18acd0d8e2a7eafaa2f023437cbcaa09facb0a89))
* **styles:** correct font format from opentype to truetype ([9f9670a](https://github.com/Polyterative/Patcher/commit/9f9670a7737c6fbc0a2e941bd4311d57dbbbbd2e))
* **supabase.service:** implement custom lock to prevent NavigatorLockAcquireTimeoutError during token refresh ([b29cc20](https://github.com/Polyterative/Patcher/commit/b29cc205a217f20570d3303c6b3b3a6f86da2f40))
* **user-management.service:** update tests to use private observables for user state management ([da995fa](https://github.com/Polyterative/Patcher/commit/da995fa345fcb4df3a58581a1f02a8c4fbeaa875))

## [5.0.0](https://github.com/Polyterative/Patcher/compare/v4.17.3...v5.0.0) (2026-02-17)


### Features

* **dialog-info-box:** create a reusable info box component for displaying tips ([7521463](https://github.com/Polyterative/Patcher/commit/7521463fe85f732e440b9e3358301fc5b4589221))
* **dialog-info-box:** update styles to use brand-primary colors for consistency ([ecfb9bf](https://github.com/Polyterative/Patcher/commit/ecfb9bfd9e4f91b416f8d14c7e85246cd1fcb4b7))
* **docs:** add testing guidelines for running tests with Yarn ([81534d3](https://github.com/Polyterative/Patcher/commit/81534d3b1c2fdaa4fae0b196f0c7a8c1965eb419))
* **docs:** enhance guidelines with quick reference, file organization, and common patterns ([5f30b64](https://github.com/Polyterative/Patcher/commit/5f30b648844d6841c62a2da52d348021ff535823))
* **docs:** update package manager guidelines to specify Yarn usage ([3e645f9](https://github.com/Polyterative/Patcher/commit/3e645f97571e4cb8194dbfa37e6eede6ee1f55e2))
* **login-page:** add clarification message for password reset procedure ([5a77cda](https://github.com/Polyterative/Patcher/commit/5a77cda90c8596a02662c90709123470b4d12bac))
* **module-browser:** update iconL1 from 'label' to 'search' for improved clarity ([7b5058f](https://github.com/Polyterative/Patcher/commit/7b5058fe189b18c84ea8731fd9ccb6765bde0bc7))
* **patch-creator, rack-creator:** enhance dialog content with descriptions and usage tips ([1cccf00](https://github.com/Polyterative/Patcher/commit/1cccf005756459d8c9ea56710e68df713c51c261))
* **patch-creator:** implement unique patch name generation and update dialog layout ([18fe745](https://github.com/Polyterative/Patcher/commit/18fe745d73c124649dd47110fbc7140965051334))
* **rack-analysis:** add comprehensive tests for RackAnalysisService and improve module analysis methods ([555fe66](https://github.com/Polyterative/Patcher/commit/555fe66807bb1e0f3bb2a3f1a71630567cb6681b))
* **rack-analysis:** implement RackAnalysisService for intelligent rack configuration analysis and recommendations ([75a92e1](https://github.com/Polyterative/Patcher/commit/75a92e18ffd92025c2afc81811fa125ba2bb8c18))
* **rack-creator:** add unique name generation for rack creation ([ecd15ef](https://github.com/Polyterative/Patcher/commit/ecd15ef827b429d0120a2972d072fdaa167d9e1d))
* **rack-creator:** enhance rack analysis with user modules and dynamic recommendations ([5215339](https://github.com/Polyterative/Patcher/commit/521533961fd6d5944df22fa317df7aa34954c93a))
* **search:** implement accent-insensitive normalization for search functionality and update related components ([0736524](https://github.com/Polyterative/Patcher/commit/07365242495b5219ab44566053aec5ba21d18978))
* **seo:** replace ngx-seo with custom SeoSocialShareData model and update related components ([581e6a7](https://github.com/Polyterative/Patcher/commit/581e6a7fc9487a44317b026364575c05a95e7b38))
* **styles:** enhance heading styles ([9a57ae6](https://github.com/Polyterative/Patcher/commit/9a57ae64ae91c7f950d7c7f74e3069a5f410d6cd))

### [4.17.3](https://github.com/Polyterative/Patcher/compare/v4.17.2...v4.17.3) (2026-02-15)


### Bug Fixes

* **login:** update success message for password reset email notification ([7b99eab](https://github.com/Polyterative/Patcher/commit/7b99eabdb7f21171db4c8a7ab48bdf4b34c5291c))

### [4.17.2](https://github.com/Polyterative/Patcher/compare/v4.17.1...v4.17.2) (2026-02-15)

### [4.17.1](https://github.com/Polyterative/Patcher/compare/v4.11.1...v4.17.1) (2026-02-15)


### Features

* **countdown-progress:** add reusable countdown progress component with customizable themes and integrate into reset password page ([ab9c966](https://github.com/Polyterative/Patcher/commit/ab9c9662fe2c13202b16cc7c7536f48769be3821))
* **docs:** add architecture, AI agent guidelines, and style guide documentation ([963f410](https://github.com/Polyterative/Patcher/commit/963f4104e98de8728fbf87980a9cab65a65532b7))
* **form-components:** add icon support for input fields in login, signup, and reset password forms ([ce8456c](https://github.com/Polyterative/Patcher/commit/ce8456c64a38b1e1b2865a4e86320d495b19dc04))
* **form-components:** add icons for various form fields ([42b3e5c](https://github.com/Polyterative/Patcher/commit/42b3e5cbdc1536df9f9fd4d3565e4a49ee859b81))
* **login-page, signup-page:** improve action link UI and enhance routing functionality ([b22f3c8](https://github.com/Polyterative/Patcher/commit/b22f3c83b27708f6a87c3742c1546ffdceb21081))
* **login-page:** implement password reset functionality with UI updates and state management ([644788b](https://github.com/Polyterative/Patcher/commit/644788bf7e6e36f1980a8bba2448855c3b6ec1e9))
* **password-reset:** enhance UI ([96fcd62](https://github.com/Polyterative/Patcher/commit/96fcd6230b7f1d53934692c57d955283dc20dd37))
* **password-reset:** implement complete password reset flow with token verification and user feedback ([59a896c](https://github.com/Polyterative/Patcher/commit/59a896c5357b3f94bdc13937f43bcdcbb1c9fe7a))
* **password-reset:** refactor password reset logic with improved email validation and error handling ([8fad100](https://github.com/Polyterative/Patcher/commit/8fad100193b2bd2d4e39a611b0c4bf2d54e196ed))
* **reset-password:** enhance UI with loading and error icons, improve responsiveness ([76633f0](https://github.com/Polyterative/Patcher/commit/76633f00bf71bdbb8a554004b74b853961de2d01))
* **signup-page:** enhance signup actions UI and improve component structure ([32f1d80](https://github.com/Polyterative/Patcher/commit/32f1d8051fd8255f1a82171b92d42511299fa19c))
* **user-management:** align layout of user information display for improved UI ([3a1073f](https://github.com/Polyterative/Patcher/commit/3a1073f6ba3613a1a189a6ede1749be779cec41a))


### Bug Fixes

* **package.json:** update Node.js engine version range to <26 ([2a278d0](https://github.com/Polyterative/Patcher/commit/2a278d088d8b537599c3bc6820baa99cb06d7caf))

## [4.17.0](https://github.com/Polyterative/Patcher/compare/v4.16.0...v4.17.0) (2026-02-15)

## [4.16.0](https://github.com/Polyterative/Patcher/compare/v4.15.0...v4.16.0) (2026-02-15)

## [4.15.0](https://github.com/Polyterative/Patcher/compare/v4.14.0...v4.15.0) (2026-02-15)

## [4.14.0](https://github.com/Polyterative/Patcher/compare/v4.13.0...v4.14.0) (2026-02-15)

## [4.13.0](https://github.com/Polyterative/Patcher/compare/v4.12.0...v4.13.0) (2026-02-15)

## [4.12.0](https://github.com/Polyterative/Patcher/compare/v4.11.1...v4.12.0) (2026-02-15)


### Features

* **countdown-progress:** add reusable countdown progress component with customizable themes and integrate into reset password page ([ab9c966](https://github.com/Polyterative/Patcher/commit/ab9c9662fe2c13202b16cc7c7536f48769be3821))
* **docs:** add architecture, AI agent guidelines, and style guide documentation ([963f410](https://github.com/Polyterative/Patcher/commit/963f4104e98de8728fbf87980a9cab65a65532b7))
* **form-components:** add icon support for input fields in login, signup, and reset password forms ([ce8456c](https://github.com/Polyterative/Patcher/commit/ce8456c64a38b1e1b2865a4e86320d495b19dc04))
* **form-components:** add icons for various form fields ([42b3e5c](https://github.com/Polyterative/Patcher/commit/42b3e5cbdc1536df9f9fd4d3565e4a49ee859b81))
* **login-page, signup-page:** improve action link UI and enhance routing functionality ([b22f3c8](https://github.com/Polyterative/Patcher/commit/b22f3c83b27708f6a87c3742c1546ffdceb21081))
* **login-page:** implement password reset functionality with UI updates and state management ([644788b](https://github.com/Polyterative/Patcher/commit/644788bf7e6e36f1980a8bba2448855c3b6ec1e9))
* **password-reset:** enhance UI ([96fcd62](https://github.com/Polyterative/Patcher/commit/96fcd6230b7f1d53934692c57d955283dc20dd37))
* **password-reset:** implement complete password reset flow with token verification and user feedback ([59a896c](https://github.com/Polyterative/Patcher/commit/59a896c5357b3f94bdc13937f43bcdcbb1c9fe7a))
* **password-reset:** refactor password reset logic with improved email validation and error handling ([8fad100](https://github.com/Polyterative/Patcher/commit/8fad100193b2bd2d4e39a611b0c4bf2d54e196ed))
* **reset-password:** enhance UI with loading and error icons, improve responsiveness ([76633f0](https://github.com/Polyterative/Patcher/commit/76633f00bf71bdbb8a554004b74b853961de2d01))
* **signup-page:** enhance signup actions UI and improve component structure ([32f1d80](https://github.com/Polyterative/Patcher/commit/32f1d8051fd8255f1a82171b92d42511299fa19c))
* **user-management:** align layout of user information display for improved UI ([3a1073f](https://github.com/Polyterative/Patcher/commit/3a1073f6ba3613a1a189a6ede1749be779cec41a))


### Bug Fixes

* **package.json:** update Node.js engine version range to <26 ([2a278d0](https://github.com/Polyterative/Patcher/commit/2a278d088d8b537599c3bc6820baa99cb06d7caf))

### [4.11.1](https://github.com/Polyterative/Patcher/compare/v4.11.0...v4.11.1) (2025-10-17)


### Features

* **auth:** add password reset flow ([b8d20f6](https://github.com/Polyterative/Patcher/commit/b8d20f6f0ebb63e20c29c90d6ab3456e2489918e))
* **patch-detail-data:** enhance connection feedback ([c307b52](https://github.com/Polyterative/Patcher/commit/c307b528201f03d2cae02c149395319e34956693))
* **patch-detail:** improve connection handling and patch update logic -vibe- ([0160acf](https://github.com/Polyterative/Patcher/commit/0160acfbe153e207d299a40a9384f8070e33fd8c))
* update Node.js version to 22.x and add Vercel configuration ([7a3ba9f](https://github.com/Polyterative/Patcher/commit/7a3ba9fd7122c7f13a4f438245aa6d7ac7ed8f13))


### Bug Fixes

* **package.json:** update Node.js engine version range ([11a5522](https://github.com/Polyterative/Patcher/commit/11a5522cc0a9cf1d72229706d10a748b237337b1))
* preload custom font to prevent flash of unstyled text (FOUT) ([12038f6](https://github.com/Polyterative/Patcher/commit/12038f6cec24945389fb11e8b16ee29373b7d63a))
* **supabase.service:** restore patch save ([9ff01d5](https://github.com/Polyterative/Patcher/commit/9ff01d5fb3d31c97acc9b82221ae5e00bd2271e1))
* **vercel.json:** remove functions configuration and retain output directory ([056af6e](https://github.com/Polyterative/Patcher/commit/056af6e6bc28613c6d8b4638c8a413b0e32e173e))

## [4.11.0](https://github.com/Polyterative/Patcher/compare/v4.10.2...v4.11.0) (2025-03-29)


### Features

* **patch-browser:** only show patches with connections ([e634799](https://github.com/Polyterative/Patcher/commit/e634799ca90aeddb223aac115a3765cbf43be9ce))
* **rack-browser:** only show racks with modules ([4b2aa40](https://github.com/Polyterative/Patcher/commit/4b2aa405168c656bc767244b1cc4fd578e22d035))

### [4.10.2](https://github.com/Polyterative/Patcher/compare/v4.10.1...v4.10.2) (2025-03-26)


### Bug Fixes

* **actions:** cache fix ([6659d91](https://github.com/Polyterative/Patcher/commit/6659d9170aa1773179dd72c2765b04c0e4ab115f))
* **actions:** cache fix ([795c3a6](https://github.com/Polyterative/Patcher/commit/795c3a6f9dda0188da79fe99946985a4253434ff))

### [4.10.1](https://github.com/Polyterative/Patcher/compare/v4.10.0...v4.10.1) (2025-03-26)


### Bug Fixes

* **module-details:** panel upload works again ([6945a93](https://github.com/Polyterative/Patcher/commit/6945a939d5ea9eb60069b11f200803cfe815304c))
* **module-details:** power upload more reliable ([d5c60ce](https://github.com/Polyterative/Patcher/commit/d5c60cef0e63d9a06e7e6f4e008719306678f9eb))

## [4.10.0](https://github.com/Polyterative/Patcher/compare/v4.9.0...v4.10.0) (2024-11-21)


### Features

* **footer:** add faq ([26ebd39](https://github.com/Polyterative/Patcher/commit/26ebd3966637a9058183e0249d5c83e41c6d1d65))
* **home:** user interface improvements ([b4b85c6](https://github.com/Polyterative/Patcher/commit/b4b85c6b3e70950f315913ef4a930db15ade8799))
* **module-details:** add depth/weight tracking ([4cf5b3e](https://github.com/Polyterative/Patcher/commit/4cf5b3e523a91e64d748de39fd637b6d7092aa8d))
* **module-details:** better layout ([4a73f3a](https://github.com/Polyterative/Patcher/commit/4a73f3a604cd40f8f1a57aa1bc61699178e18a44))
* **module-details:** better layout ([d86ac57](https://github.com/Polyterative/Patcher/commit/d86ac57d6c4908866b79d5df8612ad0c2c9d5fec))
* **module-details:** better layout ([4498d3d](https://github.com/Polyterative/Patcher/commit/4498d3dfab8b1d3a08699724551d58e19574d7a3))
* **module-editor:** track mA for modules and allow update, show total consumption in rack ([f45cf05](https://github.com/Polyterative/Patcher/commit/f45cf05b9346c3c57f3e2fd3145b103296ae90a8))
* **rack-details:** add depth/weight tracking ([7beef76](https://github.com/Polyterative/Patcher/commit/7beef76246464f593df64c7ab64b2df56bb34204))
* **rack-editor:** show total consumption in rack ([fbeae76](https://github.com/Polyterative/Patcher/commit/fbeae760afdf1ef132cff317679b78cb9b79db1e))
* **submit-module:** improve layout ([e735a30](https://github.com/Polyterative/Patcher/commit/e735a304fc10a0bfd4be2baf714bb2d16858f086))


### Bug Fixes

* **app:** fonts no longer flash ([c3521b5](https://github.com/Polyterative/Patcher/commit/c3521b56f40687094703d1caed627029785a560e))

### [4.9.1](https://github.com/Polyterative/Patcher/compare/v4.9.0...v4.9.1) (2024-11-13)


### Features

* **footer:** add faq ([8e14625](https://github.com/Polyterative/Patcher/commit/8e1462563537f0e7501be9755acae95318655e6d))

## [4.9.0](https://github.com/Polyterative/Patcher/compare/v4.8.10...v4.9.0) (2024-11-10)


### Features

* **browsers:** paginator now on bottom and cleaner top part ([d911aaf](https://github.com/Polyterative/Patcher/commit/d911aaf92943840bb236767baea29f15d4503184))
* **module-details:** add text description of data ([5e0eb6d](https://github.com/Polyterative/Patcher/commit/5e0eb6ddc59f5489722ae963f338b69e65163460))
* **module-details:** statistics card in page ([8e5ae8b](https://github.com/Polyterative/Patcher/commit/8e5ae8beb2d94f031da9629d548b03b331ece527))
* **rack-details:** minor bugfix ([b249c9f](https://github.com/Polyterative/Patcher/commit/b249c9ffb412f2a1b335856d5cd616c8de49eb8a))
* **rack-details:** statistics card in page ([39635b8](https://github.com/Polyterative/Patcher/commit/39635b895d14e4f6f4b054929db30e667583270c))

### [4.8.10](https://github.com/Polyterative/Patcher/compare/v4.8.9...v4.8.10) (2024-10-28)


### Features

* **module-details:** added shop ([b71bc82](https://github.com/Polyterative/Patcher/commit/b71bc82f47f66dee1e7284aedfc178ca84f4a3b0))

### [4.8.9](https://github.com/Polyterative/Patcher/compare/v4.8.8...v4.8.9) (2024-10-26)


### Features

* open sourced project ([b072b01](https://github.com/Polyterative/Patcher/commit/b072b017b889d80d738624431c78c47d58954b7e))
* **repo:** readme fixes ([36e5416](https://github.com/Polyterative/Patcher/commit/36e5416665afa724ba8ae0aa0088d1643e134ed0))
* **repo:** readme fixes ([3cfa535](https://github.com/Polyterative/Patcher/commit/3cfa53535acc0bab4f0bcba2675c0df1c39a23fb))

### [4.8.8](https://github.com/Polyterative/Patcher/compare/v4.8.7...v4.8.8) (2024-10-26)


### Features

* **backend:** sentry lib update ([3f7f054](https://github.com/Polyterative/Patcher/commit/3f7f0541cc1c15c97d9e49e9fc44cd51d6ab55f6))

### [4.8.7](https://github.com/Polyterative/Patcher/compare/v4.8.6...v4.8.7) (2024-10-26)


### Features

* **backend:** added sentry options ([cb9ebc9](https://github.com/Polyterative/Patcher/commit/cb9ebc989d358142759a00379b8c3f30a6c75820))

### [4.8.6](https://github.com/Polyterative/Patcher/compare/v4.8.5...v4.8.6) (2024-10-26)


### Bug Fixes

* **backend:** environment fixes ([868bc5c](https://github.com/Polyterative/Patcher/commit/868bc5c2e1281a80bbd021c597b5ea7bbbc8ca10))

### [4.8.5](https://github.com/Polyterative/Patcher/compare/v4.8.4...v4.8.5) (2024-10-26)

### [4.8.4](https://github.com/Polyterative/Patcher/compare/v4.8.3...v4.8.4) (2024-10-26)


### Bug Fixes

* **backend:** environment fixes ([3b98dce](https://github.com/Polyterative/Patcher/commit/3b98dce81d038d6c3ffb6657d77eb2df5dde4c24))

### [4.8.3](https://github.com/Polyterative/Patcher/compare/v4.8.2...v4.8.3) (2024-10-26)


### Bug Fixes

* **backend:** environment fixes ([8187d98](https://github.com/Polyterative/Patcher/commit/8187d9808005e6bd34ba011824490552cc3f16f0))

### [4.8.2](https://github.com/Polyterative/Patcher/compare/v4.8.1...v4.8.2) (2024-10-26)


### Features

* **backend:** cleaner sentry code ([55bd39e](https://github.com/Polyterative/Patcher/commit/55bd39e8573b1428cd2451bcb765870fdda129eb))
* **backend:** enabled sentry sourcemaps ([201ccf4](https://github.com/Polyterative/Patcher/commit/201ccf4440a0efcf5f7fec0a03a435986a6e2505))
* **backend:** removed secrets from repo ([bf1cf5a](https://github.com/Polyterative/Patcher/commit/bf1cf5a0a089edd0e4aaf920928afd958e35fc94))


### Bug Fixes

* **comments:** cleaner labels ([0baa69c](https://github.com/Polyterative/Patcher/commit/0baa69cbfc9d1022077db03318defd47f84936fb))

### [4.8.1](https://github.com/Polyterative/Patcher/compare/v4.8.0...v4.8.1) (2024-10-23)


### Bug Fixes

* **module-submit:** after submitting a new module to the system the module list correctly shows the new module without having to reload manually ([a367208](https://github.com/Polyterative/Patcher/commit/a367208f423f53d9543504dd67ee20924a3ab702))

## [4.8.0](https://github.com/Polyterative/Patcher/compare/v4.7.4...v4.8.0) (2024-10-21)


### Features

* **racks:** allow to update image preview to show it in lists ([868c64e](https://github.com/Polyterative/Patcher/commit/868c64ea0c6887ea917635774cae86a677d5b326))

### [4.7.4](https://github.com/Polyterative/Patcher/compare/v4.7.3...v4.7.4) (2024-10-18)


### Features

* **cards:** less padding, more vert space ([370db61](https://github.com/Polyterative/Patcher/commit/370db61c6682914a3abc96450ca7eaf0e073192d))
* **rack:** clean a whole single row functionality ([f8991ed](https://github.com/Polyterative/Patcher/commit/f8991edba2b9e54f1730b8e87047df6a9b509123))

### [4.7.3](https://github.com/Polyterative/Patcher/compare/v4.7.2...v4.7.3) (2024-10-12)


### Features

* **rack-details:** show number of modules in each row ([e702848](https://github.com/Polyterative/Patcher/commit/e702848a12aacc50b040918d43f20c68fd4da972))

### [4.7.2](https://github.com/Polyterative/Patcher/compare/v4.7.1...v4.7.2) (2024-06-04)


### Features

* **module-details:** improvements to administration functions ([6028efc](https://github.com/Polyterative/Patcher/commit/6028efcb33815bff2841032057ca73bbf6def5f9))


### Bug Fixes

* **module-details:** opening the rack after adding a module now works correctly ([8fae199](https://github.com/Polyterative/Patcher/commit/8fae199cbd279f4a7adc37312239aba74db1877c))
* **search:** increased wait time before search for smoother operation ([5140fd7](https://github.com/Polyterative/Patcher/commit/5140fd7d1e407f7b4115ee361c9b9f8556053f60))

### [4.7.1](https://github.com/Polyterative/Patcher/compare/v4.7.0...v4.7.1) (2024-06-03)


### Features

* **backend:** enhanced caching support ([e4468c7](https://github.com/Polyterative/Patcher/commit/e4468c7879ac114b8de28fcbebd8df67cffac618))
* **backend:** enhanced caching support ([7f257ef](https://github.com/Polyterative/Patcher/commit/7f257ef8ea606f9d4111abab7e7a0d1d2ccd1c48))
* **comments:** comments deletable only withing 30minutes ([707e6ba](https://github.com/Polyterative/Patcher/commit/707e6baf75d25cd2699ad0c941037a181a65df31))
* **module-details:** stores have flags now ([8095c27](https://github.com/Polyterative/Patcher/commit/8095c27c04d47d71f9b651789775400e5d892377))
* **user-comments:** comments of user ([2329160](https://github.com/Polyterative/Patcher/commit/2329160715b11f527e3fb05f83f5206908cc0725))
* **user-comments:** comments of user in user page ([6e81298](https://github.com/Polyterative/Patcher/commit/6e8129813e92fa063765a368de1487c7e9cb2d6b))


### Bug Fixes

* **forms:** more resilient form entity ([19c3be0](https://github.com/Polyterative/Patcher/commit/19c3be045078e159e7910186863e20aa16244814))
* **rack-editor:** replace with black for 1U ([dd93a9f](https://github.com/Polyterative/Patcher/commit/dd93a9ff15f770197460a7d110733af89ff00333))

## [4.7.0](https://github.com/Polyterative/Patcher/compare/v4.6.6...v4.7.0) (2024-06-01)


### Features

* **backend:** enhanced caching support ([78bcf66](https://github.com/Polyterative/Patcher/commit/78bcf6665fb06d02a7b3ed93e7630daf928db7e6))
* **backend:** local caching support ([b5a4c22](https://github.com/Polyterative/Patcher/commit/b5a4c22c050ad1e1a7b05dddfad628b204f4016c))
* **module-browser:** optimized calls and cache on form reset ([efe44ed](https://github.com/Polyterative/Patcher/commit/efe44ed40d82f1a35c1a58265e94ee4f77dbb9f7))
* **module-details:** can search description now ([fcf09dd](https://github.com/Polyterative/Patcher/commit/fcf09dd499355df2d15e309f915eb528d9fa6f6b))
* **patch-editor:** better UI ([b1a0e7b](https://github.com/Polyterative/Patcher/commit/b1a0e7b437a846498ea84608691385d183cd4c10))
* **rack-details:** add row / remove row ([4dd36a0](https://github.com/Polyterative/Patcher/commit/4dd36a08815c853fa7bfd4b7bb438ea2f7d405f2))
* **rack-details:** racks analytic view UI improvements ([80d79a6](https://github.com/Polyterative/Patcher/commit/80d79a6178614b726d28874e094cc2578de60382))
* **rack-details:** racks can now be private ([abbcd21](https://github.com/Polyterative/Patcher/commit/abbcd21cbbd94b79126f5db269a0c1ddac182dbc))
* **seo:** tagging improvements ([c960c68](https://github.com/Polyterative/Patcher/commit/c960c688718378d49f5601b0186f2c88aef05ef0))
* **user-area:** modules now sorted by add date ([459ca16](https://github.com/Polyterative/Patcher/commit/459ca1629a173c185f2bd969f7f3189eb9fcdc20))


### Bug Fixes

* **backend:** taking care of comments on entity delete ([ced3a1f](https://github.com/Polyterative/Patcher/commit/ced3a1f5ea962963da0f41e4e147e91b0891934f))
* **browsers:** starting number of elements now correct on first opening ([d6c5c9f](https://github.com/Polyterative/Patcher/commit/d6c5c9fb9bc975b0fed9d086d75306506fe09399))
* **module-browser:** filtering on reset format ([3862ab6](https://github.com/Polyterative/Patcher/commit/3862ab64322f7da7c8dcd877e3c23611f3e53130))
* **module-browser:** reset now takes to first page ([33b8c54](https://github.com/Polyterative/Patcher/commit/33b8c5402a81ba93cfc99f3bc8ebf6f002a2ac68))
* **module-submit:** now automatically routing user after module submit ([14bf395](https://github.com/Polyterative/Patcher/commit/14bf395a72b436d9a5c5831e3c5c8a8358616bd0))
* **modules:** correct sorting of module inputs and outputs with numeric parts ([0b5fe5a](https://github.com/Polyterative/Patcher/commit/0b5fe5abea542a688c3975917d053c38b5ee2257))

### [4.6.6](https://github.com/Polyterative/Patcher/compare/v4.6.5...v4.6.6) (2024-06-01)


### Bug Fixes

* **module-submit:** standard now saved correctly ([3795f2c](https://github.com/Polyterative/Patcher/commit/3795f2cb580dc87870fa87f20e12a2980fce7dec))

### [4.6.5](https://github.com/Polyterative/Patcher/compare/v4.6.4...v4.6.5) (2024-06-01)

### [4.6.4](https://github.com/Polyterative/Patcher/compare/v4.6.3...v4.6.4) (2024-05-24)


### Features

* **app:** now using angular 18 + material 18 ([69bd353](https://github.com/Polyterative/Patcher/commit/69bd3537dff82167d1b654ee4447c5d785a1d4ab))


### Bug Fixes

* **login:** opening collection from scratch no longer breaks ([d529466](https://github.com/Polyterative/Patcher/commit/d5294666ace5b7956fed7bc545eecb5c539b00c5))
* **module-details:** edit security improvements ([5ff1a6b](https://github.com/Polyterative/Patcher/commit/5ff1a6bae27a1873008d2942f49fb0527077885e))

### [4.6.3](https://github.com/Polyterative/Patcher/compare/v4.6.2...v4.6.3) (2024-05-22)


### Features

* **app:** paginators are now more consistent ([72c3c4a](https://github.com/Polyterative/Patcher/commit/72c3c4a445d1d5a664473adcff2ee031678159fd))
* **comments:** better sanitization strategy ([46f5e46](https://github.com/Polyterative/Patcher/commit/46f5e46b29e26421d6c9fbdaf9e5b0812a436e0c))
* **comments:** now active in production ([8245540](https://github.com/Polyterative/Patcher/commit/82455401c3ef8d4c09ac4b0321506bfb6f3d05ff))
* **home:** faster lazy load ([57e21f1](https://github.com/Polyterative/Patcher/commit/57e21f11728dd84f987c762dd2c4a01693b043d2))
* **seo:** improvements ([ef58257](https://github.com/Polyterative/Patcher/commit/ef58257b5883abea2bf8fb4f9aa149f007beacc5))


### Bug Fixes

* **module-browser:** filtering for 3U no longer shows 1U as well ([ce41b04](https://github.com/Polyterative/Patcher/commit/ce41b04a03fd2667ba9252438fb1745b3ec967a8))

### [4.6.2](https://github.com/Polyterative/Patcher/compare/v4.6.1...v4.6.2) (2024-05-21)


### Features

* **app:** added secret dev utils buttons ([2fb4d13](https://github.com/Polyterative/Patcher/commit/2fb4d13706abaa5a61346f7e3a09c5aacbc6997e))
* **app:** inputs sanitization ([9a1108d](https://github.com/Polyterative/Patcher/commit/9a1108d565196585c44744efd1d1a78c2792611d))
* **app:** secret dev utils ([d0f99a7](https://github.com/Polyterative/Patcher/commit/d0f99a75be25d70b96d2218ce3aed658fa0e495c))
* **app:** user comments are now supported ([5fbd34b](https://github.com/Polyterative/Patcher/commit/5fbd34b9de1ba44bd31bfacd4ee043404725fae3))
* **login:** improvements ([773999f](https://github.com/Polyterative/Patcher/commit/773999f6f68b18ce9aa634c66048d2c26d9c6a5c))
* **module-submit:** Submit similar module button ([1fb4935](https://github.com/Polyterative/Patcher/commit/1fb4935eb54c1db097febdc52d2c03f4fd5a069a))
* **user-area:** manuals of modules section improvements ([c511d74](https://github.com/Polyterative/Patcher/commit/c511d74678d6ebb9c77fa9ba7b43877a46f53e3e))
* **user-area:** new manuals of modules section in user profile ([8482d22](https://github.com/Polyterative/Patcher/commit/8482d223b9eb71a3da9ea4b69160ebbd7f15fdc8))

### [4.6.1](https://github.com/Polyterative/Patcher/compare/v4.6.0...v4.6.1) (2024-05-19)


### Features

* **app:** supabase lib update ([79e7fcb](https://github.com/Polyterative/Patcher/commit/79e7fcb1eb59c0c035e3b090f3d0c4e1133d0016))
* **module-details:** add links to stores for quick searches ([941b98f](https://github.com/Polyterative/Patcher/commit/941b98f0e7d7316b935a46be446f3edd3f978740))
* **module-details:** add links to stores for quick searches ([f40e722](https://github.com/Polyterative/Patcher/commit/f40e722b4ae2ed7dc0a8766fcd878d1df65b4b14))
* **module-editor:** ui flow improvement ([33388f6](https://github.com/Polyterative/Patcher/commit/33388f6672cbbabff9d1ee1381083c8396c6b8de))
* **module-submit:** submitted modules are now public by default ([155f4b5](https://github.com/Polyterative/Patcher/commit/155f4b5d7cd952e4168efb8ab30f12a61abbdedc))


### Bug Fixes

* **module-details:** title now updates correctly when changing module in page ([fafc55e](https://github.com/Polyterative/Patcher/commit/fafc55e0e56e34676f82c9fa7542dfc6c3a8b205))

## [4.6.0](https://github.com/Polyterative/Patcher/compare/v4.5.4...v4.6.0) (2024-05-18)


### Features

* **module-details:** fixed cv adder button css flow ([e48fc2f](https://github.com/Polyterative/Patcher/commit/e48fc2fc0f42ff16f10fcad3ba17daf83caa6700))
* **module-details:** more links for quick searches ([4baf74c](https://github.com/Polyterative/Patcher/commit/4baf74c8fba6b18d378f040a28d5345abbd2c3c7))
* **module-details:** panels are now approved by default ([c9a16e6](https://github.com/Polyterative/Patcher/commit/c9a16e60050989eeda168866c892649c0752fe27))
* **rack-details:** more accurate 1U height ([aa81811](https://github.com/Polyterative/Patcher/commit/aa818112d39d4e9b8060e18605ea2259b4c7fbfa))

### [4.5.4](https://github.com/Polyterative/Patcher/compare/v4.5.3...v4.5.4) (2024-05-18)


### Features

* **module-details:** more links for quick searches ([477e663](https://github.com/Polyterative/Patcher/commit/477e6634f123bb18e99e8c78129a6422c621a426))
* **patch-details:** cleaner notes UI ([eb7416b](https://github.com/Polyterative/Patcher/commit/eb7416b7537662274e72ff8a5756690630106e12))

### [4.5.3](https://github.com/Polyterative/Patcher/compare/v4.5.2...v4.5.3) (2024-05-18)


### Features

* **home:** minor improvements ([a754f03](https://github.com/Polyterative/Patcher/commit/a754f0309af711633b26d27a0cc03b43f27a7ea3))
* **module-details:** add links to stores for quick searches ([f49396b](https://github.com/Polyterative/Patcher/commit/f49396be8719523c1ab55f03eca24897ba88df45))

### [4.5.2](https://github.com/Polyterative/Patcher/compare/v4.5.1...v4.5.2) (2024-05-14)


### Features

* **app:** better backend error handling ([63ca5bc](https://github.com/Polyterative/Patcher/commit/63ca5bc50b849556b516af0a332fba200039c02a))
* **app:** better details pages layouts UI ([a34fdf4](https://github.com/Polyterative/Patcher/commit/a34fdf49411210ba05c442cc61fb90650c1dde3b))
* **app:** better login errors ([87b1f91](https://github.com/Polyterative/Patcher/commit/87b1f917d562e8812a92e8186fa7df9952a6d8f8))
* **app:** images now lazyload ([53053f2](https://github.com/Polyterative/Patcher/commit/53053f28a9440ea7658e0e2396f9813b657dff42))
* **modules:** can now filter by format ([96b3b4e](https://github.com/Polyterative/Patcher/commit/96b3b4eb97d57afd8f9d5eb016415cf275b4b6a1))
* **modules:** UI now flows well on smaller screens ([252eab8](https://github.com/Polyterative/Patcher/commit/252eab89d84e431d0620635208ee23a41ae9df09))


### Bug Fixes

* **rack:** swapping unracked modules inline no longer makes them disappear ([356d1af](https://github.com/Polyterative/Patcher/commit/356d1afda60724e0b3b43daf85737353c2389e37))

### [4.5.1](https://github.com/Polyterative/Patcher/compare/v4.5.0...v4.5.1) (2024-04-13)


### Features

* **modules:** alphabetize the CVs by name, numbers are in order smallest to largest ([302500f](https://github.com/Polyterative/Patcher/commit/302500fec316ca9457d38263047317242588ff78))
* **modules:** better tooltips ([6ec9ca4](https://github.com/Polyterative/Patcher/commit/6ec9ca4326accd62dbe6864d94971b46a9468270))
* **patches:** new patch editing/view layout ([09533c8](https://github.com/Polyterative/Patcher/commit/09533c8dd760bb78dc6b0543a82df6ce41563fb9))

## [4.5.0](https://github.com/Polyterative/Patcher/compare/v4.4.1...v4.5.0) (2024-04-13)


### Features

* **app:** move components to new material + multiple UI improvements ([f427fe5](https://github.com/Polyterative/Patcher/commit/f427fe5ae3e4124a07561fb70924fe06c360c6a7))
* **app:** UI/UX improvements ([89f67eb](https://github.com/Polyterative/Patcher/commit/89f67ebde9b56ef0afb4d38387b200233702c3d8))
* **rack:** user can now replace a module with a blank directly from the interface ([10217a8](https://github.com/Polyterative/Patcher/commit/10217a833a078a1e4cc3c3918ed37769541bfebe))

### [4.4.1](https://github.com/Polyterative/Patcher/compare/v4.4.0...v4.4.1) (2024-03-20)


### Features

* **module-browser:** better filters ([ab16f5a](https://github.com/Polyterative/Patcher/commit/ab16f5a44971768538047c97d586113790d0c464))

## [4.4.0](https://github.com/Polyterative/Patcher/compare/v4.3.3...v4.4.0) (2024-03-20)


### Features

* **module-browser:** search add filter options ([d865290](https://github.com/Polyterative/Patcher/commit/d865290cc8493b92ed8854f9f7aff95344cfd6d6))

### [4.3.3](https://github.com/Polyterative/Patcher/compare/v4.3.2...v4.3.3) (2024-03-19)


### Bug Fixes

* **module adder:** sending new modules no longer avoids saving data ([ae7c0bb](https://github.com/Polyterative/Patcher/commit/ae7c0bb38ebd0170326bcfe68e135ef7c32dce34))

### [4.3.2](https://github.com/Polyterative/Patcher/compare/v4.3.1...v4.3.2) (2024-03-18)


### Bug Fixes

* **modules:** sending control voltages no longer avoids saving data ([785f689](https://github.com/Polyterative/Patcher/commit/785f6892451108248afe500dd4fbcf3b6e4ba7b3))

### [4.3.1](https://github.com/Polyterative/Patcher/compare/v4.3.0...v4.3.1) (2024-03-17)


### Features

* **app:** HTML root cleanup ([8cee4db](https://github.com/Polyterative/Patcher/commit/8cee4db74664769fae050c5e098b5f5a828888bd))

## [4.3.0](https://github.com/Polyterative/Patcher/compare/v4.2.3...v4.3.0) (2024-02-09)


### Features

* **app:** better names ([9abff3f](https://github.com/Polyterative/Patcher/commit/9abff3f5af782359588ea894f37a9a69f7758157))
* **app:** more buttons ([2b6af76](https://github.com/Polyterative/Patcher/commit/2b6af76af597fd58d2facc25181cc779db86e461))
* **app:** new live interactive home ([2280297](https://github.com/Polyterative/Patcher/commit/2280297164013d554e69b322dae22aaac8d3f231))
* **home:** better copy ([d51f2f4](https://github.com/Polyterative/Patcher/commit/d51f2f4a6e18282956ece25a4485ced58896082c))
* **submit:** better UI ([0716f82](https://github.com/Polyterative/Patcher/commit/0716f8288008a2613b07ee0c1c8c27e2bccce0f7))
* **submit:** fixed security flaw ([fb2199f](https://github.com/Polyterative/Patcher/commit/fb2199f215572b70158f54ee3a1942604e90e42e))

### [4.2.3](https://github.com/Polyterative/Patcher/compare/v4.2.2...v4.2.3) (2024-02-08)


### Features

* **app:** added buttons for feature discoverability ([2a780e5](https://github.com/Polyterative/Patcher/commit/2a780e5aff672d2e3bdebbbc2a916c86a1774efa))
* **rack:** statistics ([#120](https://github.com/Polyterative/Patcher/issues/120)) ([539f604](https://github.com/Polyterative/Patcher/commit/539f60476d8a5a4c1325ac1a8f8aeeee5e5cf910))


### Bug Fixes

* **footer:** discord invite renew ([16d993f](https://github.com/Polyterative/Patcher/commit/16d993f733b5cc60812e5ccdc123c9c26f2caed3))

### [4.2.2](https://github.com/Polyterative/Patcher/compare/v4.2.1...v4.2.2) (2024-01-29)


### Features

* **core:** security improvement of output of deployment ([e3e9090](https://github.com/Polyterative/Patcher/commit/e3e9090320e7f9275d65365d124e93f8fa8f7b6f))


### Bug Fixes

* **backend:** stronger racked modules insert and update ([d00bf9f](https://github.com/Polyterative/Patcher/commit/d00bf9f00ab9f158d75724ab3dd3732ec080d9a7))

### [4.2.1](https://github.com/Polyterative/Patcher/compare/v4.2.0...v4.2.1) (2024-01-28)

## [4.3.0](https://github.com/Polyterative/Patcher/compare/v4.2.0...v4.3.0) (2024-01-29)

## [4.2.0](https://github.com/Polyterative/Patcher/compare/v4.1.2...v4.2.0) (2024-01-28)


### Features

* **backend:** now using version 2 of the backend library + total ove… ([#118](https://github.com/Polyterative/Patcher/issues/118)) ([cb41977](https://github.com/Polyterative/Patcher/commit/cb41977c30d1d3c9c3d9346f8825b8b578d0c2dc))

### [4.1.2](https://github.com/Polyterative/Patcher/compare/v4.1.1...v4.1.2) (2024-01-25)


### Features

* **footer:** cleanup + add links ([ee813d1](https://github.com/Polyterative/Patcher/commit/ee813d13a45b5a022c3d488a90c3e3d4fec733aa))

### [4.1.1](https://github.com/Polyterative/Patcher/compare/v4.1.0...v4.1.1) (2024-01-25)


### Bug Fixes

* **cards:** correct labels for buttons when not logged ([ba58179](https://github.com/Polyterative/Patcher/commit/ba58179d017bc3f188f5ef36348ebba60cffe9f5))

## [4.1.0](https://github.com/Polyterative/Patcher/compare/v4.0.3...v4.1.0) (2024-01-24)

### [4.0.3](https://github.com/Polyterative/Patcher/compare/v4.0.2...v4.0.3) (2023-12-01)

### [4.0.2](https://github.com/Polyterative/Patcher/compare/v4.0.1...v4.0.2) (2023-09-28)


### Features

* Add GitHub issue template for Sweep issues ([#8](https://github.com/Polyterative/Patcher/issues/8)) ([6a93cbb](https://github.com/Polyterative/Patcher/commit/6a93cbb9b85085f4dd79632ec84bfc015e05899b))
* Exclude package-lock.json from tracked files ([#56](https://github.com/Polyterative/Patcher/issues/56)) ([470b988](https://github.com/Polyterative/Patcher/commit/470b98827fbc4114a7f0de4a4ff65e0aeb03c041))
* **system:** cleanup ([426871c](https://github.com/Polyterative/Patcher/commit/426871cee305c4a7a985c066f3e139c4c0ca7a70))
* **system:** libs update ([83995f2](https://github.com/Polyterative/Patcher/commit/83995f2cdecbe25258fcebbfe86e5d4dc859bb1f))
* Updated README.md ([#41](https://github.com/Polyterative/Patcher/issues/41)) ([a559ed4](https://github.com/Polyterative/Patcher/commit/a559ed4c0236b12fda5f6d5159a694da4e71135e))

### [4.0.1](https://github.com/Polyterative/Patcher/compare/v4.0.0...v4.0.1) (2022-07-08)


### Features

* **dependencies:** migrated to angular 14 / material 14 + updated dependencies ([2bf3d69](https://github.com/Polyterative/Patcher/commit/2bf3d697419f485e4a849dd5b55e0cdbc780ae82))
* **footer:** added app changes ([ee5c7fb](https://github.com/Polyterative/Patcher/commit/ee5c7fbc8a78a8b37076ceb2ea8a1b8d69739982))
* **module:** better animations ([fc1b1b9](https://github.com/Polyterative/Patcher/commit/fc1b1b904c5bbf1ccb4a26f75b24538d3daf7616))
* **module:** better related modules links ([22fa018](https://github.com/Polyterative/Patcher/commit/22fa018c7d548ef9770d702b0f1a3419873bf549))
* **module:** minor improvement ([39beba5](https://github.com/Polyterative/Patcher/commit/39beba5d16b5c79f4299d7b5ea91bb1b615c4b74))
* **module:** related modules by same manufacturer list in UI ([cad49e9](https://github.com/Polyterative/Patcher/commit/cad49e9d27c0ec006fa6e41903c6a31e98a26926))
* **modules:** module panel image preview ([a60a86f](https://github.com/Polyterative/Patcher/commit/a60a86ff16f1cf2f465c64d409b4dcd437cc0fdd))
* **modules:** module panel image preview ([e22f760](https://github.com/Polyterative/Patcher/commit/e22f760de3d0add3fde1f62089c26023415628cb))
* **module:** smoother details loading ([ef52e6b](https://github.com/Polyterative/Patcher/commit/ef52e6b49dfecee84f35804a7eb26af2ddab8900))
* **module:** smoother loading ([814086d](https://github.com/Polyterative/Patcher/commit/814086da7814a15869df3fc627d4b3fed9f2704e))
* **modules:** smoother appear animations ([e82b574](https://github.com/Polyterative/Patcher/commit/e82b5744036e2492e9a816ebe5a96449658d97e6))
* **module:** working related modules links ([b8082cc](https://github.com/Polyterative/Patcher/commit/b8082ccdb180d02f133bbe1f53e3aea4579715b2))
* **panels:** api calls improvements ([eaa0d9e](https://github.com/Polyterative/Patcher/commit/eaa0d9ead0f70f1c661842652c4cd5479d308612))
* **panels:** better feedback message ([16797d1](https://github.com/Polyterative/Patcher/commit/16797d1d3bd133c19db25d87f7b89ca78d3c9f4b))
* **panels:** images click now opens module detail ([a10fccc](https://github.com/Polyterative/Patcher/commit/a10fccc80c3bc4d008290d05e188cb93dc8e7fdf))
* **panels:** module panel description in DB ([b9a94d6](https://github.com/Polyterative/Patcher/commit/b9a94d69ea29df8fac03a2ddb527695be2c2951f))
* **panels:** module panel image upload ([96201cc](https://github.com/Polyterative/Patcher/commit/96201cc1d8ee6949bc2f379535973e986077a215))
* **patch:** better UI ([ce33b38](https://github.com/Polyterative/Patcher/commit/ce33b38b31dfafd49a9b0f5649e6d8011efe1cc2))
* **rack:** cleaner reloading ([161a9b6](https://github.com/Polyterative/Patcher/commit/161a9b6593c63c2b3f4e78bffc87c8419c08f976))
* **rack:** modules picker below rack editor ([a80b2f1](https://github.com/Polyterative/Patcher/commit/a80b2f1f62413e4a241f2a18e94f83a6840358b6))
* **rack:** panel images in rack ([f798416](https://github.com/Polyterative/Patcher/commit/f7984164a826050cde88a8fa64961f58c8ecbac5))
* **style:** less horizontal padding in app root ([bac4750](https://github.com/Polyterative/Patcher/commit/bac47501971fe999534dca150b085eb9ed2710af))
* **ui:** browsers now full width ([fd637bb](https://github.com/Polyterative/Patcher/commit/fd637bb8ed5b3d88923d39773baf5f36e35dc008))


### Bug Fixes

* **panels:** filtering of approved in call ([54fe6fd](https://github.com/Polyterative/Patcher/commit/54fe6fd4d7a0fc294852b473998bee198a1c96bc))

## [4.0.0](https://github.com/Polyterative/Patcher/compare/v3.8.0...v4.0.0) (2022-07-08)

## [3.8.0](https://github.com/Polyterative/Patcher/compare/v3.7.2...v3.8.0) (2022-03-06)


### Bug Fixes

* **app:** now using Yarn ([4dd0475](https://github.com/Polyterative/Patcher/commit/4dd04755873ae42d78b1211a3be86d7d7221f911))
* **app:** removed unused firebase references ([5cb44b5](https://github.com/Polyterative/Patcher/commit/5cb44b5a590afd8bca074e443d31c2bf3e131dc8))
* **changelog page:** initial work ([5b68653](https://github.com/Polyterative/Patcher/commit/5b68653bbf142b32172693d916894c05b883cad7))
* **libs:** completely removed anything related to firebase ([1ee8223](https://github.com/Polyterative/Patcher/commit/1ee8223c31d506655700cebe2fb90feb29332df3))
* **libs:** mat form entity chips disabling ([ac75201](https://github.com/Polyterative/Patcher/commit/ac75201e0243680a85333e60d924de6674956a71))
* **libs:** updated version ([3a3aa35](https://github.com/Polyterative/Patcher/commit/3a3aa35f8990c9ea1943a919e292f0cd9f425e45))
* **libs:** updated versions ([f4a2713](https://github.com/Polyterative/Patcher/commit/f4a2713fbc09e60e25333b409ef6c60759c128d2))
* **supabase:** fixed call involving foreign table in view ([cef611d](https://github.com/Polyterative/Patcher/commit/cef611db12fd33a371adbd34ed1c7db8e29749df))

### [3.7.2](https://github.com/Polyterative/Patcher/compare/v3.7.1...v3.7.2) (2022-02-05)


### Bug Fixes

* **module adder:** format default order ([0280325](https://github.com/Polyterative/Patcher/commit/02803250de19f7b1cac67a5ed16bd9de23830d67))

### [3.7.1](https://github.com/Polyterative/Patcher/compare/v3.7.0...v3.7.1) (2022-02-05)


### Bug Fixes

* **module adder:** format default ([747434c](https://github.com/Polyterative/Patcher/commit/747434c73c114bedb7d7a727e545241c7065e4f5))

## [3.7.0](https://github.com/Polyterative/Patcher/compare/v3.6.7...v3.7.0) (2022-02-05)


### Features

* add a module page ([d35686a](https://github.com/Polyterative/Patcher/commit/d35686a70fffb1bec285b2aff57ccb89fccd60a3))
* **moduleAdder:** label changes ([87381b3](https://github.com/Polyterative/Patcher/commit/87381b389f9b3bcea8b5ccdda9a0e6289c85a611))
* **moduleAdder:** label changes ([aeedab0](https://github.com/Polyterative/Patcher/commit/aeedab06bf4050cdfd3ed97d6bce42217b72867c))
* **moduleAdder:** layout improvements ([3d4c089](https://github.com/Polyterative/Patcher/commit/3d4c0898b69a5d82b9e180ac79bbd11d5864e4e7))


### Bug Fixes

* **abstract modules:** initial special support ([4ee6a4c](https://github.com/Polyterative/Patcher/commit/4ee6a4c74f8a2f1b5fe5aa70461851ee9b836347))
* **lists:** labels order ([756fa09](https://github.com/Polyterative/Patcher/commit/756fa09488721397b159b1b3940cfc9fadf49786))
* **moduleAdder:** tab title ([f150bfe](https://github.com/Polyterative/Patcher/commit/f150bfe5d57488226d40083550ad972816827e02))
* **module:** max length in description ([b31bdbe](https://github.com/Polyterative/Patcher/commit/b31bdbef65087e27f95970a47879ecdf9af50db9))
* **moduleslist/rackslist:** fixed dates ([a1a86dd](https://github.com/Polyterative/Patcher/commit/a1a86ddaa941da78908e36547ec6a407847af510))
* **rack builder:** modules height ([d4816ae](https://github.com/Polyterative/Patcher/commit/d4816ae748f9d5509b8278a12302c6e4b4da6754))

### [3.6.7](https://github.com/Polyterative/Patcher/compare/v3.6.6...v3.6.7) (2022-02-03)


### Features

* cv editor improvements ([6b9f662](https://github.com/Polyterative/Patcher/commit/6b9f6625fb8817f018dcb785c20dfa028dc94ed3))
* Now CV Editor shows which CVs have been approved (usually the ones with full data) ([12d34cb](https://github.com/Polyterative/Patcher/commit/12d34cbd45b653252ad6fabbff14c88520261362))

### [3.6.6](https://github.com/Polyterative/Patcher/compare/v3.6.5...v3.6.6) (2022-02-03)


### Bug Fixes

* graph height ([8097d56](https://github.com/Polyterative/Patcher/commit/8097d56c7c11812da1e309c6c90f415ce1bcff79))

### [3.6.5](https://github.com/Polyterative/Patcher/compare/v3.6.4...v3.6.5) (2022-02-02)


### Features

* help more visible ([a34ee28](https://github.com/Polyterative/Patcher/commit/a34ee289cc0ead43e6bcb22375779c0ad4eaafd6))

### [3.6.4](https://github.com/Polyterative/Patcher/compare/v3.6.3...v3.6.4) (2022-02-02)


### Bug Fixes

* voltage adder values ([c8b8d32](https://github.com/Polyterative/Patcher/commit/c8b8d3270c17cb6d62e702a9b5228b0449701ad4))

### [3.6.3](https://github.com/Polyterative/Patcher/compare/v3.6.2...v3.6.3) (2022-02-02)


### Bug Fixes

* scrollbar back to .5rem ([916e4d0](https://github.com/Polyterative/Patcher/commit/916e4d03a94b63ad28ee4ec14d0018fc06fafeef))

### [3.6.2](https://github.com/Polyterative/Patcher/compare/v3.6.1...v3.6.2) (2022-02-02)


### Bug Fixes

* sitemap priority ([47cfc85](https://github.com/Polyterative/Patcher/commit/47cfc854036aa975963b8a77c0205edaf80315e8))

### [3.6.1](https://github.com/Polyterative/Patcher/compare/v3.6.0...v3.6.1) (2022-02-02)


### Features

* producthunt badge ([ab38d7d](https://github.com/Polyterative/Patcher/commit/ab38d7d7283babc87a53f3ee3ef7ec90e89092d1))

## [3.6.0](https://github.com/Polyterative/Patcher/compare/v3.5.0...v3.6.0) (2022-02-02)


### Features

*  patch CV list on the left ([2388706](https://github.com/Polyterative/Patcher/commit/23887060ff2a784d48c6a43ef67b0b5e0652fca5))
* comments placeholder active ([aae0815](https://github.com/Polyterative/Patcher/commit/aae08153b525a07daf32688af33e84bf35781eee))
* less padding in patch CV list and overall ([15c71ff](https://github.com/Polyterative/Patcher/commit/15c71ff7b7c18f5d44aa2b02f7cf6665c1db040c))
* reduced spacing between elements in lists ([0357ee1](https://github.com/Polyterative/Patcher/commit/0357ee13c9d179a48c7780a9db4a632e20ba57b5))

## [3.5.0](https://github.com/Polyterative/Patcher/compare/v3.4.3...v3.5.0) (2022-01-30)


### Features

* cleaned lists layouts ([0db67d3](https://github.com/Polyterative/Patcher/commit/0db67d36840c451c9cf54b68b4d46e0c00363955))
* cleaned lists layouts ([b40866c](https://github.com/Polyterative/Patcher/commit/b40866c42c1f31a75a444a0c069e470942ea5079))
* home now shows videos instead of the actual components (faster) ([1574f7d](https://github.com/Polyterative/Patcher/commit/1574f7d7663dea76d96017ec3ff18cb5994bbecf))
* showing patches for a module ([49de1ee](https://github.com/Polyterative/Patcher/commit/49de1ee4d5f8dc22eb463ce64ab512496f894d81))
* user collection improvements ([8572c90](https://github.com/Polyterative/Patcher/commit/8572c9076e713ee2fb0a16d622cebbc67e88736d))


### Bug Fixes

* dialogs backdrop ([cd7b495](https://github.com/Polyterative/Patcher/commit/cd7b495479d20929e42f4d8b64fc4167d9755309))
* height limiter now more relaxed ([37c22ea](https://github.com/Polyterative/Patcher/commit/37c22ea59ed5c9b18862d5dd1c458ce2c87cb6a3))
* layouts ([7a23330](https://github.com/Polyterative/Patcher/commit/7a233303bfb98f7517aac7bddb576d0eeb2b0b72))
* miscellaneous ([86c3a5f](https://github.com/Polyterative/Patcher/commit/86c3a5fcfb9d0d27edf08ca9423e29d051858265))
* module cv adder layout ([4fd30db](https://github.com/Polyterative/Patcher/commit/4fd30db52bf839ef9fac16792d68eb9c2b189708))
* module cv adder width ([8e93929](https://github.com/Polyterative/Patcher/commit/8e9392974910237c7384e792ffa2cd82084bba7d))

### [3.4.3](https://github.com/Polyterative/Patcher/compare/v3.4.2...v3.4.3) (2022-01-29)


### Features

* loader enter animations ([f918a4a](https://github.com/Polyterative/Patcher/commit/f918a4abd9d9ead9ca2ee4324a89bdcebe3b88a1))
* module details now wide ([86efde2](https://github.com/Polyterative/Patcher/commit/86efde2a6a9fbf82e22ca779498c809ac3ad9337))
* module shows which racks use them ([3263cfc](https://github.com/Polyterative/Patcher/commit/3263cfcb3225162737412af108679e116296393d))
* smoother graph draw ([87afd0d](https://github.com/Polyterative/Patcher/commit/87afd0dbe9f952461362bc5ad571791109464d3d))


### Bug Fixes

* more specific foreign key on API calls because now using some views ([2d5cd29](https://github.com/Polyterative/Patcher/commit/2d5cd2961d42d9a9cb280c836cd230d066de48b8))

### [3.4.2](https://github.com/Polyterative/Patcher/compare/v3.4.1...v3.4.2) (2022-01-29)

### [3.4.1](https://github.com/Polyterative/Patcher/compare/v3.4.0...v3.4.1) (2022-01-28)


### Features

* sitemap updated with modules ([2bf381f](https://github.com/Polyterative/Patcher/commit/2bf381fd30ebe9b48a2cfede9aeb5d1994396639))

## [3.4.0](https://github.com/Polyterative/Patcher/compare/v3.3.1...v3.4.0) (2022-01-28)


### Features

* firefox scrollbar improvements ([8cc2cfe](https://github.com/Polyterative/Patcher/commit/8cc2cfe963b870debe0c26f5d1a1f755c5231f2d))
* home now looks well in firefox ([0ff21dd](https://github.com/Polyterative/Patcher/commit/0ff21dd2bcad45e542f1fca5d619e75adb4b5c93))
* module list now shows tags ([f36f826](https://github.com/Polyterative/Patcher/commit/f36f82604fee01c90f5f19c0757d9b4c1ed5eca7))
* now providing basic SEO metatags ([84b69a3](https://github.com/Polyterative/Patcher/commit/84b69a38354bf4e00884401c68a630908965b157))
* now providing basic SEO metatags ([ac314e7](https://github.com/Polyterative/Patcher/commit/ac314e7544226aaaaf54d522cddbfab3726efcc1))
* patch editor improved delete dialog ([0d8c9fc](https://github.com/Polyterative/Patcher/commit/0d8c9fc728e171918b9245c15c0a0a316414f359))
* patch editor improved layout ([3309f60](https://github.com/Polyterative/Patcher/commit/3309f60e7c63f75aaf43dfa9058f03999c93b9e8))

### [3.3.1](https://github.com/Polyterative/Patcher/compare/v3.3.0...v3.3.1) (2022-01-26)


### Features

* login/signup password manager support ([f7cf334](https://github.com/Polyterative/Patcher/commit/f7cf33443316a1a9b9b6a1e3ee0e7d2724170cd2))
* login/signup UI clean ([2bcb2ba](https://github.com/Polyterative/Patcher/commit/2bcb2ba4892b113cc4464a8d6cf7da5cdcc254e7))
* login/signup UI clean ([a2b898d](https://github.com/Polyterative/Patcher/commit/a2b898da4a50608bc52524d1a88fd9f1f6e84003))
* login/signup UI clean ([f0f6355](https://github.com/Polyterative/Patcher/commit/f0f6355bb6808c2d63287866c8df6694493ea8d9))
* module CV adder supports approval mechanism ([6e6413e](https://github.com/Polyterative/Patcher/commit/6e6413e8fccea3fb56d14ee6e35dbf6663b85a17))
* module CV editor improvements ([3414537](https://github.com/Polyterative/Patcher/commit/3414537ff604532bbe7d0e6500c56335706bb20c))
* module CV editor improvements ([1e90ca0](https://github.com/Polyterative/Patcher/commit/1e90ca06509c16e9be7cab8581dc385329cd06de))
* module CV editor now saves original contributor's name ([34a5c41](https://github.com/Polyterative/Patcher/commit/34a5c41bea2560db246d866af6b0766cd6c6bb3a))
* module CV editor supports approval mechanism ([b6fed89](https://github.com/Polyterative/Patcher/commit/b6fed899f3f620f020ec9701bc33e290c6db9d1a))
* module editor improvements ([6a75200](https://github.com/Polyterative/Patcher/commit/6a752007e2d9dd96c1e641e2ee6c44ac2a06b6ae))


### Bug Fixes

* rack creator layout is now displaying properly ([425123b](https://github.com/Polyterative/Patcher/commit/425123b0dbf82b74f278b92c40f55635c17e6aea))

## [3.3.0](https://github.com/Polyterative/Patcher/compare/v3.2.6...v3.3.0) (2022-01-25)


### Features

* layouts performance improvements ([7eeb2d5](https://github.com/Polyterative/Patcher/commit/7eeb2d5c45b5e1aecc7ae48b6d8a6c2a80459034))
* patch builder improvements ([b3c30f6](https://github.com/Polyterative/Patcher/commit/b3c30f697efa09cc51e7fd696a49b2e096d907ff))
* rack builder improvements ([034e47c](https://github.com/Polyterative/Patcher/commit/034e47cc5ec1c6b27626cdc938c21bf8b6e557ab))
* smoother graph draw ([9fd1180](https://github.com/Polyterative/Patcher/commit/9fd11805052f97d2c6fd3d8ba13d4d88e0dfb2a3))

### [3.2.6](https://github.com/Polyterative/Patcher/compare/v3.2.5...v3.2.6) (2022-01-22)


### Features

* graph improvements ([bcb5fb3](https://github.com/Polyterative/Patcher/commit/bcb5fb33c39e17364db4fd76546b0a8bfe7e1cf6))
* smoother graph draw ([ab6cd57](https://github.com/Polyterative/Patcher/commit/ab6cd577d4cc82fee39fb490f3edea703a61f5a1))

### [3.2.5](https://github.com/Polyterative/Patcher/compare/v3.2.4...v3.2.5) (2022-01-21)


### Features

* animations improvements ([0e4c036](https://github.com/Polyterative/Patcher/commit/0e4c03630f9cde6f058962b6e1a499adc8857684))
* homepage improvements ([f8ca1b0](https://github.com/Polyterative/Patcher/commit/f8ca1b08cc8fa3c2252b7f64ee111bc58678ca08))
* rack builder context menu improvements ([718e7a6](https://github.com/Polyterative/Patcher/commit/718e7a68616f48805e363887c84f7df866cddf74))


### Bug Fixes

* rack builder module duplication ([92b76f0](https://github.com/Polyterative/Patcher/commit/92b76f0bae2c7e37cf9e448ce3c5cb517de5af7c))
* rack builder module duplication ([e38d95e](https://github.com/Polyterative/Patcher/commit/e38d95eedaede2a7ae68e4ce6ff835c9e110d412))
* rack builder now shows unracked module properly ([adabe54](https://github.com/Polyterative/Patcher/commit/adabe5496f9d64c03ec7e4dc05fdb226f4ce3426))

### [3.2.4](https://github.com/Polyterative/Patcher/compare/v3.2.3...v3.2.4) (2022-01-21)


### Features

* animations + fixes in the rack builder ([26bdbfb](https://github.com/Polyterative/Patcher/commit/26bdbfb1e8d064c812ce4c1ec574557f40badaeb))
* animations improvements ([f3dfbca](https://github.com/Polyterative/Patcher/commit/f3dfbca0425871a6760cbcff4b1759423d79d926))
* custom scrollbars + improved scrolling areas ([66e6f9e](https://github.com/Polyterative/Patcher/commit/66e6f9eb22d9f5fe552ab8417dab1546e489934e))
* improvements to the rack builder ([942038d](https://github.com/Polyterative/Patcher/commit/942038d1ec0f4821c6513ce3787a6b322729dbd5))

### [3.2.3](https://github.com/Polyterative/Patcher/compare/v3.2.2...v3.2.3) (2022-01-20)


### Features

* animations improvements ([743035a](https://github.com/Polyterative/Patcher/commit/743035a24330a20d46e4fd464db3019bcccce6b9))
* module outs are now first in the list ([fb0bac5](https://github.com/Polyterative/Patcher/commit/fb0bac57535d937ceb0479369c5dd1cb48974e82))
* module page callouts for contributions ([2566bf9](https://github.com/Polyterative/Patcher/commit/2566bf9a669974149e8735dac3103bbf7935aa05))
* module page callouts for contributions ([a5d4c93](https://github.com/Polyterative/Patcher/commit/a5d4c9378047753239485fde7bfaac156bb3841a))
* module UI improvements ([7788fa3](https://github.com/Polyterative/Patcher/commit/7788fa3b230c56f5d10c0827e0aefae0e356ba08))
* user area improvements ([789232d](https://github.com/Polyterative/Patcher/commit/789232d677b42795e253e0d50111d797b4139ad6))

### [3.2.2](https://github.com/Polyterative/Patcher/compare/v3.2.1...v3.2.2) (2022-01-20)


### Features

* login/signup improvements ([7c7e989](https://github.com/Polyterative/Patcher/commit/7c7e98971bd65008e7f524e0e84985395c9db808))

### [3.2.1](https://github.com/Polyterative/Patcher/compare/v3.2.0...v3.2.1) (2022-01-19)


### Features

* animations in main lists ([f8cbf09](https://github.com/Polyterative/Patcher/commit/f8cbf094bae8774bacac42193968a6a56c949b68))
* appear animations in module ([0540f96](https://github.com/Polyterative/Patcher/commit/0540f9626f0a3430726f1a004ce52bc3751e0973))
* dependencies updated ([06225ce](https://github.com/Polyterative/Patcher/commit/06225ce6fa5a1dc00961f0cd5784ab61b599a6d5))
* filters less aggressive on showing data ([164c207](https://github.com/Polyterative/Patcher/commit/164c20711404744c06933ef298fcef194056c099))
* homepage animations ([794f532](https://github.com/Polyterative/Patcher/commit/794f532561cb44377e43a2ae2a39fed28f9cbc57))
* homepage improvements ([90c8847](https://github.com/Polyterative/Patcher/commit/90c8847a14ee3f76e30f7bb44e479731fb35e6c9))

## [3.2.0](https://github.com/Polyterative/Patcher/compare/v3.1.4...v3.2.0) (2022-01-19)


### Features

* patch graph UI improvements ([0af92f8](https://github.com/Polyterative/Patcher/commit/0af92f8665cddb764386b3e07b8f3ec120951ce7))

### [3.1.4](https://github.com/Polyterative/Patcher/compare/v3.1.3...v3.1.4) (2022-01-19)

### [3.1.3](https://github.com/Polyterative/Patcher/compare/v3.1.2...v3.1.3) (2022-01-19)


### Features

* auto changelog improvements ([5096d4e](https://github.com/Polyterative/Patcher/commit/5096d4e27916ff9d0f363d825544d8a0c30fd974))

### [3.1.2](https://github.com/Polyterative/Patcher/compare/v3.1.1...v3.1.2) (2022-01-19)


### Features

* auto changelog improvements ([a62ec3c](https://github.com/Polyterative/Patcher/commit/a62ec3c664f7dfea552a3d7e2d95d94b99a35818))

### [3.1.1](https://github.com/Polyterative/Patcher/compare/v3.1.0...v3.1.1) (2022-01-19)

## [3.1.0](https://github.com/Polyterative/Patcher/compare/v3.0.17...v3.1.0) (2022-01-19)

### [3.0.17](https://github.com/Polyterative/Patcher/compare/v3.0.16...v3.0.17) (2022-01-19)

### [3.0.16](https://github.com/Polyterative/Patcher/compare/v3.0.15...v3.0.16) (2022-01-19)

### [3.0.15](https://github.com/Polyterative/Patcher/compare/v3.0.14...v3.0.15) (2022-01-19)


### Features

* auto changelog improvements ([8297bd2](https://github.com/Polyterative/Patcher/commit/8297bd2c2f82a1b3b1cb090d2b02f32ecd234ebd))

### [3.0.14](https://github.com/Polyterative/Patcher/compare/v3.0.13...v3.0.14) (2022-01-19)


### Features

* auto changelog improvements ([da32039](https://github.com/Polyterative/Patcher/commit/da32039341f83d5606f5d7309eafeb4341bf3af0))

### [3.0.13](https://github.com/Polyterative/Patcher/compare/v3.0.12...v3.0.13) (2022-01-19)


### Features

* auto changelog building ([1f43e6d](https://github.com/Polyterative/Patcher/commit/1f43e6d03cd623584d94701d5d15b0dda694ca05))

### [3.0.12](https://github.com/Polyterative/Patcher/compare/v3.0.10...v3.0.12) (2022-01-19)

### [3.0.11](https://github.com/Polyterative/Patcher/compare/v3.0.10...v3.0.11) (2022-01-19)

### [3.0.10](https://github.com/Polyterative/Patcher/compare/v3.0.9...v3.0.10) (2022-01-19)


### Features

* cleaned footer ([0cfaa54](https://github.com/Polyterative/Patcher/commit/0cfaa5452c6f649a869627e2e1b8ad017b5842f6))

### [3.0.9](https://github.com/Polyterative/Patcher/compare/v3.0.8...v3.0.9) (2022-01-19)

### [3.0.8](https://github.com/Polyterative/Patcher/compare/v3.0.7...v3.0.8) (2022-01-18)

### [3.0.7](https://github.com/Polyterative/Patcher/compare/v3.0.6...v3.0.7) (2022-01-18)

### [3.0.6](https://github.com/Polyterative/Patcher/compare/v3.0.5...v3.0.6) (2022-01-14)

### [3.0.5](https://github.com/Polyterative/Patcher/compare/v3.0.4...v3.0.5) (2022-01-12)

### [3.0.4](https://github.com/Polyterative/Patcher/compare/v3.0.3...v3.0.4) (2022-01-12)

### [3.0.3](https://github.com/Polyterative/Patcher/compare/v3.0.2...v3.0.3) (2022-01-12)

### [3.0.2](https://github.com/Polyterative/Patcher/compare/v3.0.1...v3.0.2) (2022-01-08)

### [3.0.1](https://github.com/Polyterative/Patcher/compare/v3.0.0...v3.0.1) (2022-01-08)

## [3.0.0](https://github.com/Polyterative/Patcher/compare/v2.19.2...v3.0.0) (2022-01-07)

### [2.19.2](https://github.com/Polyterative/Patcher/compare/v2.19.1...v2.19.2) (2022-01-03)

### [2.19.1](https://github.com/Polyterative/Patcher/compare/v2.19.0...v2.19.1) (2022-01-03)

## [2.19.0](https://github.com/Polyterative/Patcher/compare/v2.18.1...v2.19.0) (2022-01-01)

### [2.18.1](https://github.com/Polyterative/Patcher/compare/v2.18.0...v2.18.1) (2021-12-30)

## [2.18.0](https://github.com/Polyterative/Patcher/compare/v2.17.14...v2.18.0) (2021-12-30)

### [2.17.14](https://github.com/Polyterative/Patcher/compare/v2.17.13...v2.17.14) (2021-12-28)

### [2.17.13](https://github.com/Polyterative/Patcher/compare/v2.17.12...v2.17.13) (2021-12-28)

### [2.17.12](https://github.com/Polyterative/Patcher/compare/v2.17.10...v2.17.12) (2021-12-28)

### [2.17.11](https://github.com/Polyterative/Patcher/compare/v2.17.10...v2.17.11) (2021-12-28)

### [2.17.10](https://github.com/Polyterative/Patcher/compare/v2.17.9...v2.17.10) (2021-12-26)

### [2.17.9](https://github.com/Polyterative/Patcher/compare/v2.17.8...v2.17.9) (2021-12-25)

### [2.17.8](https://github.com/Polyterative/Patcher/compare/v2.17.7...v2.17.8) (2021-12-25)

### [2.17.7](https://github.com/Polyterative/Patcher/compare/v2.17.6...v2.17.7) (2021-09-18)

### [2.17.6](https://github.com/Polyterative/Patcher/compare/v2.17.5...v2.17.6) (2021-09-18)

### [2.17.5](https://github.com/Polyterative/Patcher/compare/v2.17.4...v2.17.5) (2021-09-18)

### [2.17.4](https://github.com/Polyterative/Patcher/compare/v2.17.3...v2.17.4) (2021-09-18)

### [2.17.3](https://github.com/Polyterative/Patcher/compare/v2.17.2...v2.17.3) (2021-09-18)

### [2.17.2](https://github.com/Polyterative/Patcher/compare/v2.17.1...v2.17.2) (2021-09-18)

### [2.17.1](https://github.com/Polyterative/Patcher/compare/v2.17.0...v2.17.1) (2021-09-18)

## [2.17.0](https://github.com/Polyterative/Patcher/compare/v2.16.0...v2.17.0) (2021-09-17)

## [2.16.0](https://github.com/Polyterative/Patcher/compare/v2.15.0...v2.16.0) (2021-09-16)

## [2.15.0](https://github.com/Polyterative/Patcher/compare/v2.14.2...v2.15.0) (2021-09-13)

### [2.14.2](https://github.com/Polyterative/Patcher/compare/v2.14.1...v2.14.2) (2021-05-30)

### [2.14.1](https://github.com/Polyterative/Patcher/compare/v2.14.0...v2.14.1) (2021-05-28)

## [2.14.0](https://github.com/Polyterative/Patcher/compare/v2.13.5...v2.14.0) (2021-05-28)

### [2.13.5](https://github.com/Polyterative/Patcher/compare/v2.13.4...v2.13.5) (2021-05-28)

### [2.13.4](https://github.com/Polyterative/Patcher/compare/v2.13.3...v2.13.4) (2021-05-28)

### [2.13.3](https://github.com/Polyterative/Patcher/compare/v2.13.2...v2.13.3) (2021-05-28)

### [2.13.2](https://github.com/Polyterative/Patcher/compare/v2.13.1...v2.13.2) (2021-05-28)

### [2.13.1](https://github.com/Polyterative/Patcher/compare/v2.13.0...v2.13.1) (2021-05-27)

## [2.13.0](https://github.com/Polyterative/Patcher/compare/v2.12.2...v2.13.0) (2021-05-26)

### [2.12.2](https://github.com/Polyterative/Patcher/compare/v2.12.1...v2.12.2) (2021-05-24)

### [2.12.1](https://github.com/Polyterative/Patcher/compare/v2.12.0...v2.12.1) (2021-05-24)

## [2.12.0](https://github.com/Polyterative/Patcher/compare/v2.11.7...v2.12.0) (2021-05-24)

### [2.11.7](https://github.com/Polyterative/Patcher/compare/v2.11.6...v2.11.7) (2021-05-24)

### [2.11.6](https://github.com/Polyterative/Patcher/compare/v2.11.5...v2.11.6) (2021-05-23)

### [2.11.5](https://github.com/Polyterative/Patcher/compare/v2.11.4...v2.11.5) (2021-05-23)

### [2.11.4](https://github.com/Polyterative/Patcher/compare/v2.11.3...v2.11.4) (2021-05-23)

### [2.11.3](https://github.com/Polyterative/Patcher/compare/v2.11.2...v2.11.3) (2021-05-23)

### [2.11.2](https://github.com/Polyterative/Patcher/compare/v2.11.1...v2.11.2) (2021-05-23)

### [2.11.1](https://github.com/Polyterative/Patcher/compare/v2.11.0...v2.11.1) (2021-05-23)

## [2.11.0](https://github.com/Polyterative/Patcher/compare/v2.10.4...v2.11.0) (2021-05-23)

### [2.10.4](https://github.com/Polyterative/Patcher/compare/v2.10.3...v2.10.4) (2021-05-23)

### [2.10.3](https://github.com/Polyterative/Patcher/compare/v2.10.2...v2.10.3) (2021-05-23)

### [2.10.2](https://github.com/Polyterative/Patcher/compare/v2.10.1...v2.10.2) (2021-05-23)

### [2.10.1](https://github.com/Polyterative/Patcher/compare/v2.10.0...v2.10.1) (2021-05-23)

## [2.10.0](https://github.com/Polyterative/Patcher/compare/v2.9.0...v2.10.0) (2021-05-23)

## [2.9.0](https://github.com/Polyterative/Patcher/compare/v2.8.15...v2.9.0) (2021-05-22)

### [2.8.15](https://github.com/Polyterative/Patcher/compare/v2.8.14...v2.8.15) (2021-05-22)

### [2.8.14](https://github.com/Polyterative/Patcher/compare/v2.8.13...v2.8.14) (2021-05-22)

### [2.8.13](https://github.com/Polyterative/Patcher/compare/v2.8.12...v2.8.13) (2021-05-22)

### [2.8.12](https://github.com/Polyterative/Patcher/compare/v2.8.11...v2.8.12) (2021-05-22)

### [2.8.11](https://github.com/Polyterative/Patcher/compare/v2.8.10...v2.8.11) (2021-05-22)

### [2.8.10](https://github.com/Polyterative/Patcher/compare/v2.8.9...v2.8.10) (2021-05-22)

### [2.8.9](https://github.com/Polyterative/Patcher/compare/v2.8.8...v2.8.9) (2021-05-22)

### [2.8.8](https://gitlab.com/polymain/focus/compare/v2.8.7...v2.8.8) (2021-05-22)

### [2.8.7](https://gitlab.com/polymain/focus/compare/v2.8.6...v2.8.7) (2021-05-22)

### [2.8.6](https://gitlab.com/polymain/focus/compare/v2.8.5...v2.8.6) (2021-05-18)

### [2.8.5](https://gitlab.com/polymain/focus/compare/v2.8.4...v2.8.5) (2021-05-18)

### [2.8.4](https://gitlab.com/polymain/focus/compare/v2.8.3...v2.8.4) (2021-05-18)

### [2.8.3](https://gitlab.com/polymain/focus/compare/v2.8.2...v2.8.3) (2021-05-16)

### [2.8.2](https://gitlab.com/polymain/focus/compare/v2.8.1...v2.8.2) (2021-05-16)

### [2.8.1](https://gitlab.com/polymain/focus/compare/v2.8.0...v2.8.1) (2021-05-16)

## [2.8.0](https://gitlab.com/polymain/focus/compare/v2.7.2...v2.8.0) (2021-05-15)

### [2.7.2](https://gitlab.com/polymain/focus/compare/v2.7.1...v2.7.2) (2021-05-15)

### [2.7.1](https://gitlab.com/polymain/focus/compare/v2.7.0...v2.7.1) (2021-05-15)

## [2.7.0](https://gitlab.com/polymain/focus/compare/v2.6.6...v2.7.0) (2021-05-15)

### [2.6.6](https://gitlab.com/polymain/focus/compare/v2.6.5...v2.6.6) (2021-05-14)

### [2.6.5](https://gitlab.com/polymain/focus/compare/v2.6.4...v2.6.5) (2021-05-14)

### [2.6.4](https://gitlab.com/polymain/focus/compare/v2.6.3...v2.6.4) (2021-05-14)

### [2.6.3](https://gitlab.com/polymain/focus/compare/v2.6.2...v2.6.3) (2021-05-14)

### [2.6.2](https://gitlab.com/polymain/focus/compare/v2.5.1...v2.6.2) (2021-05-14)

### [2.5.1](https://gitlab.com/polymain/focus/compare/v2.5.0...v2.5.1) (2021-05-14)

## [2.5.0](https://gitlab.com/polymain/focus/compare/v2.4.0...v2.5.0) (2021-05-14)

## [2.4.0](https://gitlab.com/polymain/focus/compare/v2.3.0...v2.4.0) (2021-05-14)

## 2.3.0 (2021-05-14)