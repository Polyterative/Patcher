import {
  ChangeDetectionStrategy,
  Component,
  OnInit
}                                from '@angular/core';
import { SeoSocialShareService } from 'ngx-seo';

@Component({
  selector:        'app-not-found',
  templateUrl:     './not-found.component.html',
  styleUrls:       ['./not-found.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotFoundComponent implements OnInit {
  
  constructor(private readonly seoSocialShareService: SeoSocialShareService
  ) { }
  
  ngOnInit(): void {
    this.seoSocialShareService.setData({
      title:       '404 - Not Found',
      description: '404 - Not Found'
    });
  }
  
}