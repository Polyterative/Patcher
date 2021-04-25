import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit
}                                 from '@angular/core';
import {
  FormBuilder,
  FormControl
}                                 from '@angular/forms';
import { Subject }                from 'rxjs';
import { PatchDetailDataService } from 'src/app/components/patch-parts/patch-detail-data.service';
import { SupabaseService }        from 'src/app/features/backend/supabase.service';
import { Patch }                  from 'src/app/models/models';

interface FormCV {
  id: number,
  name: FormControl;
  a: FormControl;
  b: FormControl;
}

type DataType = Patch;

@Component({
  selector:        'app-patch-editor',
  templateUrl:     './patch-editor.component.html',
  styleUrls:       ['./patch-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatchEditorComponent implements OnInit, OnDestroy {
  @Input() data: DataType;
  protected destroyEvent$: Subject<void> = new Subject();
  
  
  constructor(
    public backend: SupabaseService,
    public formBuilder: FormBuilder,
    public dataService: PatchDetailDataService
  ) {
  }
  
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
  }
  
  ngOnInit(): void {
  }
  
  
}
