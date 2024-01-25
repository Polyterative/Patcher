import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import build from "../../../../build";

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FooterComponent implements OnInit {
  data = build;
  
  constructor() {
  }
  
  ngOnInit(): void {
  }
  
}
