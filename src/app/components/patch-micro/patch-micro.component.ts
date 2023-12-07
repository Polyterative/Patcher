import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { PatchMinimal } from '../../models/patch';
import { PatchMinimalViewConfig } from '../patch-parts/patch-minimal/patch-minimal.component';

@Component({
  selector:        'app-patch-micro',
  templateUrl:     './patch-micro.component.html',
  styleUrls:       ['./patch-micro.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatchMicroComponent implements OnInit {
  
  @Input() data: PatchMinimal;
  
  @Input() viewConfig: PatchMinimalViewConfig;
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}
