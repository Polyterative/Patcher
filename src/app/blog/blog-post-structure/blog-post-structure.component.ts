import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import {
  BlogEntryModel,
  CategoryColors
} from '../blog-models';

@Component({
  selector:        'app-blog-post-structure',
  templateUrl:     './blog-post-structure.component.html',
  styleUrls:       ['./blog-post-structure.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlogPostStructureComponent {
  @Input()
  post: BlogEntryModel;
  
  @Input()
  noSubtitle = false;
  
  @Input()
  noDates = false;
  
  @Input()
  noContent = false;
  
  @Input()
  noSpacer = false;
  
  palette = CategoryColors;
  
}
