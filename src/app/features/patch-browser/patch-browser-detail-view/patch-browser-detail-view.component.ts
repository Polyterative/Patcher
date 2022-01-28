import {
  Component,
  OnDestroy,
  OnInit
}                                 from '@angular/core';
import { ActivatedRoute }         from '@angular/router';
import { SeoSocialShareData }     from 'ngx-seo';
import {
  combineLatest,
  Subject
}                                 from 'rxjs';
import {
  filter,
  map,
  take
}                                 from 'rxjs/operators';
import { PatchDetailDataService } from 'src/app/components/patch-parts/patch-detail-data.service';
import { SeoAndUtilsService }     from '../../backbone/seo-and-utils.service';

@Component({
  selector:    'app-patch-browser-patch-detail-view-root',
  templateUrl: './patch-browser-detail-view.component.html',
  styleUrls:   ['./patch-browser-detail-view.component.scss']
  // changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatchBrowserDetailViewComponent implements OnInit, OnDestroy {
  
  protected destroyEvent$ = new Subject<void>();
  
  constructor(
    public dataService: PatchDetailDataService,
    public route: ActivatedRoute,
    readonly seoAndUtilsService: SeoAndUtilsService
  ) {
  
  }
  
  ngOnInit(): void {
  
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
      
        const seoData: SeoSocialShareData = {
          title:       `${ patchData.name } - details. `,
          description: `${ patchData.name } - patch details. Used modules: ${ joined }, for a total of ${ joined.length } connections.`,
          keywords:    `${ patchConnections.map(x => x.a.name)
                                           .join(', ') },${ patchConnections.map(x => x.a.name)
                                                                            .join(', ') },${ joined }, patch, eurorack`,
        
          published: patchData.created,
          modified:  patchData.updated
        };
        this.seoAndUtilsService.updateSeo(seoData,
          `${ patchData.name } - Patch Details`);
      });
  
  }
  
  ngOnDestroy(): void {
    this.dataService.singlePatchData$.next(undefined);
    this.dataService.patchEditingPanelOpenState$.next(false);
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
  
}
