import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                                 from '@angular/core';
import { ActivatedRoute }         from '@angular/router';
import { SeoSocialShareData }     from 'ngx-seo';
import {
  combineLatest,
  Subject
}                                 from 'rxjs';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
}                                 from 'src/app/components/module-parts/module-minimal/module-minimal.component';
import { FileDragHostService }    from 'src/app/shared-interproject/components/@smart/file-drag-host/file-drag-host.service';
import { SeoAndUtilsService }     from '../../backbone/seo-and-utils.service';
import { ModuleAdderDataService } from './module-adder-data.service';
import { UserManagementService }  from "src/app/features/backbone/login/user-management.service";
import {
  filter,
  takeUntil
}                                 from "rxjs/operators";


@Component({
  selector:        'app-module-browser-adder',
  templateUrl:     './module-browser-adder.component.html',
  styleUrls:       ['./module-browser-adder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers:       [
    ModuleAdderDataService,
    FileDragHostService
  ]
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
    readonly seoAndUtilsService: SeoAndUtilsService,
    public userService: UserManagementService,
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
    
    // use parameters to get prefill data
    // reference:
    // [href]="'/modules/add?manufacturer='+bag.data.manufacturer.id+'&HP='+bag.data.hp+'standard='+bag.data.standard.id"
    
    combineLatest([
      this.route.queryParams,
      this.dataService.formData.manufacturer.options$.pipe(
        filter(x => x.length > 0),
        takeUntil(this.destroyEvent$)
      ),
      this.dataService.formData.standard.options$.pipe(
        filter(x => x.length > 0),
        takeUntil(this.destroyEvent$)
      ),
    ])
      .pipe(
        takeUntil(this.destroyEvent$),
      )
      .subscribe(([params, manufacturersList, standardsList]) => {
          console.log([params, manufacturersList, standardsList]);
          if (parseInt(params.manufacturer)) {
            this.dataService.formData.manufacturer.control.setValue(
              manufacturersList.find(x => x.id === params.manufacturer)
            );
          }
          
          if (parseInt(params.HP)) {
            this.dataService.formData.hp.control.setValue(parseInt(params.HP));
          }
          
          if (parseInt(params.standard)) {
            this.dataService.formData.standard.control.setValue(
              standardsList.find(x => x.id === parseInt(params.standard))
            );
          }
        }
      );
    
      
    
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