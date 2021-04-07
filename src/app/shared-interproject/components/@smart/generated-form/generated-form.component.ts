import {
    animate,
    query,
    stagger,
    style,
    transition,
    trigger
}                          from '@angular/animations';
import {
    ChangeDetectionStrategy,
    Component,
    Input
}                          from '@angular/core';
import { AppStateService } from '../../../app-state.service';
import { FormTypes }       from '../mat-form-entity/form-element-models';
import { GeneratedForm }   from './generated-form-models';
import AutoFormEntity = GeneratedForm.AutoFormEntity;

@Component({
  selector:        'lib-generated-form',
  templateUrl:     './generated-form.component.html',
  styleUrls:       ['./generated-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations:      [
    trigger('list', [
      transition('* => *', [
        query(':enter',
          [
            style({opacity: 0}),
            stagger(500,
              [
                animate('300ms cubic-bezier(0.0, 0.0, 0.2, 1)'),
                style({opacity: 1})
              ])
          ]
        )
      ])
    ])
  ]
})
export class GeneratedFormComponent {

  @Input()
  oldControls!: AutoFormEntity[][];

  @Input()
  controls!: AutoFormEntity[][];

  @Input()
  hideOldValue?: boolean;

  @Input()
  separationTreshold: number = 4;

  controlTypes = FormTypes;

  constructor(
    public appState: AppStateService
  ) {

  }


}
