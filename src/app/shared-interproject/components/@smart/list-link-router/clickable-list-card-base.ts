import { EventEmitter } from '@angular/core';
import { NavigationExtras } from '@angular/router';
import { Observable, ReplaySubject } from 'rxjs';

export interface CardLink {
  label: string;
  route: any[] | string;
  navExtras?: NavigationExtras,
  icon?: string;
  disabled?: Observable<boolean>;
  hidden?: Observable<boolean>;
}

export interface CardLinkDataModel {
  links: CardLink[][];
  selected$?: ReplaySubject<CardLink>;
  click$: EventEmitter<CardLink>;
}


export function buildCardLinkRoute(label: string, route: any[], icon?: string, disabled?: Observable<boolean>, hidden?: Observable<boolean>): CardLink {

  return {
    route,
    label,
    icon,
    disabled,
    hidden
  };

}

export function buildCardAbsoluteRoute(label: string, route: string, icon?: string, disabled?: Observable<boolean>, hidden?: Observable<boolean>): CardLink {

  return {
    route,
    label,
    icon,
    disabled,
    hidden
  };

}

export const cleanCardlinkModelObject: CardLinkDataModel = {
  links:     [],
  selected$: new ReplaySubject<CardLink>(),
  click$:    new EventEmitter<CardLink>()
};
