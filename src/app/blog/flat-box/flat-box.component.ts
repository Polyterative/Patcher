import {
  ChangeDetectionStrategy,
  Component,
  OnInit
} from '@angular/core';

@Component({
  selector:        'app-flat-box',
  templateUrl:     './flat-box.component.html',
  styleUrls:       ['./flat-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FlatBoxComponent implements OnInit {
  
  constructor() {
  }
  
  ngOnInit() {
  }
  
}
