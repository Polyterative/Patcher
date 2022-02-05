import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                                 from '@angular/core';
import { ActivatedRoute }         from '@angular/router';
import { SeoSocialShareData }     from 'ngx-seo';
import { Subject }                from 'rxjs';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
}                                 from '../../../components/module-parts/module-minimal/module-minimal.component';
import { SeoAndUtilsService }     from '../../backbone/seo-and-utils.service';
import { ModuleAdderDataService } from './module-adder-data.service';

@Component({
  selector:        'app-module-browser-adder',
  templateUrl:     './module-browser-adder.component.html',
  styleUrls:       ['./module-browser-adder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers:       [ModuleAdderDataService]
})
export class ModuleBrowserAdderComponent implements OnInit {
  
  protected destroyEvent$ = new Subject<void>();
  @Input() ignoreSeo = false;
  readonly viewConfig: ModuleMinimalViewConfig = {
    ...defaultModuleMinimalViewConfig,
    hideTags:    true,
    hideButtons: true,
    hideDates:   false
  };
  
  constructor(
    public dataService: ModuleAdderDataService,
    public route: ActivatedRoute,
    readonly seoAndUtilsService: SeoAndUtilsService
  ) {
  
  }
  
  ngOnInit(): void {
    // this.route.params
    //     .pipe(
    //       map(x => x && x.id && parseInt(x.id) ? parseInt(x.id) : 0),
    //       filter(x => x > 0),
    //       take(1)
    //     )
    //     .subscribe(data => {
    //       // debugger
    //       this.dataService.updateSingleModuleData$.next(data);
    //     });
    
    this.updateSeo();
    
  }
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
  
  private updateSeo(): void {
    const seoData: SeoSocialShareData = {
      title:       'Submit a module',
      description: 'Submit a module - details',
      keywords:    'add,submit, module, eurorack,'
    };
    this.seoAndUtilsService.updateSeo(seoData,
      'Submit a module');
  }
  
}
