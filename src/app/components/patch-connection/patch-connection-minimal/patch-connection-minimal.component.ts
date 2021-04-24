import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                          from '@angular/core';
import { PatchConnection } from 'src/app/models/models';

@Component({
  selector:        'app-patch-connection-minimal',
  templateUrl:     './patch-connection-minimal.component.html',
  styleUrls:       ['./patch-connection-minimal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatchConnectionMinimalComponent implements OnInit {
  @Input()
  public readonly data: PatchConnection;
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}
