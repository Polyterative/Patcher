import { ReadOnlyModeService } from 'src/app/features/backbone/read-only-mode.service';
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
  /** Maintenance read-only mode (stateless; reads the build-time flag). */
  readonly readOnly = new ReadOnlyModeService();

  data = build;
  readonly instagramUrl = 'https://www.instagram.com/patcher.xyz/';
  readonly instagramHandle = '@patcher.xyz';
  readonly patreonUrl = 'https://www.patreon.com/patcher';
  
  constructor(
    public readonly appState: AppStateService
  ) {
  }
  
  ngOnInit(): void {
  }
  
}
