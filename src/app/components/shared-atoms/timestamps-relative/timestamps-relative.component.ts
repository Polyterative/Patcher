import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';

@Component({
  selector:        'app-timestamps-relative',
  templateUrl:     './timestamps-relative.component.html',
  styleUrls:       ['./timestamps-relative.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimestampsRelativeComponent implements OnInit {
  @Input()
  public readonly data: { created: string, updated: string };
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}
