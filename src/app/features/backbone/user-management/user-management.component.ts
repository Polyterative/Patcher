import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                                from '@angular/core';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { SeoAndUtilsService }    from '../seo-and-utils.service';

@Component({
  selector:        'app-user-management',
  templateUrl:     './user-management.component.html',
  styleUrls:       ['./user-management.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserManagementComponent implements OnInit {
  @Input() ignoreSeo: boolean = false;
  
  constructor(
    public userManagementService: UserManagementService,
    readonly seoAndUtilsService: SeoAndUtilsService
  ) { }
  
  ngOnInit(): void {
    if (!this.ignoreSeo) {
      this.seoAndUtilsService.updateSeo({
        title:       'Account Management',
        description: 'Personal account management.'
      }, 'Account Management');
    }
  }
  
}
