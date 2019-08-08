import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import {
  Category,
  CategoryColors
} from '../blog-models';

@Component({
  selector:        'app-blog-category-line',
  templateUrl:     './blog-category-line.component.html',
  styleUrls:       ['./blog-category-line.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlogCategoryLineComponent {
  @Input()
  category: Category;
  
  palette = CategoryColors;
}
