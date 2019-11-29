import {
    ChangeDetectionStrategy,
    Component,
    OnInit
}              from '@angular/core';
import * as p5 from 'p5';
import 'p5/lib/addons/p5.sound';
import {
    BehaviorSubject,
    interval
}              from 'rxjs';

@Component({
    selector:        'app-generative-sandbox',
    templateUrl:     './generative-sandbox.component.html',
    styleUrls:       ['./generative-sandbox.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class GenerativeSandboxComponent implements OnInit {
    
    color = new BehaviorSubject('#2a2a2a');
    
    private toggle = true;
    private p5: p5;
    
    constructor() {
        console.log('Analog-constructed');
        window.onresize = this.onWindowResize;
    }
    
    ngOnInit() {
        console.log('analog-init');
        this.createCanvas();
        
        interval(1000)
            .subscribe(x => {
                this.color.next('#5a3a20');
            });
        
        interval(3000)
            .subscribe(x => {
                this.color.next('#2a2a5a');
            });
        
        
        interval(2000)
            .subscribe(x => {
                this.color.next('#2d5a44');
            });
    }
    
    ngOnDestroy(): void {
        this.destroyCanvas();
        console.log('analog-destroy');
    }
    
    private canvasPadding = 50;
    private onWindowResize = e => {
        this.p5.resizeCanvas(this.p5.windowWidth - this.canvasPadding, this.p5.windowHeight - this.canvasPadding);
    };
    
    private createCanvas = () => {
        console.log('creating canvas');
        this.p5 = new p5(this.drawing);
    };
    
    private destroyCanvas = () => {
        console.log('destroying canvas');
        this.p5.noCanvas();
    };
    
    private drawing = (p: any) => {
        p.setup = () => {
            p.createCanvas(p.windowWidth, p.windowHeight)
                .parent('analog-clock-canvas');
            p.angleMode(p.DEGREES);
            p.rectMode(p.CENTER);
            p.background(0);
        };
        p.center = {
            x: 0,
            y: 0
        };
        p.draw = () => {
            this.draw(p);
        };
        
    };
    
    private draw(p: any) {
        p.background(this.color.value);
        p.center.x = p.width / 2;
        p.center.y = p.height / 2;
        
        const hour = p.hour();
        const minute = p.minute();
        const second = p.second();
        const millis = p.millis();
        
        p.push();
        
        p.translate(p.center.x, p.center.y);
        p.rotate(-90);
        
        p.strokeWeight(8);
        p.noFill();
        
        // p.arc(0, 0, 210, 210, 0, 360);
        
        // dail
        p.stroke(175);
        p.arc(0, 0, 210, 210, 0, 360);
        
        // second
        const sc_end = p.map(second % 60, 0, 60, 0, 360);
        
        p.push();
        p.rotate(sc_end);
        p.stroke(255, 0, 0);
        p.line(0, 0, 90, 0);
        p.pop();
        
        // minute
        const mn_end = p.map(minute % 60, 0, 60, 0, 360);
        p.push();
        p.rotate(mn_end);
        p.stroke(0, 230, 0);
        p.line(0, 0, 70, 0);
        p.pop();
        
        // hour
        const hr_end = p.map(hour % 12, 0, 12, 0, 360);
        p.push();
        p.rotate(hr_end);
        p.stroke(0, 0, 230);
        p.line(0, 0, 50, 0);
        p.pop();
        
        // center
        p.fill('#b3b3b3');
        p.noStroke();
        p.ellipse(0, 0, 8, 8);
        
        p.pop();
        
        // const clock = hour + ':' + minute + ':' + second;
        // p.fill(255);
        // p.noStroke();
        // p.textSize(25);
        // p.text(clock, 100, 50);
    }
}
