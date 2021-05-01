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
  selector:        'app-patch-connection-micro',
  templateUrl:     './patch-connection-micro.component.html',
  styleUrls:       ['./patch-connection-micro.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatchConnectionMicroComponent implements OnInit {
  @Input() readonly data: PatchConnection;
  @Input() readonly isEditing = false;
  @Input() readonly isCreator = false;
  @Output() readonly remove$ = new Subject<PatchConnection>();
  @Output() readonly create$ = new Subject<PatchConnection>();
  
  ngOnInit(): void {
  }
  
}
