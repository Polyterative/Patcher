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
  /**
   * Number of unique module instances referenced in any connection.
   * When instance IDs are present a single physical module type may contribute
   * more than one instance (e.g. two VCOs of the same model).
   * Falls back to uniqueModules when no instance information is available.
   */
  totalInstances: number;
  /** Number of output CVs that are connected to more than one input (multiples). */
  multiplesCount: number;
  /** Average number of cables per module, rounded to 1 decimal place. */
  avgCablesPerModule: number;
  /** Number of connections that have a user note attached. */
  annotatedConnections: number;
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
    
    // Count unique *instances*: a module may appear multiple times with different
    // instance_id values (e.g. two identical VCOs).  We key on "moduleId_instanceId";
    // when instance_id is absent we use the sentinel string "none" so the pair still
    // contributes exactly one instance per unique module.
    const instanceKeys = new Set<string>();
    connections.forEach(c => {
      instanceKeys.add(`${ c.a.module.id }_${ c.instance_id_a ?? 'none' }`);
      instanceKeys.add(`${ c.b.module.id }_${ c.instance_id_b ?? 'none' }`);
    });
    const totalInstances = instanceKeys.size;
    
    // A "multiple" is an output CV that drives more than one input.
    // Count how many times each output CV (by ID) appears across all connections.
    const outputUseCounts = new Map<number, number>();
    connections.forEach(c => {
      const outId = c.a.id; // 'a' is always the output CV (from patch-detail-data.service logic)
      outputUseCounts.set(outId, (outputUseCounts.get(outId) ?? 0) + 1);
    });
    const multiplesCount = Array.from(outputUseCounts.values()).filter(count => count > 1).length;
    
    // Average cables per module: each cable has two endpoints, total endpoint
    // uses = totalCables * 2, divide by unique module count for a density figure.
    const avgCablesPerModule = uniqueModules > 0
      ? Math.round((totalCables * 2 / uniqueModules) * 10) / 10
      : 0;
    
    // Annotated: cable has a non-empty note
    const annotatedConnections = connections.filter(c => !!c.notes?.trim()).length;
    
    return {totalCables, uniqueModules, totalInstances, multiplesCount, avgCablesPerModule, annotatedConnections};
  }
}