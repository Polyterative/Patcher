import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnInit
} from '@angular/core';
import { fadeInOnEnterAnimation } from 'angular-animations';
import { MinimalModule } from 'src/app/models/module';


@Component({
  selector:        'app-module-part-image',
  templateUrl:     './module-part-image.component.html',
  styleUrls:       ['./module-part-image.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations:      [
    fadeInOnEnterAnimation({
      anchor:          'enter',
      duration:        725,
      animateChildren: 'after'
    })
  ]
})
export class ModulePartImageComponent implements OnInit, OnChanges, AfterViewInit {
  
  @Input() data: MinimalModule;
  
  filename: string | undefined;
  
  @Input() containImage: boolean = true;
  @Input() big: boolean = false;
  
  sizeDivider: number = 2.7;
  
  constructor(
    public changeDetection: ChangeDetectorRef
  ) { }
  
  // force change detection when the data changes
  ngOnChanges(): void {
    if (this.data.panels && this.data.panels.length > 0) {
      this.filename = this.data.panels[0].filename;
    } else {
      this.filename = undefined;
    }
    
  }
  
  ngOnInit(): void {
    if (this.data.panels && this.data.panels.length > 0) {
      this.filename = this.data.panels[0].filename;
    } else {
      this.filename = undefined;
    }
  
    if (this.big) {
      this.sizeDivider = 1;
    }
  
    this.changeDetection.detectChanges();
  }
  
  ngAfterViewInit(): void {
    // of(undefined)
    //   .pipe(
    //     delay(250),
    //     take(1)
    //   )
    //   .subscribe(value => {
    //     if (this.data.panels && this.data.panels.length > 0) {
    //       this.filename = this.data.panels[this.data.panels.length - 1].filename;
    //     } else {
    //       this.filename = undefined;
    //     }
    //
    //     this.changeDetection.detectChanges();
    //   });
  }
  
}