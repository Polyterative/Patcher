import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges
} from '@angular/core';
import { COOL_REACTIONS_ENABLED } from 'src/app/components/shared-atoms/cool-button/cool-button-feature.token';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
} from 'src/app/components/module-parts/module-minimal/module-minimal.component';
import {
  defaultRackMinimalViewConfig,
  RackMinimalViewConfig
} from 'src/app/components/rack-parts/rack-minimal/rack-minimal.component';
import {
  UserCoolCollectionDataService,
  UserCoolCollectionEntityType
} from './user-cool-collection-data.service';

@Component({
  selector: 'app-user-cool-collection',
  templateUrl: './user-cool-collection.component.html',
  styleUrls: ['./user-cool-collection.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [UserCoolCollectionDataService],
  standalone: false
})
export class UserCoolCollectionComponent implements OnChanges, OnInit {
  @Input() embedded = false;
  @Input() entityType: UserCoolCollectionEntityType = 'module';
  @Input() emptyCopy = 'Tap Cool on a public item to build this collection.';
  @Input() modulesViewConfig: ModuleMinimalViewConfig = {...defaultModuleMinimalViewConfig};
  @Input() rackViewConfig: RackMinimalViewConfig = {...defaultRackMinimalViewConfig};

  constructor(
    public readonly dataService: UserCoolCollectionDataService,
    @Inject(COOL_REACTIONS_ENABLED) public readonly coolReactionsEnabled: boolean
  ) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['entityType'] && !changes['entityType'].firstChange) {
      this.load();
    }
  }

  private load(): void {
    if (this.coolReactionsEnabled) {
      this.dataService.load$.next(this.entityType);
    }
  }
}
