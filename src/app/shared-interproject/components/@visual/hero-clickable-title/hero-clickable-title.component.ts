import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-hero-clickable-title',
  templateUrl: './hero-clickable-title.component.html',
  styleUrls: ['./hero-clickable-title.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeroClickableTitleComponent implements OnInit {
  @Input() link: string | any[] = undefined;
  @Input() textSize: number | undefined = undefined

  constructor() { }

  ngOnInit(): void {
  }

}
