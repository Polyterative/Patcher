import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnInit,
  Optional,
  RESPONSE_INIT
} from '@angular/core';
import {
  Meta,
  Title
} from '@angular/platform-browser';
import { EmptyStateComponent } from '../../../shared-interproject/components/@smart/empty-state/empty-state.component';
import { MatCardTitle } from '@angular/material/card';


@Component({
    selector: 'app-not-found',
    templateUrl: './not-found.component.html',
    styleUrls: ['./not-found.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [EmptyStateComponent, MatCardTitle]
})
export class NotFoundComponent implements OnInit {
  
  constructor(
    private readonly meta: Meta,
    private readonly title: Title,
    @Optional() @Inject(RESPONSE_INIT) private readonly responseInit?: ResponseInit | null
  ) { }
  
  ngOnInit(): void {
    if (this.responseInit) {
      this.responseInit.status = 404;
    }
    this.title.setTitle('404 - Not Found | patcher.xyz');
    this.meta.updateTag({name: 'robots', content: 'noindex, nofollow'});
    this.meta.updateTag({name: 'description', content: '404 - Not Found'});
    this.meta.updateTag({property: 'og:title', content: '404 - Not Found | patcher.xyz'});
    this.meta.updateTag({property: 'og:description', content: '404 - Not Found'});
  }
  
}