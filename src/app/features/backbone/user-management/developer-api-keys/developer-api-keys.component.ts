import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit
} from '@angular/core';
import {
  AsyncPipe,
  DecimalPipe,
  TitleCasePipe
} from '@angular/common';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { environment } from 'src/environments/environment';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import {
  DeveloperApiKeysDataService,
  DeveloperApiKeysViewModel
} from './developer-api-keys-data.service';

@Component({
  selector: 'app-developer-api-keys',
  standalone: true,
  templateUrl: './developer-api-keys.component.html',
  styleUrls: ['./developer-api-keys.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [DeveloperApiKeysDataService],
  imports: [
    AsyncPipe,
    DecimalPipe,
    MatButton,
    MatIcon,
    TitleCasePipe
  ]
})
export class DeveloperApiKeysComponent extends SubManager implements OnInit {
  developerApiEnabled = environment.features.developerApiEnabled;

  readonly dataService = inject(DeveloperApiKeysDataService);
  readonly vm$ = this.dataService.vm$;

  constructor() {
    super();
  }

  ngOnInit(): void {
    this.dataService.load$.next();
  }

  createOrRotate(vm: DeveloperApiKeysViewModel): void {
    if (!vm.hasLoaded || vm.isLoading || vm.isSaving) {
      return;
    }

    if (vm.slot?.active && !vm.rotateConfirmationVisible) {
      this.dataService.requestRotateConfirmation$.next();
      return;
    }

    this.dataService.createOrRotate$.next();
  }

  cancelRotation(): void {
    this.dataService.cancelRotateConfirmation$.next();
  }

  requestRevoke(id: string): void {
    this.dataService.requestRevokeConfirmation$.next(id);
  }

  confirmRevoke(id: string): void {
    this.dataService.revoke$.next({ id });
  }

  cancelRevoke(): void {
    this.dataService.cancelRevokeConfirmation$.next();
  }

  copyReveal(): void {
    this.dataService.copyRevealedKey$.next();
  }

  dismissReveal(): void {
    this.dataService.dismissReveal$.next();
  }

  reload(): void {
    this.dataService.load$.next();
  }
}
