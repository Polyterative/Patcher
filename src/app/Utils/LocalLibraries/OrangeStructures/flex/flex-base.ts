import { Input } from '@angular/core';

export type FlexKeyRow = 'row';
export type FlexKeyRowWrap = 'row wrap';
export type FlexKeyColumn = 'column';
export type FlexKeyCenter = 'center';
export type FlexKeyLeft = 'left';
export type FlexKeyRight = 'right';
export type FlexTypeBasic = FlexKeyRow | FlexKeyColumn | FlexKeyRowWrap;
export type FlexTypeExtended = FlexKeyRow | FlexKeyColumn | FlexKeyCenter | FlexKeyLeft | FlexKeyRight;

export class FlexBase {
    
    @Input() gap = '1em';
    @Input() md: FlexTypeBasic;
    @Input() sm: FlexTypeBasic;
    @Input() xs: FlexTypeBasic;
    @Input() mdAlign: FlexTypeExtended;
    @Input() smAlign: FlexTypeExtended;
    @Input() xsAlign: FlexTypeExtended;
    
}
