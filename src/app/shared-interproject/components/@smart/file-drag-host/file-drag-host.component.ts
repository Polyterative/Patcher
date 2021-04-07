import {
    animate,
    style,
    transition,
    trigger
}                              from '@angular/animations';
import {
    Component,
    Input
}                              from '@angular/core';
import { FileDragHostService } from './file-drag-host.service';

@Component({
  selector:        'lib-file-drag-host',
  templateUrl:     './file-drag-host.component.html',
  styleUrls:       ['./file-drag-host.component.scss'],
  // changeDetection: ChangeDetectionStrategy.OnPush,
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
export class FileDragHostComponent {
  @Input()
  acceptedFileType: string;

  @Input()
  readonly multipleFilesMode: boolean;

  @Input()
  readonly isImageOnlyMode: boolean = false;

  constructor(
    public service: FileDragHostService
  ) {
  }

}
