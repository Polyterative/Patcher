import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { PatchMinimal } from '../../models/patch';
import { defaultPatchMinimalViewConfig, PatchMinimalViewConfig } from '../patch-parts/patch-minimal/patch-minimal.component';

@Component({
  selector:        'app-module-patches',
  templateUrl:     './module-patches.component.html',
  styleUrls:       ['./module-patches.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModulePatchesComponent implements OnInit {
  @Input() readonly data$: Observable<PatchMinimal[]>;
  
  @Input() viewConfig: PatchMinimalViewConfig = defaultPatchMinimalViewConfig;
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}
