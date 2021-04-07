import {
    ChangeDetectionStrategy,
    Component,
    OnInit
} from '@angular/core';

@Component({
  selector: 'app-feedback-box',
  templateUrl: './feedback-box.component.html',
  styleUrls: ['./feedback-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FeedbackBoxComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
