Use standard commit format for commits.Include the general user-facing area affected (e.g. "Module browser", "Patch
editor", "Rack details") and a concise description of the change.The final commit should be one line only.No more. For
example:

feat(module-browser): add sidebar layout with filters and reset button

fix(patch-editor): resolve unsaved changes warning by implementing auto-save

Use the following commit types:

- feat: A new feature for the user.
- fix: A bug fix for the user.
- docs: Changes to documentation only.
- style: Changes that do not affect the meaning of the code
- refactor: A code change that neither fixes a bug nor adds a feature.
- perf: A code change that improves performance.
- test: Adding missing tests or correcting existing tests.
- chore: Changes to the build process or auxiliary tools and libraries such as documentation generation.