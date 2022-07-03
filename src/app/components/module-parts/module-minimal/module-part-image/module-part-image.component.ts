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
  
  panelPath: string | undefined;
  
  @Input() containImage: boolean = true;
  @Input() big: boolean = false;
  
  sizeDivider: number = 2;
  
  constructor() { }
  
  ngOnInit(): void {
    if (this.data.panels && this.data.panels.length > 0) {
      this.panelPath = this.data.panels[0].filename;
    } else {
      this.panelPath = undefined;
    }
    
    if (this.big) {
      this.sizeDivider = 1;
    }
  }
  
}
