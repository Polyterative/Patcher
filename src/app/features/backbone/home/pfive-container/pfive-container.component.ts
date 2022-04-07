import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit
}         from '@angular/core';
import p5 from 'p5';
import {
  BehaviorSubject,
  interval,
  Subject,
  throttleTime
}         from 'rxjs';
import {
  share,
  takeUntil,
  withLatestFrom
}         from 'rxjs/operators';

interface MyGenerator {
  remainingLife: number;
  birthTime: number;
  
  draw(p: p5, time: number): void;
}

@Component({
  selector:        'app-pfive-container',
  templateUrl:     './pfive-container.component.html',
  styleUrls:       ['./pfive-container.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PfiveContainerComponent implements OnInit, OnDestroy {
  fps = 144;
  
  // rxjs clock
  interval$ = interval(1000 / this.fps / 10)
    .pipe(share());
  
  private p5: p5;
  private origin = {
    x: 0,
    y: 0
  };
  private toggle = true;
  
  private unit = 8;
  
  private generators$ = new BehaviorSubject<MyGenerator[]>([]);
  
  private seed = 0;
  
  private destroy$ = new Subject<void>();
  
  // private generators$ = {
  //   sin:   (x) => {
  //     return Math.sin(x);
  //   },
  //   cos:   (x) => {
  //     return Math.cos(x);
  //   },
  //   tri:   (x) => {
  //     return Math.abs(Math.sin(x));
  //   },
  //   sqr:   (x) => {
  //     return Math.abs(Math.sin(x)) > 0.5 ? 1 : -1;
  //   },
  //   saw:   (x) => {
  //     return Math.abs(Math.sin(x));
  //   },
  //   noise: (x) => {
  //     return Math.random() * 2 - 1;
  //   }
  // };
  
  constructor() {
    window.onresize = this.onWindowResize;
  }
  
  ngOnInit() {
    this.createCanvas();
    
    this.interval$
        .pipe(
          withLatestFrom(this.generators$),
          // delay(250)
          takeUntil(this.destroy$)
        )
        .subscribe(([x, generators]) => {
          this.seed = x;
      
          generators.forEach(generator => {
            generator.remainingLife = generator.remainingLife - 1;
          });
      
          // remove dead generators
          generators = generators.filter(generator => generator.remainingLife > 0);
      
          // clear canvas
          this.p5.background(0);
      
          generators.forEach(generator => {
            generator.draw(this.p5, this.seed - generator.birthTime);
          });
      
          this.generators$.next(generators);
      
        });
    
    this.generators$.next([
      this.circleAlgo(this.seed)
    ]);
  
    // add generator every x seconds
    this.interval$
        .pipe(
          throttleTime(this.secondsToFrames(0.001)),
          takeUntil(this.destroy$)
        )
        .subscribe(() => {
          this.generators$.next([
            ...this.generators$.value,
            this.circleAlgo(this.seed)
          ]);
        });
  }
  
  ngOnDestroy(): void {
    
    this.destroy$.next();
    this.destroy$.complete();
    // destroy p5
    this.p5.remove();
    
    // unsubscribe
  }
  
  private circleAlgo(birthTime: number): MyGenerator {
  
    // generate random between -1 and 1
    const randomX: number = Math.random() * 2 - 1;
    const randomY: number = Math.random() * 2 - 1;
  
    const remainingLife: number = this.secondsToFrames(2);
    return {
      draw: p => {
        // p.background(0);
      
        // color is remainingLife from white to black
        const color = p.map(remainingLife, 0, this.secondsToFrames(2), 255, 0);
        p.stroke(color);
      
        const x = p.windowWidth / 2 + this.unit * randomX * 40;
        const y = p.windowHeight / 2 + this.unit * randomY * 40;
      
        // size is inverse of remainingLife from 40 to 1
        const size = p.map(remainingLife, 0, this.secondsToFrames(2), 40, 10);
      
        p.ellipse(x, y, size, size);
      
        const localSeed: number = this.seed - birthTime;
      
      },
      remainingLife,
      birthTime
    };
  }
  
  private secondsToFrames(seconds: number): number {
    return seconds * this.fps;
  }
  
  private onWindowResize = e => {
    this.p5.resizeCanvas(this.p5.windowWidth, this.p5.windowHeight);
  };
  
  private createCanvas = () => {
    console.log('creating canvas');
    if (this.toggle) {
      this.p5 = new p5(this.drawing);
      this.p5.noLoop();
      this.toggle = !this.toggle;
    } else {
      this.p5.noCanvas();
      this.toggle = !this.toggle;
    }
  };
  
  private drawing(p: p5) {
    
    console.log('drawing');
    
    p.setup = () => {
      p.createCanvas(p.windowWidth, p.windowHeight)
       .parent('canvas');
      // p.background(0);
    };
    
    // this.origin.x = p.windowWidth / 2;
    // this.origin.y = p.windowHeight / 2;
    
    // p.draw = () => {
    //   p.background(220);
    //
    //   const height: number = p.windowHeight;
    //   const width: number = p.windowWidth;
    //
    //   const unit = 32;
    //
    //   console.log(height, width);
    //
    //   this.generators$.value.forEach(generator => {
    //     generator.draw(p, this.seed);
    //   });
    //
    // };
  }
  
}

function lifeToColor(arg0: number): string {
  const life: number = arg0;
  const lifeColor: number = Math.floor(life * 255);
  return `rgb(${ lifeColor }, ${ lifeColor }, ${ lifeColor })`;
}
