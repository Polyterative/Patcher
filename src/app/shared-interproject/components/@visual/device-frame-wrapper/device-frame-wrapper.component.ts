import {
  ChangeDetectionStrategy,
  Component,
  OnInit
} from '@angular/core';


@Component({
  selector: 'lib-device-frame-wrapper',
  templateUrl: './device-frame-wrapper.component.html',
  styleUrls: ['./device-frame-wrapper.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class DeviceFrameWrapperComponent implements OnInit {
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}