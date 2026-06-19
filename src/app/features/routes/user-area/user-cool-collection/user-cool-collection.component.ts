import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnInit
} from '@angular/core';
import { COOL_REACTIONS_ENABLED } from 'src/app/components/shared-atoms/cool-button/cool-button-feature.token';
import { UserCoolCollectionDataService } from './user-cool-collection-data.service';

@Component({
  selector: 'app-user-cool-collection',
  templateUrl: './user-cool-collection.component.html',
  styleUrls: ['./user-cool-collection.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [UserCoolCollectionDataService],
  standalone: false
})
export class UserCoolCollectionComponent implements OnInit {
  constructor(
    public readonly dataService: UserCoolCollectionDataService,
    @Inject(COOL_REACTIONS_ENABLED) public readonly coolReactionsEnabled: boolean
  ) {}

  ngOnInit(): void {
    if (this.coolReactionsEnabled) {
      this.dataService.load$.next();
    }
  }
}
