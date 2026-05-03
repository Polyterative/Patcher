import {
  ChangeDetectionStrategy,
  Component,
  OnInit
} from '@angular/core';
import build from "../../../../build";


@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class FooterComponent implements OnInit {
  data = build;
  readonly instagramUrl = 'https://www.instagram.com/patcher.xyz/';
  readonly instagramHandle = '@patcher.xyz';
  
  constructor() {
  }
  
  ngOnInit(): void {
  }
  
}