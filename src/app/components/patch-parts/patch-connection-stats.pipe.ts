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
    
    return {totalCables, uniqueModules, multiplesCount};
  }
}