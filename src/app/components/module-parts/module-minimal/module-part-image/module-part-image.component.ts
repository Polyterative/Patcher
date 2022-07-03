import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                        from '@angular/core';
import { MinimalModule } from '../../../../models/module';

@Component({
  selector:        'app-module-part-image',
  templateUrl:     './module-part-image.component.html',
  styleUrls:       ['./module-part-image.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModulePartImageComponent implements OnInit {
  
  @Input() data: MinimalModule;
  
  filename: string | undefined;
  
  @Input() containImage: boolean = true;
  @Input() big: boolean = false;
  
  sizeDivider: number = 2;
  
  constructor() { }
  
  ngOnInit(): void {
    if (this.data.panels && this.data.panels.length > 0) {
      this.filename = this.data.panels.pop().filename;
    } else {
      this.filename = undefined;
    }
    
    if (this.big) {
      this.sizeDivider = 1;
    }
  }
  
}
