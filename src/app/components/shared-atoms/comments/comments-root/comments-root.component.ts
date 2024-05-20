import {
  ChangeDetectionStrategy,
  Component
} from '@angular/core';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';
import { CommentsDataService } from '../comments-data.service';
import { fadeInOnEnterAnimation } from "angular-animations";
import { UserManagementService } from "src/app/features/backbone/login/user-management.service";


@Component({
  selector:        'app-comments-root',
  templateUrl:     './comments-root.component.html',
  styleUrls:       ['./comments-root.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations:      [
    fadeInOnEnterAnimation({
      anchor:          'enter',
      duration:        725,
      animateChildren: 'after'
    })
  ]
})
export class CommentsRootComponent {
  
  
  constructor(
    public dataService: CommentsDataService,
    public appState: AppStateService,
    public userManagerService: UserManagementService
  ) { }
  
}