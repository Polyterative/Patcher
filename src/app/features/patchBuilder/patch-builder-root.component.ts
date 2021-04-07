import {
    ChangeDetectionStrategy,
    Component,
    OnInit
} from '@angular/core';

@Component({
  selector: 'app-patch-builder-root',
  templateUrl: './patch-builder-root.component.html',
  styleUrls: ['./patch-builder-root.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatchBuilderRootComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
