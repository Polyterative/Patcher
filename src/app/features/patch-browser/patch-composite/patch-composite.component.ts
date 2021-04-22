import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                from '@angular/core';
import { Patch } from 'src/app/models/models';

@Component({
  selector:        'app-patch-composite',
  templateUrl:     './patch-composite.component.html',
  styleUrls:       ['./patch-composite.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatchCompositeComponent implements OnInit {
  @Input() data: Patch;
  
  constructor() {}
  
  ngOnInit(): void {
  }
  
}
