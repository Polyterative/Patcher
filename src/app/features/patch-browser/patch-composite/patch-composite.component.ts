import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                          from '@angular/core';
import {
  defaultPatchMinimalViewConfig,
  PatchMinimalViewConfig
}                          from '../../../components/patch-parts/patch-minimal/patch-minimal.component';
import { Patch }           from '../../../models/patch';
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
  @Input() viewConfig: PatchMinimalViewConfig = defaultPatchMinimalViewConfig;
  
  constructor(public appState: AppStateService
  ) {}
  
  ngOnInit(): void {
  }
  
}
