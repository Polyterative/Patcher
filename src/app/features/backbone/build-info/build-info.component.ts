import {
  ChangeDetectionStrategy,
  Component,
  OnInit
} from '@angular/core';


@Component({
  selector: 'app-build-info',
  templateUrl: './build-info.component.html',
  styleUrls: ['./build-info.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class BuildInfoComponent implements OnInit {
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}