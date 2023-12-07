import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';

@Component({
  selector:        'app-restricted-entity',
  templateUrl:     './restricted-entity.component.html',
  styleUrls:       ['./restricted-entity.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RestrictedEntityComponent implements OnInit {
  @Input() disabled: boolean = false;
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}
