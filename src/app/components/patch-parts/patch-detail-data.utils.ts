import { Rack } from '../../models/rack';
import { PatchModuleInstance } from '../../models/connection';
import { Patch } from '../../models/patch';
import { LinkedRackUiState } from './patch-detail-data.models';

export const DEFAULT_LINKED_RACK_UI_STATE: LinkedRackUiState = {
  kind: 'unlinked',
  statusTone: 'neutral',
  statusLabel: 'Collection-first',
  description: 'No rack is linked yet. You can keep editing from your collection, or add a rack as optional spatial context whenever it helps.',
  rackId: null
};

export function groupInstancesByModuleId(instances: PatchModuleInstance[]): Map<number, PatchModuleInstance[]> {
  return instances.reduce((map, inst) => {
    const list = map.get(inst.module_id) ?? [];
    list.push(inst);
    return map.set(inst.module_id, list);
  }, new Map<number, PatchModuleInstance[]>());
}

export function buildLinkedRackUiState(
  patch: Patch | undefined,
  racks: Rack[],
  resolvedLinkedRack: Rack | null = null,
  isOwner = false,
  isLoggedIn = false
): LinkedRackUiState {
  if (!patch || patch.linked_rack_id == null) {
    return DEFAULT_LINKED_RACK_UI_STATE;
  }

  const linkedRack = resolvedLinkedRack ?? racks.find(rack => rack.id === patch.linked_rack_id);
  if (!linkedRack) {
    const description = isOwner
      ? 'This patch still remembers a linked rack, but that rack is no longer available. Choose another rack or clear the link without affecting the patch itself.'
      : isLoggedIn
        ? 'This patch references a linked rack, but that rack is not publicly available right now.'
        : 'This patch has a linked rack. Sign in to view it.';
    return {
      kind: 'unavailable',
      statusTone: 'warning',
      statusLabel: 'Rack unavailable',
      description,
      rackId: patch.linked_rack_id
    };
  }

  return {
    kind: 'linked',
    statusTone: 'positive',
    statusLabel: 'Linked rack active',
    description: 'The linked rack gives you spatial context while the patch still saves against your collection and patch-local copies.',
    rackName: linkedRack.name,
    rackId: linkedRack.id,
    rackImage: linkedRack.image
  };
}
