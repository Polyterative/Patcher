import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
  Output
}                          from '@angular/core';
import { Subject }         from 'rxjs';
import { PatchConnection } from 'src/app/models/models';

@Component({
  selector:        'app-patch-connection-minimal',
  templateUrl:     './patch-connection-minimal.component.html',
  styleUrls:       ['./patch-connection-minimal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatchConnectionMinimalComponent implements OnInit {
  @Input() readonly data: PatchConnection;
  @Input() readonly isEditing = false;
  @Input() readonly isCreator = false;
  @Output() readonly remove$ = new Subject<PatchConnection>();
  @Output() readonly create$ = new Subject<PatchConnection>();
  
  ngOnInit(): void {
  }
  
}
