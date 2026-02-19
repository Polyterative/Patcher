import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SeoSocialShareData } from 'src/app/models/seo.model';
import {
  combineLatest,
  delay,
  Subject
} from 'rxjs';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
} from 'src/app/components/module-parts/module-minimal/module-minimal.component';
import { FileDragHostService } from 'src/app/shared-interproject/components/@smart/file-drag-host/file-drag-host.service';
import { SeoAndUtilsService } from '../../backbone/seo-and-utils.service';
import { ModuleAdderDataService } from './module-adder-data.service';
import { UserManagementService } from "src/app/features/backbone/login/user-management.service";
import {
  filter,
  takeUntil
} from "rxjs/operators";


@Component({
  selector: 'app-module-browser-adder',
  templateUrl: './module-browser-adder.component.html',
  styleUrls: ['./module-browser-adder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    ModuleAdderDataService,
    FileDragHostService
  ],
  standalone: false
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

  readonly guidelinesData: Array<{ label: string; value: string; icon: string; size: string }> = [
    {
      label: 'Check for Duplicates',
      value: 'Ensure the module is not already listed by checking the list on the right',
      icon: 'search',
      size: 'auto'
    },
    {
      label: 'Avoid Panel Variations',
      value: 'Please do not submit multiple modules for different panel variations; they are considered the same module (avoid SILVER, BLACK, etc.)',
      icon: 'layers_clear',
      size: 'auto'
    },
    {
      label: 'Add Details After Submission',
      value: 'You can add panel images, power specs, and inputs/outputs on the module detail page after submission',
      icon: 'add_circle_outline',
      size: 'auto'
    },
    {
      label: 'Immediate Usability',
      value: 'Submitted modules are usable immediately but will be reviewed by our team',
      icon: 'flash_on',
      size: 'auto'
    },
    {
      label: 'Manufacturer Not Found?',
      value: 'If your manufacturer is missing, click Create new manufacturer below the manufacturer field to add it',
      icon: 'factory',
      size: 'auto'
    }
  ];
  
  constructor(
    public dataService: ModuleAdderDataService,
    public route: ActivatedRoute,
    readonly seoAndUtilsService: SeoAndUtilsService,
    public userService: UserManagementService,
  ) {
  
  }
  
  ngOnInit(): void {
    // use params to prefill form fields
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
        delay(200),
        takeUntil(this.destroyEvent$),
      )
      .subscribe(([params, manufacturersList, standardsList]) => {
          if (parseInt(params.manufacturer)) {
            this.dataService.formData.manufacturer.control.patchValue(
              manufacturersList.find(x => x.id === params.manufacturer)
            );
          }
          
          if (parseInt(params.HP)) {
            this.dataService.formData.hp.control.patchValue(parseInt(params.HP));
          }
          
          if (parseInt(params.standard)) {
            this.dataService.formData.standard.control.patchValue(
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