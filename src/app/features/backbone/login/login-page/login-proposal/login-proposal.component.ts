import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnInit
} from '@angular/core';
import {
  MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA,
  MatLegacyDialogRef as MatDialogRef
} from '@angular/material/legacy-dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserLoginDataService } from 'src/app/features/backbone/login/login-page/user-login-data.service';


@Component({
  selector:        'app-login-proposal',
  templateUrl:     './login-proposal.component.html',
  styleUrls:       ['./login-proposal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginProposalComponent implements OnInit {
  
  constructor(
    public dialogRef: MatDialogRef<{}, {}>,
    @Inject(MAT_DIALOG_DATA) public data: {},
    public service: UserLoginDataService
  ) { }
  
  ngOnInit(): void {
    this.service.loginSuccessful$
        .pipe(
          takeUntil(this.destroyEvent$)
        )
        .subscribe(value => {
          this.dialogRef.close();
        });
    
  }
  
  protected destroyEvent$ = new Subject<void>();
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
}