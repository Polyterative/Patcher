import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { MinimalModule } from '../../../../models/module';

@Component({
  selector: 'app-module-part-image',
  templateUrl: './module-part-image.component.html',
  styleUrls: ['./module-part-image.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModulePartImageComponent implements OnInit {

  @Input() data: MinimalModule;

  constructor() { }

  ngOnInit(): void {
  }

}
