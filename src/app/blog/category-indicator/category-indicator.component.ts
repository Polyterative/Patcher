import {
    ChangeDetectionStrategy,
    Component,
    Input
} from '@angular/core';
import {
    Category,
    CATEGORY_COLORS,
    CATEGORY_NAMES
} from '../blog-models';

@Component({
    selector:        'app-category-indicator',
    templateUrl:     './category-indicator.component.html',
    styleUrls:       ['./category-indicator.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryIndicatorComponent {
    
    @Input()
    category: Category;
    
    palette = CATEGORY_COLORS;
    
    labels = CATEGORY_NAMES;
}
