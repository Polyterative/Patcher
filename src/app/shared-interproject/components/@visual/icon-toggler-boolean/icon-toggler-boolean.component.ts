import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector:        'app-icon-toggler-boolean',
  templateUrl:     './icon-toggler-boolean.component.html',
  styleUrls:       ['./icon-toggler-boolean.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IconTogglerBooleanComponent implements OnInit {
  @Input() icon?: string;
  @Input() iconOff?: string; //optional
  @Input() description: string;
  @Input() data: BehaviorSubject<boolean>;
  @Input() disabled: boolean = false;

  constructor() { }

  ngOnInit(): void {
  }

}
