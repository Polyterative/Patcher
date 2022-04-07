import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit
}         from '@angular/core';
import p5 from 'p5';

@Component({
  selector:        'app-pfive-container',
  templateUrl:     './pfive-container.component.html',
  styleUrls:       ['./pfive-container.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PfiveContainerComponent implements OnInit, OnDestroy {
  
  private p5;
  private origin = {
    x: 0,
    y: 0
  };
  private toggle = true;
  
  constructor() {
    window.onresize = this.onWindowResize;
  }
  
  ngOnInit() {
    console.log('digital-init');
    this.createCanvas();
  }
  
  ngOnDestroy(): void {
  }
  
  private onWindowResize = (e) => {
    this.p5.resizeCanvas(this.p5.windowWidth, this.p5.windowHeight);
  };
  
  private createCanvas = () => {
    console.log('creating canvas');
    if (this.toggle) {
      this.p5 = new p5(this.drawing);
      this.toggle = !this.toggle;
    } else {
      this.p5.noCanvas();
      this.toggle = !this.toggle;
    }
  };
  
  private drawing = function (p: p5) {
    p.setup = () => {
      p.createCanvas(p.windowWidth, p.windowHeight)
       .parent('digital-watch-canvas');
      p.background(0);
    };
    
    p.draw = () => {
      const time = {
        hr: p.hour(),
        mn: p.minute(),
        sc: p.second(),
        ms: p.millis()
      };
      const center = {
        x: p.width / 2,
        y: p.height / 2
      };
      
      p.background(0);
      
      const clock = time.hr + ':' + time.mn + ':' + time.sc;
      p.fill(255);
      p.noStroke();
      p.textSize(50);
      p.text(clock, center.x, center.y);
    };
  };
  
}
