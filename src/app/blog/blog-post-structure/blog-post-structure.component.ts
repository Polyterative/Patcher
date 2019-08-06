import {
  ChangeDetectionStrategy,
  Component,
  Input
}                        from '@angular/core';
import { BlogPostModel } from '../blog-models';

@Component({
  selector:        'app-blog-post-structure',
  templateUrl:     './blog-post-structure.component.html',
  styleUrls:       ['./blog-post-structure.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlogPostStructureComponent {
  @Input()
  post: BlogPostModel;
  
}
