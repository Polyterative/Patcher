import {
  ChangeDetectionStrategy,
  Component,
  OnInit
} from '@angular/core';
import { UserLoginDataService } from './user-login-data.service';
import { SeoAndUtilsService } from "src/app/features/backbone/seo-and-utils.service";


@Component({
  selector:        'app-login-page',
  templateUrl:     './login-page.component.html',
  styleUrls:       ['./login-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginPageComponent implements OnInit {
  
  constructor(
    public dataService: UserLoginDataService,
    private seoAndUtilsService: SeoAndUtilsService
    
  ) {
    this.seoAndUtilsService.updateSeo({}, 'Login');
  
    // this.activated.url.subscribe(x => {
    //   console.log(x);
    //  
    // });
    //
  }
  
  ngOnInit(): void {
  }
  
}