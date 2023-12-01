import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector:        'app-changelog',
  templateUrl:     './changelog.component.html',
  styleUrls:       ['./changelog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChangelogComponent implements OnInit {
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}
