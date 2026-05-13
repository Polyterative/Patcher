import {
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

import { Rack } from "src/app/models/rack";


@Component({
  selector: 'app-rack-image',
  templateUrl: './rack-image.component.html',
  styleUrls: ['./rack-image.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FlexLayoutModule,
    RouterLink,
    ScreenWrapperModule
  ],
  animations: [
    fadeInOnEnterAnimation({
      anchor: 'enter',
      duration: 725,
      animateChildren: 'after'
    })
  ]
})
export class RackImageComponent implements OnInit, OnChanges {
  
  @Input() data: Rack;
  @Input() containImage: boolean = true;
  
  filename: string | undefined;
  
  // proportion between contained and full size
  sizeDivider: number = 1.5;
  
  constructor(
    public changeDetection: ChangeDetectorRef
  ) {
  }
  
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
    
    this.changeDetection.detectChanges();
  }
  
}