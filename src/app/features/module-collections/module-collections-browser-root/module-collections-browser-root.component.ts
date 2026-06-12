import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { SeoAndUtilsService } from 'src/app/features/backbone/seo-and-utils.service';
import { ModuleCollectionsBrowserDataService } from '../module-collections-browser-data.service';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { FormTypes } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';

@Component({
  selector: 'app-module-collections-browser-root',
  templateUrl: './module-collections-browser-root.component.html',
  styleUrls: ['./module-collections-browser-root.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ModuleCollectionsBrowserDataService],
  standalone: false
})
export class ModuleCollectionsBrowserRootComponent extends SubManager implements OnInit {
  readonly formTypes = FormTypes;

  constructor(
    public dataService: ModuleCollectionsBrowserDataService,
    private seoAndUtilsService: SeoAndUtilsService
  ) {
    super();
  }

  ngOnInit(): void {
    this.seoAndUtilsService.updateSeo({
      description: 'Curated module collections and discovery playlists.'
    }, 'Collections');
  }
}
