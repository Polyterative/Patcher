import {
  Pipe,
  PipeTransform
} from '@angular/core';
import { PatchConnection } from 'src/app/models/connection';


export interface PatchConnectionStats {
  /** Total number of distinct cables in the patch. */
  totalCables: number;
  /** Number of unique modules referenced in any connection. */
  uniqueModules: number;
  /** Number of output CVs that are connected to more than one input (multiples). */
  multiplesCount: number;
  /** Number of unique module instances (module_id + instance_id pairs). Equals uniqueModules when no multi-instance modules exist. */
  totalInstances: number;
}

/**
 * Computes statistics (cable count, unique modules, multiples) from a list of patch connections.
 *
 * Usage:
 *   connections | patchConnectionStats
 */
@Pipe({
  name: 'patchConnectionStats',
  standalone: false
})
export class PatchConnectionStatsPipe implements PipeTransform {
  
  transform(connections: PatchConnection[] | null | undefined): PatchConnectionStats | null {
    if (!connections || connections.length === 0) {
      return null;
    }
    
    const totalCables = connections.length;
    
    // Collect unique module IDs across all connection endpoints
    const moduleIds = new Set<number>();
    connections.forEach(c => {
      moduleIds.add(c.a.module.id);
      moduleIds.add(c.b.module.id);
    });
    const uniqueModules = moduleIds.size;
    
    // A "multiple" is an output CV that drives more than one input.
    // Count how many times each output CV (by ID) appears across all connections.
    const outputUseCounts = new Map<number, number>();
    connections.forEach(c => {
      const outId = c.a.id; // 'a' is always the output CV (from patch-detail-data.service logic)
      outputUseCounts.set(outId, (outputUseCounts.get(outId) ?? 0) + 1);
    });
    const multiplesCount = Array.from(outputUseCounts.values()).filter(count => count > 1).length;
    
    // Count unique module instances: (module_id, instance_id) pairs.
    // When instance_id is undefined, the module counts as a single instance.
    const instanceKeys = new Set<string>();
    connections.forEach(c => {
      instanceKeys.add(`${ c.a.module.id }_${ c.instance_id_a ?? 'none' }`);
      instanceKeys.add(`${ c.b.module.id }_${ c.instance_id_b ?? 'none' }`);
    });
    const totalInstances = instanceKeys.size;
    
    return {totalCables, uniqueModules, multiplesCount, totalInstances};
  }
}