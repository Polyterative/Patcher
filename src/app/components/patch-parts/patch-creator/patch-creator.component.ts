import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnInit, OnDestroy
} from '@angular/core';
import {
  FormControl,
  UntypedFormControl,
  Validators
} from '@angular/forms';
import {
  BehaviorSubject,
  EMPTY,
  Subject
} from 'rxjs';
import {
  catchError,
  filter,
  switchMap,
  takeUntil
} from 'rxjs/operators';
import { Rack } from 'src/app/models/rack';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import {
  FormTypes,
  findAndApplyOptionForId,
  getCleanedValueId,
  ISelectable
} from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { IMatFormEntityConfig } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { MatSnackBar } from "@angular/material/snack-bar";
import {
  MAT_DIALOG_DATA,
  MatDialogRef
} from "@angular/material/dialog";
import { SharedConstants } from "src/app/shared-interproject/SharedConstants";
import {
  isLinkedRackSchemaMissingError,
  LINKED_RACK_PENDING_CREATE_MESSAGE
} from '../linked-rack-rollout';
import { generatePatchName } from '../patch-name-generator';
import {
  PatchCreatorInModel,
  PatchCreatorOutModel
} from './patch-creator.types';

export type { PatchCreatorInModel, PatchCreatorOutModel };

@Component({
  selector: 'app-patch-creator',
  templateUrl: './patch-creator.component.html',
  styleUrls: ['./patch-creator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class PatchCreatorComponent implements OnInit, OnDestroy {
  public readonly save$ = new Subject<void>();
  private readonly _currentUserRacks$ = new BehaviorSubject<Rack[]>([]);
  private readonly _linkedRackOptions$ = new BehaviorSubject<ISelectable[]>([]);
  private readonly _linkedRackPersistenceBlocked$ = new BehaviorSubject<boolean>(false);
  readonly linkedRackOptions$ = this._linkedRackOptions$.asObservable();
  readonly linkedRackPersistenceBlocked$ = this._linkedRackPersistenceBlocked$.asObservable();
  
  fields: {
    name: IMatFormEntityConfig;
    linkedRack: IMatFormEntityConfig;
    public: {
      code: string;
      control: FormControl<boolean>;
    };
  } = {
    // hp:   {
    //   label:   'hp',
    //   code:    'hp',
    //   flex:    '6rem',
    //   control: new FormControl('84', Validators.compose([
    //     Validators.required,
    //     Validators.min(2),
    //     Validators.max(416),
    //     CustomValidators.onlyIntegers
    //   ])),
    //   type:    FormTypes.NUMBER
    // },
    // rows: {
    //   label:   'Rows',
    //   code:    'rows',
    //   flex:    '6rem',
    //   control: new FormControl('2', Validators.compose([
    //     Validators.required,
    //     Validators.min(1),
    //     Validators.max(10),
    //     CustomValidators.onlyIntegers
    //   ])),
    //   type:    FormTypes.NUMBER
    // },
    name: {
      label:   'Name',
      code:    'name',
      flex:    '6rem',
      control: new UntypedFormControl(this.generatePatchName(), Validators.compose([
        Validators.required,
        Validators.minLength(1),
        Validators.maxLength(32)
        // Validators.max(12)
      ])),
      type:    FormTypes.TEXT,
      iconL1: 'label',
      ergonomics: {
        autofocus: true,
        enterkeyhint: 'done'
      }
    },
    linkedRack: {
      label: 'Choose linked rack',
      code: 'linked-rack',
      flex: '6rem',
      control: new UntypedFormControl(''),
      type: FormTypes.SELECT,
      options$: this._linkedRackOptions$,
      iconL1: 'view_stream'
    },
    public: {
      code: 'public',
      control: new FormControl<boolean>(true, { nonNullable: true })
    }
  };
  protected destroyEvent$ = new Subject<void>();
  
  private generatePatchName(): string {
    return generatePatchName();
  }
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
  
  constructor(
    public snackBar: MatSnackBar,
    public backend: SupabaseService,
    public dialogRef: MatDialogRef<PatchCreatorComponent, PatchCreatorOutModel>,
    @Inject(MAT_DIALOG_DATA) public data: PatchCreatorInModel
  ) {
    
    this.save$
        .pipe(
          filter(() => {
            if (this.fields.name.control.valid) {
              return true;
            }

            this.fields.name.control.markAsTouched();
            SharedConstants.infoCustom(this.snackBar, 'Please fix validation errors before creating the patch.');
            return false;
          }),
          switchMap(_ => {
            const selectedLinkedRackId = this.getSelectedLinkedRackId();
            return this.backend.add.patch(
              {
                name: this.fields.name.control.value,
                public: this.fields.public.control.value,
                ...(selectedLinkedRackId == null
                  ? {}
                  : {linked_rack_id: selectedLinkedRackId})
                // hp:       this.fields.hp.control.value,
                // rows:     this.fields.rows.control.value
              }
            ).pipe(
              catchError(err => {
                if (selectedLinkedRackId != null && isLinkedRackSchemaMissingError(err)) {
                  this.setLinkedRackPersistenceBlocked(true);
                  SharedConstants.errorCustom(this.snackBar, LINKED_RACK_PENDING_CREATE_MESSAGE);
                } else {
                  console.error('Failed to create patch:', err);
                  SharedConstants.errorCustom(this.snackBar, 'Failed to create patch — check your connection and try again.');
                }
                return EMPTY;
              })
            );
          }),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(value => {
          const patchName = this.fields.name.control.value;
          this.snackBar.open(`"${ patchName }" created and saved to your library.`, undefined, {
            duration: 3000,
            panelClass: 'snack-success'
          })
            .onAction()
            .subscribe(() => {
            });
      
          this.dialogRef.close();
        });
  }
  
  ngOnInit(): void {
    this.backend.get.currentUserRacks()
      .pipe(takeUntil(this.destroyEvent$))
      .subscribe(racks => {
        this._currentUserRacks$.next(racks);
        const options = racks.map(rack => ({
          id: `${ rack.id }`,
          name: rack.name || `Rack #${ rack.id }`
        }));
          this._linkedRackOptions$.next(options);

        if (this.data.linkedRackId != null) {
          findAndApplyOptionForId(`${ this.data.linkedRackId }`, this.fields.linkedRack.control, options);
        }
      });
  }

  private getSelectedLinkedRackId(): number | null {
    const selectedId = Number.parseInt(getCleanedValueId(this.fields.linkedRack.control), 10);
    return Number.isFinite(selectedId) ? selectedId : null;
  }

  private setLinkedRackPersistenceBlocked(blocked: boolean): void {
    this._linkedRackPersistenceBlocked$.next(blocked);

    if (blocked) {
      this.fields.linkedRack.control.reset('', {emitEvent: false});
      this.fields.linkedRack.control.disable({emitEvent: false});
      return;
    }

    this.fields.linkedRack.control.enable({emitEvent: false});
  }
  
}
