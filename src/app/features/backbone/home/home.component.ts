import {
  ChangeDetectionStrategy,
  Component
} from '@angular/core';
import { SeoSocialShareData } from 'src/app/models/seo.model';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { SeoAndUtilsService } from '../seo-and-utils.service';


@Component({
  selector: 'app-home',
  styleUrls: ['./home.component.scss'],
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class HomeComponent extends SubManager {
  constructor(
    readonly seoAndUtilsService: SeoAndUtilsService
  ) {
    super();

    const seoData: SeoSocialShareData = {
      title: 'Patcher | Fast modular workflow for real patch sessions',
      description: 'Browse modules, shape racks, patch with context, and auto-save every idea in an open-source Eurorack workspace.',
      keywords: 'eurorack, modular workflow, patch planning, rack builder, auto-save patches, open-source music software, patch graph',
      type: 'website',
    };
    
    this.seoAndUtilsService.updateSeo(seoData, 'Home');
  }
}
