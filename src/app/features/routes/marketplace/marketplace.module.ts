import { NgModule } from '@angular/core';
import {
  RouterModule,
  Routes
} from '@angular/router';
import { MarketplaceBrowserComponent } from './marketplace-browser/marketplace-browser.component';
import { MarketplaceDetailComponent } from './marketplace-detail/marketplace-detail.component';

export const marketplaceChildRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: MarketplaceBrowserComponent
  },
  {
    path: ':publicId',
    pathMatch: 'full',
    component: MarketplaceDetailComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(marketplaceChildRoutes)],
  exports: [RouterModule]
})
export class MarketplaceModule {}
