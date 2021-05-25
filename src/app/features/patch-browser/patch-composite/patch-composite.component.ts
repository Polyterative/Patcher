import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                          from '@angular/core';
import { Patch }           from 'src/app/models/models';
import { AppStateService } from '../../../shared-interproject/app-state.service';

@Component({
  selector:        'app-patch-composite',
  templateUrl:     './patch-composite.component.html',
  styleUrls:       ['./patch-composite.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatchCompositeComponent implements OnInit {
  @Input() data: Patch;
  @Input() isEditing: boolean = false;
  
  constructor(public appState: AppStateService
  ) {}
  
  ngOnInit(): void {
  }
  
}
