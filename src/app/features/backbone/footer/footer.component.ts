import {
  ChangeDetectionStrategy,
  Component,
  OnInit
} from '@angular/core';
import build from "../../../../build";
import { AppStateService } from 'src/app/shared-interproject/app-state.service';


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
  readonly changelogUrl = 'https://github.com/Polyterative/Patcher/blob/develop/CHANGELOG.md';
  
  constructor(
    public readonly appState: AppStateService
  ) {
  }
  
  ngOnInit(): void {
  }
  
}
