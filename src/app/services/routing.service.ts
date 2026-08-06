import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

interface RackLinkable {
  id: number;
  public_id?: string | null;
}

interface PatchLinkable {
  id: number;
  public_id?: string | null;
}

@Injectable({
    providedIn: 'root'
})
export class RoutingService {

    constructor(
        private router: Router
    ) {
    }

    routeTo(paths: string[]) {
        this.router.navigate(paths);
    }

    openInNewTab(fullPath: string) {
        const win = window.open(fullPath, '_blank');
        win?.focus();
    }

    /**
     * Build a router-link array for a rack. Prefers the opaque `public_id`
     * (canonical, anti-enumeration). Falls back to the legacy
     * `/racks/details/:id` form when the row predates the migration — the
     * legacy redirect component resolves it server-side.
     */
    linkToRack(rack: RackLinkable | null | undefined): (string | number)[] {
        if (!rack) { return ['/racks']; }
        if (rack.public_id) { return ['/racks', rack.public_id]; }
        return ['/racks', 'details', rack.id];
    }

    /** See {@link linkToRack} — same rules for patches. */
    linkToPatch(patch: PatchLinkable | null | undefined): (string | number)[] {
        if (!patch) { return ['/patches']; }
        if (patch.public_id) { return ['/patches', patch.public_id]; }
        return ['/patches', 'details', patch.id];
    }

    /** Absolute path for clipboard/share copy. */
    rackPathFor(rack: RackLinkable | null | undefined): string {
        if (!rack) { return '/racks'; }
        if (rack.public_id) { return `/racks/${ rack.public_id }`; }
        return `/racks/details/${ rack.id }`;
    }

    patchPathFor(patch: PatchLinkable | null | undefined): string {
        if (!patch) { return '/patches'; }
        if (patch.public_id) { return `/patches/${ patch.public_id }`; }
        return `/patches/details/${ patch.id }`;
    }

}
