import {
    ChangeDetectionStrategy,
    Component,
    OnInit
} from '@angular/core';

@Component({
  selector: 'app-module-browser-root',
  templateUrl: './module-browser-root.component.html',
  styleUrls: ['./module-browser-root.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleBrowserRootComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
