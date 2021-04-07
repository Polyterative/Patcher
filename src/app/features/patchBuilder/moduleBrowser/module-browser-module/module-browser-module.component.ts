import {
    ChangeDetectionStrategy,
    Component,
    OnInit
} from '@angular/core';

@Component({
  selector: 'app-module-browser-module',
  templateUrl: './module-browser-module.component.html',
  styleUrls: ['./module-browser-module.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleBrowserModuleComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
