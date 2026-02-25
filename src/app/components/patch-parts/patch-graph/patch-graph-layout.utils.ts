import { GraphNode } from 'src/app/shared-interproject/components/@visual/graph-view/graph.component';


export function orderPatchGraphNodesForReveal(nodes: GraphNode[]): GraphNode[] {
  const modules = nodes.filter(node => node.data?.type === 'module');
  if (modules.length === 0) {
    const total = Math.max(1, nodes.length);
    const radius = Math.max(2.2, Math.min(7.5, 2 + total / 8));
    
    return nodes.map((node, index) => {
      const angle = (index / total) * Math.PI * 2;
      return {
        ...node,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius
      };
    });
  }
  
  const moduleIds = new Set(modules.map(node => node.id));
  const childNodesByModule = new Map<string, GraphNode[]>();
  const ungroupedNodes: GraphNode[] = [];
  
  nodes.forEach(node => {
    if (node.data?.type === 'module') {
      return;
    }
    
    const parentModuleNodeId = node.data?.parentModuleNodeId as string | undefined;
    if (parentModuleNodeId && moduleIds.has(parentModuleNodeId)) {
      const list = childNodesByModule.get(parentModuleNodeId) ?? [];
      list.push(node);
      childNodesByModule.set(parentModuleNodeId, list);
      return;
    }
    
    ungroupedNodes.push(node);
  });
  
  const moduleTotal = Math.max(1, modules.length);
  const moduleRingRadius = Math.max(3.6, Math.min(9, 3.1 + moduleTotal * 0.55));
  const modulePositions = new Map<string, {
    x: number,
    y: number,
    angle: number
  }>();
  const orderedNodes: GraphNode[] = [];
  
  modules.forEach((moduleNode, index) => {
    const angle = (index / moduleTotal) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * moduleRingRadius;
    const y = Math.sin(angle) * moduleRingRadius;
    modulePositions.set(moduleNode.id, {
      x,
      y,
      angle
    });
    orderedNodes.push({...moduleNode, x, y});
  });
  
  modules.forEach(moduleNode => {
    const position = modulePositions.get(moduleNode.id);
    if (!position) {
      return;
    }
    
    const childNodes = [...(childNodesByModule.get(moduleNode.id) ?? [])].sort((a, b) => {
      const typeOrderA = a.data?.type === 'cv-out' ? 0 : 1;
      const typeOrderB = b.data?.type === 'cv-out' ? 0 : 1;
      if (typeOrderA !== typeOrderB) {
        return typeOrderA - typeOrderB;
      }
      
      return a.label.localeCompare(b.label);
    });
    
    if (childNodes.length === 0) {
      return;
    }
    
    const orbitRadius = Math.max(1, Math.min(2.1, 0.9 + childNodes.length * 0.09));
    const outNodes = childNodes.filter(node => node.data?.type === 'cv-out');
    const inNodes = childNodes.filter(node => node.data?.type === 'cv-in');
    
    const placeOnArc = (arcNodes: GraphNode[], centerAngle: number) => {
      if (arcNodes.length === 0) {
        return;
      }
      
      const arcSpread = Math.min(Math.PI * 0.95, 0.62 + arcNodes.length * 0.17);
      arcNodes.forEach((node, index) => {
        const t = arcNodes.length === 1
          ? 0
          : (index / (arcNodes.length - 1)) - 0.5;
        const angle = centerAngle + t * arcSpread;
        orderedNodes.push({
          ...node,
          x: position.x + Math.cos(angle) * orbitRadius,
          y: position.y + Math.sin(angle) * orbitRadius
        });
      });
    };
    
    placeOnArc(outNodes, position.angle);
    placeOnArc(inNodes, position.angle + Math.PI);
  });
  
  const ungroupedTotal = Math.max(1, ungroupedNodes.length);
  const ungroupedRadius = Math.max(1.2, Math.min(3.4, 1.3 + ungroupedTotal * 0.2));
  ungroupedNodes.forEach((node, index) => {
    const angle = (index / ungroupedTotal) * Math.PI * 2;
    orderedNodes.push({
      ...node,
      x: Math.cos(angle) * ungroupedRadius,
      y: Math.sin(angle) * ungroupedRadius
    });
  });
  
  return orderedNodes;
}