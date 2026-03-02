import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges
} from '@angular/core';
import { fadeInOnEnterAnimation } from 'angular-animations';
import { MinimalModule } from 'src/app/models/module';


@Component({
  selector: 'app-module-part-image',
  templateUrl: './module-part-image.component.html',
  styleUrls: ['./module-part-image.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    fadeInOnEnterAnimation({
      anchor: 'enter',
      duration: 725,
      animateChildren: 'after'
    })
  ],
  standalone: false
})
export class ModulePartImageComponent implements OnChanges {
  
  @Input() data: MinimalModule;
  
  filename: string | undefined;
  
  @Input() containImage: boolean = true;
  @Input() big: boolean = false;
  /** When true, the panel image is rendered at a fixed 3U-equivalent height
   *  so all cards align in a grid regardless of image aspect ratio.
   *  Set to false to use the original dynamic sizing behaviour. */
  @Input() fixedHeight: boolean = false;
  
  get sizeDivider(): number {
    return this.big ? 1 : 2.7;
  }
  
  constructor(
    public changeDetection: ChangeDetectorRef
  ) { }
  
  ngOnChanges(): void {
    this.filename = this.data.panels?.length > 0
      ? this.data.panels[0].filename
      : undefined;
    this.changeDetection.detectChanges();
  }
  
}