import {
  ChangeDetectionStrategy,
  Component,
  OnInit
} from '@angular/core';
import {
  Meta,
  Title
} from '@angular/platform-browser';


@Component({
  selector:        'app-not-found',
  templateUrl:     './not-found.component.html',
  styleUrls:       ['./not-found.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotFoundComponent implements OnInit {
  
  constructor(
    private readonly meta: Meta,
    private readonly title: Title
  ) { }
  
  ngOnInit(): void {
    this.title.setTitle('404 - Not Found | patcher.xyz');
    this.meta.updateTag({name: 'description', content: '404 - Not Found'});
    this.meta.updateTag({property: 'og:title', content: '404 - Not Found | patcher.xyz'});
    this.meta.updateTag({property: 'og:description', content: '404 - Not Found'});
  }
  
}