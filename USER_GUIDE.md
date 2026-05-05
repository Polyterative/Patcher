# Patcher User Guide

Patcher is a web workspace for Eurorack musicians who want one place to browse modules, document patches, plan racks,
track a collection, and share selected work publicly.

## Table of Contents

1. [What is Patcher?](#what-is-patcher)
2. [Getting Started](#getting-started)
3. [Navigation](#navigation)
4. [Modules](#modules)
5. [Patches](#patches)
6. [Racks](#racks)
7. [Your Profile & Account](#your-profile--account)
8. [Privacy & Data](#privacy--data)
9. [Tips & Best Practices](#tips--best-practices)
10. [Community & Support](#community--support)
11. [Quick Reference](#quick-reference)

---

## What is Patcher?

Patcher helps you manage the full modular workflow:

- **Browse modules** in a free public database
- **Build a personal collection** of the modules you own
- **Create patches** with connection graphs, notes, tags, and sharing controls
- **Plan racks** with layout tools, HP totals, and power/balance analysis
- **Share publicly** with public patches, public racks, and an optional public profile

You do **not** need an account to browse modules, public patches, public racks, or manufacturer pages.

---

## Getting Started

### Browsing before signing up

You can start by exploring:

- **Modules** for the public hardware database
- **Patches** for public patch examples
- **Racks** for public rack layouts
- **Manufacturers** for maker-specific browsing

### Creating an account

1. Visit [patcher.xyz](https://patcher.xyz).
2. Click **Sign up** when you want to save your own collection, patches, or racks.
3. Create an account with your email address and password.
4. After signing in, use **My profile** in the toolbar to open your personal workspace.

**Good to know:**

- Browsing public content does **not** require login.
- Submitting new modules requires login.
- The toolbar also shows your username as a separate link to account settings.

---

## Navigation

The main toolbar gives you direct access to:

- **Home**: overview and entry point
- **Modules**: module database and module discovery
- **Racks**: public rack browser
- **Patches**: public patch browser
- **Manufacturers**: manufacturer browser
- **My profile**: your personal workspace after signing in
- **Your username**: account-management page after signing in

---

## Modules

### Module browser

The module browser is the main place to discover hardware.

You can:

- Search by **name** and **description**
- Filter by **manufacturer**
- Filter by **HP** with comparison operators
- Filter by **format standard** (3U Eurorack, Intellijel 1U, Pulp Logic 1U)
- Filter by **tags**
- Change **sort order**
- Reset filters at any time

### Module details

Each module detail page can include:

- Manufacturer and standard information
- Panel gallery with multiple panel variants
- HP, depth, and weight when available
- Power requirements for **+12V**, **-12V**, and **+5V**
- Inputs, outputs, total jack count, and connectivity density
- Manual link when a manual URL is available
- Store link when a direct buy URL is available
- Related public patches and racks using that module
- Comments and discussion
- External search shortcuts for wider research

### Community curation

Patcher's module data is community-shaped:

- Tags can be **voted on**
- Signed-in users can **suggest additional tags**
- Signed-in users can **submit a new module**
- Signed-in users viewing a module can use **Submit similar** to start a prefilled submission
- Users can **report issues** on module entries

---

## Patches

### Creating a patch

1. Open **My profile**.
2. Go to your **Patches** section.
3. Click **Create patch**.
4. Add a name, description, and tags.
5. Add modules and document the connections between them.

### What patch pages show

Patch detail pages can include:

- Patch name, description, author, and timestamps
- A connection list
- A connection graph
- Patch statistics, including:
  - cables
  - unique modules
  - multiples
  - average cables per module
  - annotated connections
- A **Modules needed** summary when the patch uses repeated modules
- Comments and discussion

### Editing and sharing

Patch owners can:

- Edit patch metadata and tags
- Keep working on connections in the patch editor
- Copy a shareable link
- Switch the patch between **public** and **private**
- Delete the patch

**Privacy note:** private patches are hidden from search, but anyone with the direct URL can still open them.

---

## Racks

### Creating a rack

1. Open **My profile**.
2. Go to your **Racks** section.
3. Click **Create rack**.
4. Set the rack name and basic size details.
5. Add modules and arrange them visually.

### Rack planning features

Rack detail pages combine a summary view with the editor:

- Rack preview and summary stats
- HP tracking
- Power totals
- Balance analysis
- Comments
- Downloadable rack image export (`.jpeg`)

When you are editing your own rack, Patcher also exposes:

- Drag-and-drop layout editing
- Quick **Edit rack / Lock rack** switching
- Optional panel-image view
- Optional reduced-scale view
- Analysis modes for **power**, **function**, and **signal**
- **Update preview** to refresh the rack's stored preview image

### Per-module actions

On desktop, right-click a module in an editable rack. On touch devices, select a module to open its actions.

Available actions include:

- **Inspect panel**
- **Switch Panel** for modules with multiple panel variants
- **Duplicate**
- **Replace with blank** for spacing
- **Delete from rack**
- **Delete all in row**

### Sharing and duplication

Rack owners can:

- Toggle rack visibility between **public** and **private**
- Delete a rack while it is in editable mode

Any signed-in user can:

- **Duplicate** an existing rack into their own workspace

**Privacy note:** private racks are hidden from search, but anyone with the direct URL can still open them.

---

## Your Profile & Account

### Your profile workspace

Open **My profile** in the toolbar to reach your signed-in workspace.

Your profile workspace includes:

- **Modules**: your collection, plus quick actions to add modules or submit a new one
- **Racks**: the racks you manage
- **Patches**: the patches you manage
- **Profile stats**
- **Contributor stats**
- **Manuals**
- **Comments**
- A floating search box to search across your modules, racks, and patches

### Public profile controls

From **My profile**, you can:

- Make your profile **public** or **private**
- Open your public profile page
- Copy your public profile link

### Account management

Click your **username** in the toolbar to open account settings.

That page includes:

- Logout
- Your email address
- Linked sign-in providers
- Password change for email/password accounts
- **Delete my data**: removes your patches, racks, collection, and comments but keeps the account
- **Delete my account**: permanently removes the account and all associated data

---

## Privacy & Data

### Visibility controls

- The module database is public and free to browse.
- Profiles can be public or private.
- Patches can be public or private.
- Racks can be public or private.
- Private patches and racks are hidden from search, but direct links still work.

### Ownership and export

- You control the visibility of what you publish.
- Data exports are handled manually through support requests on Discord.
- You can either delete your content while keeping the account, or delete the account entirely.

### Authentication and analytics

- Authentication is handled through **Supabase**.
- In production, Patcher uses **Sentry** for error tracking, performance monitoring, and session replay.
- Patcher does **not** sell user data to third parties.

---

## Tips & Best Practices

### For module discovery

- Combine name, description, manufacturer, and tag filters for faster results.
- Check manuals and store links when they are available.
- Use tag voting and related racks/patches to discover alternatives.

### For patch documentation

- Name repeated module instances clearly when a patch uses multiple copies.
- Add tags early so patches stay easy to find later.
- Use the connection graph and statistics together to spot complexity quickly.

### For rack planning

- Leave some HP and power headroom for future changes.
- Use **Replace with blank** when you want spacing without guessing sizes later.
- Check both the rack totals and the balance-analysis panel before committing to a layout.

---

## Community & Support

### Where to get help

- **Discord**: best place for questions, feedback, feature discussion, and manual data-export requests
- **GitHub Issues**: best place for technical bug reports and reproducible problems

### Ways to contribute

- Report incorrect module data
- Submit missing modules
- Share public patches and racks
- Open issues or pull requests if you want to help with development

Useful links:

- [Join our Discord](https://discord.gg/N6Z32xJR)
- [Open a GitHub issue](https://github.com/Polyterative/Patcher/issues)
- [Read the changelog](CHANGELOG.md)

---

## Quick Reference

**Q: Is Patcher free to use?**  
A: Yes. The public module database and core product features are free.

**Q: Can I use Patcher without an account?**  
A: Yes. You can browse modules, manufacturers, public patches, and public racks without signing in.

**Q: How do I add a missing module?**  
A: Sign in and use **Submit a new module**, or join Discord if you need help first.

**Q: Can I export my data?**  
A: Yes, through a manual support request on Discord.

**Q: What formats are supported?**  
A: 3U Eurorack, Intellijel 1U, and Pulp Logic 1U.

**Q: Is there a mobile app?**  
A: Patcher is currently a web app that works in mobile browsers.

---

*Last updated: May 2026*  
*For technical documentation and contributor setup, see the [README](README.md).*
