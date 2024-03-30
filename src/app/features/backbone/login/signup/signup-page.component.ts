import {
  ChangeDetectionStrategy,
  Component,
  OnInit
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UserSignupDataService } from './user-signup-data.service';
import { SeoAndUtilsService } from "src/app/features/backbone/seo-and-utils.service";


@Component({
  selector:        'app-signup-page',
  templateUrl:     './signup-page.component.html',
  styleUrls:       ['./signup-page.component.scss'],
  providers:       [UserSignupDataService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SignupPageComponent implements OnInit {
  
  constructor(
    public activated: ActivatedRoute,
    public dataService: UserSignupDataService,
    readonly seoAndUtilsService: SeoAndUtilsService
  
  ) {
    this.seoAndUtilsService.updateSeo({}, 'Signup');
  }
  
  ngOnInit(): void {
  }
  
}