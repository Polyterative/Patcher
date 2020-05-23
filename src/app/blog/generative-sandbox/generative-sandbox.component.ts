import {
    ChangeDetectionStrategy,
    Component,
    OnInit
} from '@angular/core';
// import 'p5/lib/addons/p5.sound';
import {
    BehaviorSubject,
    interval
} from 'rxjs';

@Component({
    selector:        'app-generative-sandbox',
    templateUrl:     './generative-sandbox.component.html',
    styleUrls:       ['./generative-sandbox.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class GenerativeSandboxComponent implements OnInit {
    
    color = new BehaviorSubject('#2a2a2a');
    
    ngOnInit() {
        console.log('analog-init');
        
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
    
}
