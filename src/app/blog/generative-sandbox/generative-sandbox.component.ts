import {
    ChangeDetectionStrategy,
    Component,
    OnInit
} from '@angular/core';

@Component({
  selector: 'app-generative-sandbox',
  templateUrl: './generative-sandbox.component.html',
  styleUrls: ['./generative-sandbox.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GenerativeSandboxComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
