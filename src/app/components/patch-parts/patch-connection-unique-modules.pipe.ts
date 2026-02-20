import {
  Pipe,
  PipeTransform
} from '@angular/core';
import { PatchConnection } from 'src/app/models/connection';


/** A distinct module required by the patch, with how many copies are connected. */
export interface UniqueModule {
  moduleId: number;
  moduleName: string;
  manufacturerName: string;
  /** Total number of distinct connected copies (≥1). */
  copies: number;
}

/**
 * Scans patch connections and returns every distinct module involved,
 * sorted alphabetically by module name. One entry per module regardless
 * of how many copies — think of it as the "shopping list" to recreate the patch.
 *
 * Usage:
 *   connections | patchConnectionUniqueModules
 */
@Pipe({
  name: 'patchConnectionUniqueModules',
  standalone: false
})
export class PatchConnectionUniqueModulesPipe implements PipeTransform {
  
  transform(connections: PatchConnection[] | null | undefined): UniqueModule[] {
    if (!connections || connections.length === 0) {
      return [];
    }
    
    const byModule = new Map<number, {
      name: string;
      manufacturer: string;
      instances: Set<string>;
    }>();
    
    const track = (moduleId: number, moduleName: string, manufacturerName: string, instanceId: number | undefined) => {
      let entry = byModule.get(moduleId);
      if (!entry) {
        entry = {name: moduleName, manufacturer: manufacturerName, instances: new Set()};
        byModule.set(moduleId, entry);
      }
      entry.instances.add(String(instanceId ?? 'none'));
    };
    
    for (const c of connections) {
      track(c.a.module.id, c.a.module.name, (c.a.module as any).manufacturer?.name ?? '', c.instance_id_a);
      track(c.b.module.id, c.b.module.name, (c.b.module as any).manufacturer?.name ?? '', c.instance_id_b);
    }
    
    return Array.from(byModule.entries())
      .map(([moduleId, entry]) => ({
        moduleId,
        moduleName: entry.name,
        manufacturerName: entry.manufacturer,
        copies: entry.instances.size
      }))
      .sort((a, b) => a.moduleName.localeCompare(b.moduleName));
  }
}