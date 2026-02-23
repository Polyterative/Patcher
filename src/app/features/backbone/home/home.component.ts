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
      title: 'Patcher | Open-source digital twin for Eurorack workflows',
      description: 'Plan racks, patch with instance-aware context, auto-save sessions, and explore open Eurorack data.',
      keywords: 'eurorack, modular, digital twin, auto-save, instance-aware patching, open data, open source, patch stats, rack planning',
      type: 'website',
    };
    
    this.seoAndUtilsService.updateSeo(seoData, 'Home');
  }
}