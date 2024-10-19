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
import { FlexLayoutModule } from "@angular/flex-layout";
import { RouterLink } from "@angular/router";
import { ScreenWrapperModule } from "src/app/shared-interproject/components/@visual/screen-wrapper/screen-wrapper.module";
import { NgIf } from "@angular/common";
import { Rack } from "src/app/models/rack";


@Component({
  selector: 'app-rack-image',
  templateUrl: './rack-image.component.html',
  styleUrls: ['./rack-image.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    FlexLayoutModule,
    RouterLink,
    ScreenWrapperModule,
    NgIf
  ],
  animations: [
    fadeInOnEnterAnimation({
      anchor: 'enter',
      duration: 725,
      animateChildren: 'after'
    })
  ]
})
export class RackImageComponent implements OnInit, OnChanges, AfterViewInit {
  
  @Input() data: Rack;
  
  filename: string | undefined;
  
  // @Input() containImage: boolean = true;
  // @Input() big: boolean = false;
  
  // proportion between contained and full size
  sizeDivider: number = 1.5;
  
  constructor(
    public changeDetection: ChangeDetectorRef
  ) {
  }
  
  // force change detection when the data changes
  @Input() containImage: boolean = true;
  ngOnChanges(): void {
    if (this.data.image) {
      this.filename = this.data.image;
    } else {
      this.filename = undefined;
    }
    
  }
  
  ngOnInit(): void {
    if (this.data.image) {
      this.filename = this.data.image;
    } else {
      this.filename = undefined;
    }
    
    // if (this.big) {
    //   this.sizeDivider = 1;
    // }
    
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