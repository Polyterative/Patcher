import {
  ChangeDetectionStrategy,
  Component,
  OnInit
} from '@angular/core';

@Component({
  selector:        'app-discord-widget',
  templateUrl:     './discord-widget.component.html',
  styleUrls:       ['./discord-widget.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DiscordWidgetComponent implements OnInit {
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}
