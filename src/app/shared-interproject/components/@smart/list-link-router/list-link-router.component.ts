import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    OnDestroy,
    OnInit
} from '@angular/core';
import {
    CardLink,
    CardLinkDataModel,
    cleanCardlinkModelObject
} from './clickable-list-card-base';

/**
 *  SMART COMPONENT
 */
@Component({
  selector:        'app-list-link-router',
  templateUrl:     './list-link-router.component.html',
  styleUrls:       ['./list-link-router.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
  // animations:      [
  //   trigger('list', [
  //     transition('* => *', [
  //       query(':enter',
  //         [
  //           style({opacity: 0}),
  //           stagger(100,
  //             [
  //               animate('300ms cubic-bezier(0.0, 0.0, 0.2, 1)'),
  //               style({opacity: 1})
  //             ])
  //         ]
  //       )
  //     ])
  //   ])
  // ]
})
export class ListLinkRouterComponent implements OnInit, OnDestroy {
  @Input()
  linksData: CardLinkDataModel = cleanCardlinkModelObject;

  protected destroyEvent$: EventEmitter<void> = new EventEmitter();

  ngOnDestroy(): void {
    this.destroyEvent$.emit();
    this.destroyEvent$.complete(); 

  }

  constructor() {
  }

  ngOnInit(): void {
  }

  isRelative(a: CardLink) {
    return Array.isArray(a.route);
  }

  doNothing() {
    // angular workaround, leave this here
  }
}
