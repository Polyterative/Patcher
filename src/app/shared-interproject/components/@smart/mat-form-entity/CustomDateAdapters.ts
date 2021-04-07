/** Adapts the native JS Date for use with cdk-based components that work with dates. */
import { Injectable }        from '@angular/core';
import { NativeDateAdapter } from '@angular/material/core';

@Injectable()
export class CustomDateAdapterPlainMondayStart extends NativeDateAdapter {

  // parse the date from input component as it only expect dates in
  // mm-dd-yyyy format
  // parse(value: any): Date | null {
  //   if ((typeof value === 'string') && (value.indexOf('/') > -1)) {
  //     const str = value.split('/');
  //
  //     const year = Number(str[2]);
  //     const month = Number(str[1]) - 1;
  //     const date = Number(str[0]);
  //
  //     return new Date(year, month, date);
  //   }
  //   debugger
  //   const timestamp = typeof value === 'number' ? value : Date.parse(value);
  //   return isNaN(timestamp) ? null : new Date(timestamp);
  // }

  getFirstDayOfWeek(): number {

    return 1;
  }

}
