import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                     from '@angular/core';
import { PublicUser } from 'src/app/models/models';

@Component({
  selector:        'app-entity-author',
  templateUrl:     './entity-author.component.html',
  styleUrls:       ['./entity-author.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntityAuthorComponent implements OnInit {
  @Input()
  public readonly data: PublicUser;
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}
