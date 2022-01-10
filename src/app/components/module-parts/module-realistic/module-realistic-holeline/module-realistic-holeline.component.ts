import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                        from '@angular/core';
import { MinimalModule } from '../../../../models/models';

@Component({
  selector:        'app-module-realistic-holeline',
  templateUrl:     './module-realistic-holeline.component.html',
  styleUrls:       ['./module-realistic-holeline.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleRealisticHolelineComponent implements OnInit {
  
  @Input() data: MinimalModule;
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}
