import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConstantsService {
  static readonly behaviour = {
    dataDownload:     {
      max_attempts: 3,
      retryTimes:   {
        veryFast: 100,
        fast:     250,
        medium:   500,
        slow:     1000,
        verySlow: 5000
      }
    },
    updateTimes:      {
      frameTime: 16.67,
      veryFast:  25,
      fast:      75,
      snappy:    250,
      bounce:    500,
      slow:      1000
    },
    messageDurations: {
      snackbar: {
        short: 1000,
        long:  10000
      }
    }
  };
}
