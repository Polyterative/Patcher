import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}               from '@angular/core';
import { Rack } from 'src/app/models/models';

@Component({
  selector:        'app-rack-composite',
  templateUrl:     './rack-composite.component.html',
  styleUrls:       ['./rack-composite.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RackCompositeComponent implements OnInit {
  @Input() data: Rack;
  
  constructor() {}
  
  ngOnInit(): void {
  }
  
}
