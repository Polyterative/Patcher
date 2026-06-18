import {
  GraphEdge,
  GraphNode
} from 'src/app/shared-interproject/components/@visual/graph-view/graph.component';

export interface PatchGraphSvgData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface PatchGraphSvgOptions {
  title?: string;
  emptyLabel?: string;
  backgroundColor?: string;
}

interface SvgNode extends GraphNode {
  cx: number;
  cy: number;
  radius: number;
}

interface SvgBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const SVG_UNIT = 48;
const EMPTY_VIEW_BOX = '0 0 100 100';
const DEFAULT_TITLE = 'Patch graph preview';
const DEFAULT_EMPTY_LABEL = 'No patch graph data';
const DEFAULT_BACKGROUND_COLOR = '#10151f';
const DEFAULT_TEXT_COLOR = '#f4f7fb';
const DEFAULT_LABEL_COLOR = '#d7dee8';
const DEFAULT_EDGE_COLOR = '#8ea0b8';
const DEFAULT_NODE_COLOR = '#667085';

export function renderPatchGraphSvg(
  graph: PatchGraphSvgData,
  options: PatchGraphSvgOptions = {}
): string {
  const title = options.title ?? DEFAULT_TITLE;
  const emptyLabel = options.emptyLabel ?? DEFAULT_EMPTY_LABEL;
  const backgroundColor = options.backgroundColor ?? DEFAULT_BACKGROUND_COLOR;
  const nodes = normalizeNodes(graph.nodes ?? []);

  if (nodes.length === 0) {
    return renderEmptySvg(title, emptyLabel, backgroundColor);
  }

  const nodeById = new Map(nodes.map(node => [node.id, node]));
  const visibleEdges = (graph.edges ?? [])
    .filter(edge => !edge.data?.hidden)
    .filter(edge => nodeById.has(edge.from) && nodeById.has(edge.to));
  const viewBox = buildViewBox(nodes);
  const edgeMarkup = visibleEdges
    .map((edge, index) => renderEdge(edge, index, nodeById))
    .join('');
  const nodeMarkup = nodes
    .map((node, index) => renderNode(node, index))
    .join('');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ viewBox }" role="img">`,
    `<title>${ escapeText(title) }</title>`,
    `<rect x="${ viewBox.split(' ')[0] }" y="${ viewBox.split(' ')[1] }" width="${ viewBox.split(' ')[2] }" height="${ viewBox.split(' ')[3] }" fill="${ escapeAttribute(backgroundColor) }" rx="18"/>`,
    `<g data-layer="edges">${ edgeMarkup }</g>`,
    `<g data-layer="nodes">${ nodeMarkup }</g>`,
    '</svg>'
  ].join('');
}

function normalizeNodes(nodes: GraphNode[]): SvgNode[] {
  return nodes
    .filter(node => Number.isFinite(node.x) && Number.isFinite(node.y))
    .map(node => ({
      ...node,
      cx: node.x * SVG_UNIT,
      cy: node.y * SVG_UNIT,
      radius: Math.max(5, node.size * 0.55)
    }));
}

function buildViewBox(nodes: SvgNode[]): string {
  const extents = nodes.reduce((acc, node) => {
    const labelBounds = estimateLabelBounds(node);
    return {
      minX: Math.min(acc.minX, node.cx - node.radius, labelBounds.minX),
      minY: Math.min(acc.minY, node.cy - node.radius, labelBounds.minY),
      maxX: Math.max(acc.maxX, node.cx + node.radius, labelBounds.maxX),
      maxY: Math.max(acc.maxY, node.cy + node.radius, labelBounds.maxY)
    };
  }, {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY
  });
  const padding = 32;
  const minX = extents.minX - padding;
  const minY = extents.minY - padding;
  const width = Math.max(1, extents.maxX - extents.minX + padding * 2);
  const height = Math.max(1, extents.maxY - extents.minY + padding * 2);

  return [minX, minY, width, height].map(formatNumber).join(' ');
}

function estimateLabelBounds(node: SvgNode): SvgBounds {
  const label = node.label || node.id;
  const fontSize = 12;
  const averageCharacterWidth = fontSize * 0.58;
  const halfWidth = Math.max(18, label.length * averageCharacterWidth / 2);
  const labelY = getNodeLabelY(node);

  return {
    minX: node.cx - halfWidth,
    minY: labelY,
    maxX: node.cx + halfWidth,
    maxY: labelY + fontSize
  };
}

function renderEdge(
  edge: GraphEdge,
  index: number,
  nodeById: Map<string, SvgNode>
): string {
  const from = nodeById.get(edge.from);
  const to = nodeById.get(edge.to);
  if (!from || !to) {
    return '';
  }

  const strokeWidth = formatNumber(Math.max(1.2, edge.size * 0.35));
  const label = edge.label || `${ from.label } → ${ to.label }`;
  const arrowHead = renderArrowHead(from, to, edge.color || DEFAULT_EDGE_COLOR);

  return [
    `<g data-edge-index="${ index }" data-edge-id="${ escapeAttribute(edge.id) }">`,
    `<line x1="${ formatNumber(from.cx) }" y1="${ formatNumber(from.cy) }" x2="${ formatNumber(to.cx) }" y2="${ formatNumber(to.cy) }" stroke="${ escapeAttribute(edge.color || DEFAULT_EDGE_COLOR) }" stroke-width="${ strokeWidth }" stroke-linecap="round">`,
    `<title>${ escapeText(label) }</title>`,
    '</line>',
    arrowHead,
    '</g>'
  ].join('');
}

function renderNode(node: SvgNode, index: number): string {
  const labelY = getNodeLabelY(node);
  const label = node.label || node.id;

  return [
    `<g data-node-index="${ index }" data-node-id="${ escapeAttribute(node.id) }">`,
    `<circle cx="${ formatNumber(node.cx) }" cy="${ formatNumber(node.cy) }" r="${ formatNumber(node.radius) }" fill="${ escapeAttribute(node.color || DEFAULT_NODE_COLOR) }" stroke="rgba(255,255,255,0.72)" stroke-width="1.5">`,
    `<title>${ escapeText(label) }</title>`,
    '</circle>',
    `<text x="${ formatNumber(node.cx) }" y="${ formatNumber(labelY) }" fill="${ DEFAULT_LABEL_COLOR }" font-size="12" text-anchor="middle" dominant-baseline="hanging">${ escapeText(label) }</text>`,
    '</g>'
  ].join('');
}

function getNodeLabelY(node: SvgNode): number {
  return node.cy + node.radius + 14;
}

function renderArrowHead(from: SvgNode, to: SvgNode, color: string): string {
  const deltaX = to.cx - from.cx;
  const deltaY = to.cy - from.cy;
  const length = Math.hypot(deltaX, deltaY);
  if (length === 0) {
    return '';
  }

  const unitX = deltaX / length;
  const unitY = deltaY / length;
  const tipX = to.cx - unitX * to.radius;
  const tipY = to.cy - unitY * to.radius;
  const arrowLength = 10;
  const arrowWidth = 7;
  const baseX = tipX - unitX * arrowLength;
  const baseY = tipY - unitY * arrowLength;
  const perpendicularX = -unitY;
  const perpendicularY = unitX;
  const leftX = baseX + perpendicularX * arrowWidth / 2;
  const leftY = baseY + perpendicularY * arrowWidth / 2;
  const rightX = baseX - perpendicularX * arrowWidth / 2;
  const rightY = baseY - perpendicularY * arrowWidth / 2;
  const points = [
    `${ formatNumber(tipX) },${ formatNumber(tipY) }`,
    `${ formatNumber(leftX) },${ formatNumber(leftY) }`,
    `${ formatNumber(rightX) },${ formatNumber(rightY) }`
  ].join(' ');

  return `<polygon points="${ points }" fill="${ escapeAttribute(color) }"/>`;
}

function renderEmptySvg(
  title: string,
  emptyLabel: string,
  backgroundColor: string
): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ EMPTY_VIEW_BOX }" role="img">`,
    `<title>${ escapeText(title) }</title>`,
    `<rect x="0" y="0" width="100" height="100" fill="${ escapeAttribute(backgroundColor) }" rx="12"/>`,
    `<text x="50" y="50" fill="${ DEFAULT_TEXT_COLOR }" font-size="8" text-anchor="middle" dominant-baseline="middle">${ escapeText(emptyLabel) }</text>`,
    '</svg>'
  ].join('');
}

function formatNumber(value: number): string {
  return Number(value.toFixed(3)).toString();
}

function escapeText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeAttribute(value: string): string {
  return escapeText(value);
}
