import {
  ChangeDetectionStrategy,
  Component,
  OnInit
} from '@angular/core';

@Component({
  selector:        'app-blog-category-line',
  templateUrl:     './blog-category-line.component.html',
  styleUrls:       ['./blog-category-line.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlogCategoryLineComponent implements OnInit {
  
  constructor() {
  }
  
  ngOnInit() {
  }
  
}
