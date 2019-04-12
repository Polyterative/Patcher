import {
  EventEmitter,
  OnDestroy,
  OnInit
}                            from '@angular/core';
import { ConstantsService }  from 'src/app/Utils/LocalLibraries/VioletUtilities/constants.service';
import { DimensionsService } from 'src/app/Utils/LocalLibraries/VioletUtilities/dimensions.service';

export interface Destructable {
  destroyEvent$: EventEmitter<null>;
}

export abstract class AngularEntityBase implements OnInit, OnDestroy, Destructable {
  
  destroyEvent$: EventEmitter<null> = new EventEmitter<null>();
  
  protected constructor(
    public constants: ConstantsService,
    public dimens: DimensionsService
  ) {
  }
  
  ngOnInit() {
  }
  
  ngOnDestroy(): void {
    this.destroyEvent$.emit();
    this.destroyEvent$.complete();
    
  }
  
}
