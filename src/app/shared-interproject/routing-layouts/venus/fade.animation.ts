// fade.animation.ts

import { animate, query, style, transition, trigger } from '@angular/animations';

export const fadeAnimation = trigger('routeAnimations', [

  transition('* => *', [

    query(':enter',
      [
        style({opacity: 0})
      ],
      {optional: true}
    ),

    query(':leave',
      [
        style({opacity: 1}),
        animate('0.1s', style({opacity: 0}))
      ],
      {optional: true}
    )
    //
    // query(':enter',
    //     [
    //         style({opacity: 0}),
    //         animate('0.2s', style({opacity: 1}))
    //     ],
    //     {optional: true}
    // )

  ])

]);
