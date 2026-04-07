import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  Subject
} from 'rxjs';
import { SubManager } from '../../../directives/subscription-manager';


export interface ContextMenuItem {
  id: string;
  icon?: string;
  label: string;
  disabled: boolean;
  danger?: boolean;
  data?: any;
  click$: Subject<ContextMenuItem>;
  submenu?: ContextMenuItem[];
  imageUrl?: string;
}

@Injectable()
export class GeneralContextMenuDataService extends SubManager {
  
  menuItems$: BehaviorSubject<ContextMenuItem[]> = new BehaviorSubject<ContextMenuItem[]>([]);
  
  positionData$ = new BehaviorSubject<{
    x: string,
    y: string
  }>({
    x: '0px',
    y: '0px'
  });
  
  open$ = new Subject<MouseEvent>();
  
}