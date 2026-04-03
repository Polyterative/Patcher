import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SeoSocialShareData } from 'src/app/models/seo.model';
import { combineLatest } from 'rxjs';
import {
  filter,
  map,
  take,
  takeUntil
} from 'rxjs/operators';
import { PatchDetailDataService } from 'src/app/components/patch-parts/patch-detail-data.service';
import {
  defaultPatchMinimalViewConfig,
  PatchMinimalViewConfig
} from 'src/app/components/patch-parts/patch-minimal/patch-minimal.component';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { SeoAndUtilsService } from '../../backbone/seo-and-utils.service';
import {
  CommentableEntityTypes,
  CommentsDataService
} from 'src/app/components/shared-atoms/comments/comments-data.service';
import {
  clearJsonLdScript,
  upsertJsonLdScript
} from 'src/app/shared-interproject/json-ld-dom';


const JSONLD_SCRIPT_ID = 'patch-jsonld';

@Component({
  selector: 'app-patch-browser-patch-detail',
  templateUrl: './patch-browser-detail-view.component.html',
  styleUrls: ['./patch-browser-detail-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    CommentsDataService
  ],
  standalone: false
})
export class PatchBrowserDetailViewComponent extends SubManager implements OnInit {

  @Input() ignoreSeo = false;
  @Input() readonly viewConfig: PatchMinimalViewConfig = {
    ...defaultPatchMinimalViewConfig,
    hideButtons: false
  };
  
  constructor(
    public dataService: PatchDetailDataService,
    public route: ActivatedRoute,
    readonly seoAndUtilsService: SeoAndUtilsService,
    private commentsDataService: CommentsDataService
  ) {
    super();
  }
  
  ngOnInit(): void {
    if (!this.ignoreSeo) { this.seoAndUtilsService.updateSeo({}, 'Patch Details'); }
    
    this.route.params
      .pipe(
        map(x => x && x.id && parseInt(x.id) ? parseInt(x.id) : 0),
        filter(x => x > 0),
        take(1)
      )
      .subscribe(data => {
        // debugger
        this.dataService.updateSinglePatchData$.next(data);
      });
    
    if (!this.ignoreSeo) {
      combineLatest([
          this.dataService.singlePatchData$,
          this.dataService.patchConnections$
        ]
      )
        .pipe(
          filter(x => !!x[0] && !!x[1]),
          take(1)
        )
        .subscribe(([patchData, patchConnections]) => {
          const modulesInPatch: string[] = patchConnections.map(x => x.a.module.name)
            .concat(patchConnections.map(x => x.b.module.name));
          
          // remove duplicates
          const uniqueModulesInPatch = [...new Set(modulesInPatch)];
          
          const joined: string = uniqueModulesInPatch.join(', ');
          
          const descParts: string[] = [];
          if (patchData.description) { descParts.push(patchData.description.trim()); }
          descParts.push(`Eurorack patch by ${ patchData.author?.username || 'unknown' } using ${ uniqueModulesInPatch.length } module${ uniqueModulesInPatch.length !== 1 ? 's' : '' }: ${ joined }.`);
          descParts.push(`${ patchConnections.length } connection${ patchConnections.length !== 1 ? 's' : '' } recorded.`);
          
          const seoData: SeoSocialShareData = {
            title: `${ patchData.name } - details. `,
            description: descParts.join(' '),
            keywords: `${ patchConnections.map(x => x.a.name)
              .join(', ') },${ patchConnections.map(x => x.a.name)
              .join(', ') },${ joined }, patch, eurorack`,
            
            published: patchData.created,
            modified: patchData.updated
          };
          this.seoAndUtilsService.updateSeo(seoData,
            `${ patchData.name } - Patch Details`);
          this.injectPatchJsonLd(patchData, uniqueModulesInPatch);
        });
    }
    
    // when new patch is loaded, send request to get comments
    this.dataService.singlePatchData$
      .pipe(
        filter(x => !!x),
        takeUntil(this.destroy$)
      )
      .subscribe(data => {
        this.commentsDataService.requestCommentsUpdate$.next({
          entityId: data.id,
          entityType: CommentableEntityTypes.PATCH
        });
      });
  }

  ngOnDestroy(): void {
    clearJsonLdScript(JSONLD_SCRIPT_ID);
    this.dataService.singlePatchData$.next(undefined);
    this.dataService.patchEditingPanelOpenState$.next(false);
    super.ngOnDestroy();
  }

  private injectPatchJsonLd(patchData: any, modules: string[]): void {
    clearJsonLdScript(JSONLD_SCRIPT_ID);
    const jsonLd: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      'name': patchData.name ?? undefined,
      'description': patchData.description ?? undefined,
      'author': patchData.author?.username
        ? {'@type': 'Person', 'name': patchData.author.username}
        : undefined,
      'dateCreated': patchData.created ?? undefined,
      'dateModified': patchData.updated ?? undefined,
      'url': `https://patcher.xyz/patches/details/${ patchData.id }`,
      'keywords': modules.join(', ') || undefined,
    };
    Object.keys(jsonLd).forEach(k => jsonLd[k] === undefined && delete jsonLd[k]);
    upsertJsonLdScript(JSONLD_SCRIPT_ID, jsonLd);
  }
}
