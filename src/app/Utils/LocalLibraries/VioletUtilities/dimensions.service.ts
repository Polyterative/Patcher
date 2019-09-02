import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class DimensionsService {
    readonly flexGapLess = '0.5em';
    readonly flexGapLessABit = '0.7em';
    readonly flexGap = '1em';
    readonly flexGapMoreABit = '1.3em';
    readonly flexGapMore = '1.5em';

}
