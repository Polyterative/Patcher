import {
  ChangeDetectionStrategy,
  Component
} from '@angular/core';
import {
  BlogPostModel,
  Category
} from '../../blog/blog-models';

@Component({
  selector:        'app-home',
  templateUrl:     './home.component.html',
  styleUrls:       ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {
  post: BlogPostModel = {
    content:  '\n            Occupy mumblecore DIY, unicorn try-hard listicle put a bird on it cornhole hell of prism\n            vice. Mlkshk flannel tacos brunch hell of. Semiotics master cleanse locavore raclette\n            bespoke tattooed. 3 wolf moon brooklyn air plant shoreditch gluten-free, vice\n            chicharrones\n            photo booth palo santo taiyaki. Kombucha godard semiotics af raclette lomo.\n          ',
    title:    'this.controls.title.value',
    subtitle: 'this.controls.subtitle.value',
    category: Category.generic,
    slug:     'this.controls.slug.value',
    created:  'dateTime.toISO()',
    updated:  'dateTime.toISO()',
    id:       0
  };
}
