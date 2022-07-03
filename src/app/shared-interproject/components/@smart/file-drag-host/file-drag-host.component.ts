import {
  animate,
  style,
  transition,
  trigger
}                              from '@angular/animations';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnInit
}                              from '@angular/core';
import {
  merge,
  takeUntil
}                              from 'rxjs';
import { debounceTime }        from 'rxjs/operators';
import { SubManager }          from '../../../directives/subscription-manager';
import { FileDragHostService } from './file-drag-host.service';

@Component({
  selector:        'lib-file-drag-host',
  templateUrl:     './file-drag-host.component.html',
  styleUrls:       ['./file-drag-host.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations:      [
    trigger('fadeInOut', [
      transition(':enter', [   // :enter is alias to 'void => *'
        style({
          opacity: 0,
          height:  0.01
        }),
        animate('225ms cubic-bezier(0.0, 0.0, 0.2, 1)'),
        style(
          {opacity: 1}
        )
      ]),
      transition(':leave', [   // :leave is alias to '* => void'
        animate('225ms cubic-bezier(0.4, 0.0, 1, 1)'),
        style(
          {opacity: 0}
        )
      ])
    ]),

    trigger('fadeIn', [
      transition(':enter', [   // :enter is alias to 'void => *'
        style({
          opacity: 0,
          height:  0.01
        }),
        animate('225ms 500ms cubic-bezier(0.0, 0.0, 0.2, 1)'),
        style(
          {opacity: 1}
        )
      ])
    ])
  ]
  
})
export class FileDragHostComponent extends SubManager implements OnInit {
  @Input()
  acceptedFileType: string;
  
  @Input()
  readonly multipleFilesMode: boolean;
  
  @Input()
  readonly isImageOnlyMode: boolean = false;
  
  constructor(
    public service: FileDragHostService,
    public changeDetectorRef: ChangeDetectorRef
  ) {
    super();
  }
  
  ngOnInit(): void {
    
    this.service.singleFileMode$.next(!this.multipleFilesMode);
    
    merge(
      this.service.files$,
      this.service.fileAdd$,
      this.service.removeFile$,
      this.service.removeAllFiles$
    )
      .pipe(
        debounceTime(50),
        takeUntil(this.destroy$)
      )
      .subscribe(_ => this.changeDetectorRef.detectChanges());
  }
  
}
