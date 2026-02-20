import {
  Pipe,
  PipeTransform
} from '@angular/core';
import { PatchConnection } from 'src/app/models/connection';


/** A module that has 2+ distinct connected copies (instance_id values) in the patch. */
export interface ConnectedModuleCopy {
  moduleId: number;
  moduleName: string;
  manufacturerName: string;
  /** How many distinct copies (instance_id values) of this module appear across connections. */
  connectedCopies: number;
}

/**
 * Scans patch connections and returns modules that have 2+ distinct connected copies.
 * Derives from connection data only — does not use internal instance state.
 *
 * Usage:
 *   connections | patchConnectionCopies
 */
@Pipe({
  name: 'patchConnectionCopies',
  standalone: false
})
export class PatchConnectionCopiesPipe implements PipeTransform {
  
  transform(connections: PatchConnection[] | null | undefined): ConnectedModuleCopy[] {
    if (!connections || connections.length === 0) {
      return [];
    }
    
    // Collect distinct instance_id values per module_id.
    // Each connection endpoint contributes (module_id, instance_id).
    const instancesByModule = new Map<number, {
      instances: Set<string>;
      name: string;
      manufacturer: string
    }>();
    
    const track = (moduleId: number, moduleName: string, manufacturerName: string, instanceId: number | undefined) => {
      let entry = instancesByModule.get(moduleId);
      if (!entry) {
        entry = {instances: new Set(), name: moduleName, manufacturer: manufacturerName};
        instancesByModule.set(moduleId, entry);
      }
      entry.instances.add(String(instanceId ?? 'none'));
    };
    
    for (const c of connections) {
      track(c.a.module.id, c.a.module.name, (c.a.module as any).manufacturer?.name ?? '', c.instance_id_a);
      track(c.b.module.id, c.b.module.name, (c.b.module as any).manufacturer?.name ?? '', c.instance_id_b);
    }
    
    const result: ConnectedModuleCopy[] = [];
    for (const [moduleId, entry] of instancesByModule) {
      if (entry.instances.size >= 2) {
        result.push({
          moduleId,
          moduleName: entry.name,
          manufacturerName: entry.manufacturer,
          connectedCopies: entry.instances.size
        });
      }
    }
    
    return result;
  }
}