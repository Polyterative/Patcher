import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';

@Component({
  selector:        'app-module-cv-icon',
  templateUrl:     './module-cv-icon.component.html',
  styleUrls:       ['./module-cv-icon.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleCvIconComponent implements OnInit {
  @Input() type: 'in' | 'out';
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}
