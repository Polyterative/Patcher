import { isPlatformBrowser } from '@angular/common';
import {
  inject,
  Injectable,
  PLATFORM_ID
} from '@angular/core';
import { environment } from 'src/environments/environment';
import { SupabaseService } from '../../backend/supabase.service';

const PROXY_PREFIX = 'https://images.patcher.xyz/';
const PUBLIC_MARKER = '/storage/v1/object/public/';
const SIGNED_URL_SECONDS = 3600;
const SIGNED_URL_MARGIN_MS = 300_000;
const BATCH_DELAY_MS = 30;

export interface StorageImageRef {
  bucket: string;
  path: string;
}

/** Recognises proxy and direct public-storage image URLs; anything else (blob:, data:, signed) is left alone. */
export function parseStorageImageUrl(src: string, supabaseUrl: string = environment.supabase.url): StorageImageRef | null {
  let rest: string | null = null;
  if (src.startsWith(PROXY_PREFIX)) {
    rest = src.slice(PROXY_PREFIX.length);
  } else {
    const base = (supabaseUrl || '').replace(/\/$/, '');
    if (base && src.startsWith(`${ base }${ PUBLIC_MARKER }`)) {
      rest = src.slice(base.length + PUBLIC_MARKER.length);
    }
  }
  if (!rest) {
    return null;
  }
  const [bucketPart, ...pathParts] = rest.split('?')[0].split('/');
  try {
    const bucket = decodeURIComponent(bucketPart);
    const path = pathParts.map(part => decodeURIComponent(part)).join('/');
    return bucket && path ? {bucket, path} : null;
  } catch {
    return null;
  }
}

type SignFn = (bucket: string, paths: string[], expiresInSeconds: number) => Promise<Record<string, string>>;

/** Resolves image refs to signed URLs: in-memory cache, one batched request per bucket per tick window. */
export class AdminImageSigner {
  private readonly cache = new Map<string, {url: string; expiresAt: number}>();
  private readonly pending = new Map<string, Map<string, Array<(url: string | null) => void>>>();
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly sign: SignFn, private readonly now: () => number = Date.now) {}

  resolve(ref: StorageImageRef): Promise<string | null> {
    const key = `${ ref.bucket }/${ ref.path }`;
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > this.now()) {
      return Promise.resolve(hit.url);
    }
    return new Promise(resolve => {
      const bucket = this.pending.get(ref.bucket) ?? new Map();
      bucket.set(ref.path, [...(bucket.get(ref.path) ?? []), resolve]);
      this.pending.set(ref.bucket, bucket);
      this.timer ??= setTimeout(() => void this.flush(), BATCH_DELAY_MS);
    });
  }

  private async flush(): Promise<void> {
    this.timer = null;
    const batches = [...this.pending.entries()];
    this.pending.clear();
    for (const [bucket, byPath] of batches) {
      const paths = [...byPath.keys()];
      let signed: Record<string, string> = {};
      const requestedAt = this.now();
      try {
        signed = await this.sign(bucket, paths, SIGNED_URL_SECONDS);
      } catch {
        signed = {};
      }
      for (const [path, waiters] of byPath) {
        const url = signed[path] ?? null;
        if (url) {
          this.cache.set(`${ bucket }/${ path }`, {url, expiresAt: requestedAt + SIGNED_URL_SECONDS * 1000 - SIGNED_URL_MARGIN_MS});
        }
        waiters.forEach(w => w(url));
      }
    }
  }
}

/** Rewrites `<img src>` for admins while maintenance is on (public buckets are closed to everyone else). */
export function attachAdminImageRewriter(doc: Document, signer: AdminImageSigner): () => void {
  const handle = (img: HTMLImageElement): void => {
    const src = img.getAttribute('src') ?? '';
    const ref = parseStorageImageUrl(src);
    if (!ref) {
      return;
    }
    void signer.resolve(ref).then(url => {
      if (url && img.getAttribute('src') === src) {
        img.setAttribute('src', url);
      }
    });
  };
  const scan = (node: Node): void => {
    if (node instanceof HTMLImageElement) {
      handle(node);
    } else if (node instanceof Element) {
      node.querySelectorAll('img').forEach(handle);
    }
  };
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'attributes') {
        scan(record.target);
      } else {
        record.addedNodes.forEach(scan);
      }
    }
  });
  observer.observe(doc.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['src']});
  scan(doc.documentElement);
  return () => observer.disconnect();
}

@Injectable({providedIn: 'root'})
export class MaintenanceAdminImagesService {
  private readonly supabase = inject(SupabaseService);
  private readonly platformId = inject(PLATFORM_ID);
  private stop: (() => void) | null = null;

  /** Idempotent. Only active in the browser, while maintenance is on, for admins. */
  start(): void {
    if (!isPlatformBrowser(this.platformId) || !environment.features.maintenanceModeEnabled || this.stop) {
      return;
    }
    this.supabase.auth.hasAdminRole$().subscribe(isAdmin => {
      if (isAdmin && !this.stop) {
        const signer = new AdminImageSigner((bucket, paths, expires) =>
          this.supabase.storage.createSignedUrlsForBucket(bucket, paths, expires));
        this.stop = attachAdminImageRewriter(document, signer);
      }
    });
  }
}
