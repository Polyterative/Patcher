import {
  PatchConnection,
  PatchModuleInstance
} from 'src/app/models/connection';
import { DbModule } from 'src/app/models/module';
import { EditorModuleCard } from './patch-editor.types';

/**
 * Merge collection modules with instances into a flat list of editor cards.
 *
 * - Module with 0 instances → 1 card (no instanceId, no label)
 * - Module with 1 instance  → 1 card (instanceId set, no label)
 * - Module with N instances → N cards (each with instanceId + label "(1)", "(2)", …)
 */
export function buildEditorCards(
  modules: DbModule[],
  instances: PatchModuleInstance[],
  connections: PatchConnection[]
): EditorModuleCard[] {
  const cards: EditorModuleCard[] = [];
  const instancesByModule = new Map<number, PatchModuleInstance[]>();

  for (const inst of instances) {
    const list = instancesByModule.get(inst.module_id) || [];
    list.push(inst);
    instancesByModule.set(inst.module_id, list);
  }

  for (const module of modules) {
    const moduleInstances = instancesByModule.get(module.id) || [];
    const count = moduleInstances.length;

    if (count <= 1) {
      const inst = moduleInstances[0] ?? undefined;
      const instConns = inst
        ? connections.filter(c => c.instance_id_a === inst.id || c.instance_id_b === inst.id)
        : [];
      cards.push({
        module,
        instance: inst,
        label: undefined,
        instanceCount: count,
        connectionCount: instConns.length,
        connectionNames: buildConnectionNames(instConns, inst?.id),
        trackingId: -module.id
      });
    } else {
      moduleInstances.forEach((inst, idx) => {
        const instConns = connections.filter(
          c => c.instance_id_a === inst.id || c.instance_id_b === inst.id
        );
        cards.push({
          module,
          instance: inst,
          label: inst.instance_label || `(${ idx + 1 })`,
          instanceCount: count,
          connectionCount: instConns.length,
          connectionNames: buildConnectionNames(instConns, inst.id),
          trackingId: inst.id
        });
      });
    }
  }

  return cards;
}

export function buildConnectionNames(
  conns: PatchConnection[],
  instanceId: number | undefined
): string[] {
  if (!instanceId || conns.length === 0) return [];

  const names = conns.slice(0, 10).map(c => {
    const isA = c.instance_id_a === instanceId;
    const thisCv = isA ? c.a : c.b;
    const otherCv = isA ? c.b : c.a;
    return `${ thisCv.name } → ${ otherCv.module.name }: ${ otherCv.name }`;
  });

  if (conns.length > 10) {
    names.push(`… and ${ conns.length - 10 } more`);
  }

  return names;
}
