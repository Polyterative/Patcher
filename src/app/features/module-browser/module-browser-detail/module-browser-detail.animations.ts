import {
  animate,
  animateChild,
  group,
  query,
  style,
  transition,
  trigger
} from '@angular/animations';
import { Animations } from 'src/app/shared-interproject/SharedConstants';

export const moduleBrowserDetailAnimations = [
  Animations.fadeInOnEnter,
  trigger('moduleDetailRailEnter', [
    transition(':enter', [
      style({
        opacity: 0,
      }),
      animate('{{ duration }}ms {{ delay }}ms cubic-bezier(0.2, 0, 0, 1)', style({
        opacity: 1,
      }))
    ], {
      params: { delay: 0, duration: 185 }
    })
  ]),
  trigger('moduleDetailSupportEnter', [
    transition(':enter', [
      style({
        opacity: 0,
      }),
      animate('{{ duration }}ms {{ delay }}ms cubic-bezier(0.22, 1, 0.36, 1)', style({
        opacity: 1,
      }))
    ], {
      params: { delay: 0, duration: 190 }
    })
  ]),
  trigger('moduleDetailDataEnter', [
    transition(':enter', [
      style({
        opacity: 0,
      }),
      animate('{{ duration }}ms {{ delay }}ms cubic-bezier(0.2, 0, 0, 1)', style({
        opacity: 1,
      })),
      query('@moduleDetailSupportEnter', animateChild(), { optional: true })
    ], {
      params: { delay: 0, duration: 180 }
    })
  ]),
  trigger('moduleDetailFabEnter', [
    transition(':enter', [
      style({
        opacity: 0,
      }),
      animate('{{ duration }}ms {{ delay }}ms cubic-bezier(0.22, 1, 0.36, 1)', style({
        opacity: 1,
      }))
    ], {
      params: { delay: 0, duration: 175 }
    })
  ]),
  trigger('moduleDetailPaneSwap', [
    transition(':enter', [
      style({
        opacity: 0,
        height: 0,
        transform: 'translateY(0.9rem)',
        overflow: 'hidden'
      }),
      group([
        animate('280ms cubic-bezier(0.22, 1, 0.36, 1)', style({
          opacity: 1,
          height: '*',
          transform: 'translateY(0)'
        })),
        query('@*', animateChild(), { optional: true })
      ])
    ]),
    transition(':leave', [
      style({
        overflow: 'hidden'
      }),
      animate('210ms cubic-bezier(0.4, 0, 1, 1)', style({
        opacity: 0,
        height: 0,
        transform: 'translateY(-0.55rem)'
      }))
    ])
  ]),
  trigger('moduleDetailModeTransition', [
    transition('false => true', [
      group([
        query('.module-detail-column--middle', [
          animate('240ms cubic-bezier(0.2, 0, 0, 1)', style({
            transform: 'translateY(0.35rem)'
          }))
        ], {optional: true}),
        query('.module-detail-column--right', [
          style({
            transform: 'translateY(0.55rem) scale(0.992)',
            opacity: 0.92
          }),
          animate('280ms cubic-bezier(0.22, 1, 0.36, 1)', style({
            transform: 'translateY(0) scale(1)',
            opacity: 1
          }))
        ], {optional: true})
      ])
    ]),
    transition('true => false', [
      group([
        query('.module-detail-column--middle', [
          animate('220ms cubic-bezier(0.22, 1, 0.36, 1)', style({
            transform: 'translateY(0)'
          }))
        ], {optional: true}),
        query('.module-detail-column--right', [
          style({
            transform: 'translateY(-0.35rem) scale(0.992)',
            opacity: 0.92
          }),
          animate('260ms cubic-bezier(0.22, 1, 0.36, 1)', style({
            transform: 'translateY(0) scale(1)',
            opacity: 1
          }))
        ], {optional: true})
      ])
    ])
  ])
];
