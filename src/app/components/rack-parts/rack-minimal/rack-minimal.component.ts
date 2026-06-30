import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit
} from '@angular/core';
import { RackDetailDataService } from 'src/app/components/rack-parts/rack-detail-data.service';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { RackMinimal } from 'src/app/models/rack';


@Component({
  selector: 'app-rack-minimal',
  templateUrl: './rack-minimal.component.html',
  styleUrls: ['./rack-minimal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class RackMinimalComponent implements OnInit, OnDestroy {
  @Input() data: RackMinimal;
  @Input() viewConfig: RackMinimalViewConfig = {
    ...defaultRackMinimalViewConfig,
    containImage: false
  };

  constructor(
    public userManagerService: UserManagementService,
    public dataService: RackDetailDataService
  ) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {}

}

export interface RackMinimalViewConfig {
  hideLabels: boolean;
  hideDescription: boolean;
  hideButtons: boolean;
  hideHP: boolean;
  hideDates: boolean;
  containImage: boolean;
}

export const defaultRackMinimalViewConfig: RackMinimalViewConfig = {
  hideLabels:      false,
  hideDescription: false,
  hideButtons:     false,
  hideHP:          false,
  hideDates: false,
  containImage: true
};