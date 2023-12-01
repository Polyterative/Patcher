import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector:    'lib-hero-link',
  templateUrl: './hero-link.component.html',
  styleUrls:   ['./hero-link.component.scss']
})
export class HeroLinkComponent implements OnInit {
  @Input()
  label: string;
  @Input()
  icon: string;
  @Input()
  iconColor: string='black';
  @Input()
  link: string|any[];
  @Input()
  disabled: boolean = false;

  constructor() { }

  ngOnInit(): void {
  }

}
