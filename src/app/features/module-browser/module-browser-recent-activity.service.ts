import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  map,
  shareReplay
} from 'rxjs/operators';
import { MinimalModule } from 'src/app/models/module';
import { RecentActivityItem } from 'src/app/components/shared-atoms/recent-activity/recent-activity.model';


type ModuleActivitySource =
  MinimalModule[]
  | null;

@Injectable()
export class ModuleBrowserRecentActivityService {
  readonly maxItems = 5;
  
  getRecentActivityItems$(modules$: Observable<ModuleActivitySource>): Observable<RecentActivityItem[]> {
    return modules$
      .pipe(
        map(modules => this.mapModulesToRecentActivityItems(modules, this.maxItems)),
        shareReplay(1)
      );
  }
  
  mapModulesToRecentActivityItems(
    modules: ModuleActivitySource,
    maxItems = this.maxItems
  ): RecentActivityItem[] {
    if (!modules?.length || maxItems <= 0) {
      return [];
    }
    
    return [...modules]
      .sort((left, right) => this.toTimestampMs(right.updated) - this.toTimestampMs(left.updated))
      .slice(0, maxItems)
      .map(module => {
        const createdMs = this.toTimestampMs(module.created);
        const updatedMs = this.toTimestampMs(module.updated);
        const isCreationEvent = createdMs > 0 && Math.abs(updatedMs - createdMs) < 1000;
        
        return {
          id: `module-${ module.id }-${ isCreationEvent ? 'created' : 'updated' }`,
          type: isCreationEvent ? 'create' : 'update',
          actionLabel: isCreationEvent ? 'created' : 'updated',
          targetLabel: module.name,
          timestamp: isCreationEvent ? module.created : module.updated,
          actorLabel: module.manufacturer?.name ?? 'Unknown author',
          contextLabel: 'Module',
          route: ['/modules', 'details', module.id]
        } as RecentActivityItem;
      });
  }
  
  private toTimestampMs(value: string): number {
    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) {
      return 0;
    }
    return timestamp;
  }
}