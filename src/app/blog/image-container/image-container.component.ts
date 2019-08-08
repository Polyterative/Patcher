import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';

@Component({
  selector:        'app-image-container',
  templateUrl:     './image-container.component.html',
  styleUrls:       ['./image-container.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImageContainerComponent {
  @Input()
  image: string;
  @Input()
  alt: string;
  
}
