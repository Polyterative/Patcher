/** Adapts the native JS Date for use with cdk-based components that work with dates. */
import { Injectable } from '@angular/core';
import { NativeDateAdapter } from '@angular/material/core';

@Injectable()
export class CustomDateAdapterPlainMondayStart extends NativeDateAdapter {

  getFirstDayOfWeek(): number {

    return 1;
  }

}
