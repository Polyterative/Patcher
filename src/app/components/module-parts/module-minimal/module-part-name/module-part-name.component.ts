import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';
import { MinimalModule } from 'src/app/models/module';


@Component({
  selector: 'app-module-part-name',
  templateUrl: './module-part-name.component.html',
  styleUrls: ['./module-part-name.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ModulePartNameComponent implements OnInit {

  @Input() data: MinimalModule;

  @Input() textSize: number | undefined = undefined
  
  /** Optional suffix displayed inline after the module name (e.g. instance label "(1)") */
  @Input() suffix: string | undefined = undefined;

  constructor() { }

  ngOnInit(): void {
  }

}