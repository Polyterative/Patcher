import {
  ChangeDetectionStrategy,
  Component,
  OnInit
} from '@angular/core';
import { ManufacturerBrowserRootDataService } from './manufacturer-browser-root-data.service';
import { SeoAndUtilsService } from 'src/app/features/backbone/seo-and-utils.service';
import { Router } from '@angular/router';


@Component({
  selector: 'app-manufacturer-browser-root',
  templateUrl: './manufacturer-browser-root.component.html',
  styleUrls: ['./manufacturer-browser-root.component.scss'],
  providers: [ManufacturerBrowserRootDataService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ManufacturerBrowserRootComponent implements OnInit {
  
  constructor(
    public dataService: ManufacturerBrowserRootDataService,
    private seoAndUtilsService: SeoAndUtilsService,
    private router: Router
  ) {
  }
  
  ngOnInit(): void {
    this.seoAndUtilsService.updateSeo(
      {
        title: 'Manufacturers — Eurorack Module Makers',
        description: 'Browse all Eurorack module manufacturers on patcher.xyz.',
        url: 'https://patcher.xyz/manufacturers/browser'
      },
      'Manufacturers'
    );
    this.dataService.updateList$.next();
  }
  
  navigateToDetail(id: number): void {
    this.router.navigate(['/manufacturers/details', id]);
  }
}