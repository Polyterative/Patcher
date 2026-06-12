import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, EMPTY, Subject } from 'rxjs';
import { catchError, exhaustMap, filter, map, takeUntil } from 'rxjs/operators';
import { ModuleCollectionsDataService } from 'src/app/features/module-collections/module-collections-data.service';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';

export interface ModuleCollectionCreatorResult {
  id: number;
}

@Component({
  selector: 'app-module-collection-creator',
  templateUrl: './module-collection-creator.component.html',
  styleUrls: ['./module-collection-creator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ModuleCollectionsDataService],
  standalone: false
})
export class ModuleCollectionCreatorComponent extends SubManager {
  readonly create$ = new Subject<void>();
  readonly saving$ = new BehaviorSubject<boolean>(false);
  readonly nameControl = new FormControl('Untitled collection', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(2), Validators.maxLength(80)]
  });
  readonly publicControl = new FormControl(false, { nonNullable: true });

  constructor(
    private readonly collectionsDataService: ModuleCollectionsDataService,
    private readonly snackBar: MatSnackBar,
    private readonly dialogRef: MatDialogRef<ModuleCollectionCreatorComponent, ModuleCollectionCreatorResult>
  ) {
    super();

    this.create$
      .pipe(
        filter(() => {
          if (this.nameControl.invalid) {
            this.nameControl.markAsTouched();
            SharedConstants.infoCustom(this.snackBar, 'Name the collection first.');
            return false;
          }
          return true;
        }),
        map(() => ({
          name: this.nameControl.value.trim(),
          public: this.publicControl.value
        })),
        exhaustMap(payload => {
          this.saving$.next(true);
          return this.collectionsDataService.createCollectionShell(payload).pipe(
            catchError(error => {
              console.error(error);
              this.saving$.next(false);
              SharedConstants.errorCustom(this.snackBar, 'Failed to create collection.');
              return EMPTY;
            })
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(id => {
        this.saving$.next(false);
        SharedConstants.successCustom(this.snackBar, 'Collection started.');
        this.dialogRef.close({id});
      });
  }
}
