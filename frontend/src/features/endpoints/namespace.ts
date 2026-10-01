import type { EndpointView } from "./model";

/**
 * The namespace is derived from paths, exactly like the execution layer sees
 * it: "/configs/app.json" lives under the "/configs" directory whether or not
 * an endpoint exists at "/configs". A node can be both an endpoint and a
 * directory (e.g. "/gh" with "/gh/raw").
 */
export type NamespaceNode = {
  path: string; // "" for the root
  segment: string;
  endpoint?: EndpointView;
  children: NamespaceNode[];
  /** Endpoints at or below this node. */
  count: number;
};

export function buildNamespace(endpoints: EndpointView[]): NamespaceNode {
  const root: NamespaceNode = { path: "", segment: "", children: [], count: 0 };
  const byPath = new Map<string, NamespaceNode>([["", root]]);

  const ensure = (path: string): NamespaceNode => {
    const existing = byPath.get(path);
    if (existing) return existing;
    const parentPath = path.slice(0, path.lastIndexOf("/"));
    const parent = ensure(parentPath);
    const node: NamespaceNode = { path, segment: path.slice(path.lastIndexOf("/") + 1), children: [], count: 0 };
    parent.children.push(node);
    byPath.set(path, node);
    return node;
  };

  for (const endpoint of endpoints) ensure(endpoint.path).endpoint = endpoint;

  const finalize = (node: NamespaceNode): number => {
    node.children.sort(
      (a, b) =>
        (a.endpoint?.sortOrder ?? 0) - (b.endpoint?.sortOrder ?? 0) ||
        a.segment.localeCompare(b.segment, "zh-Hans-CN", { numeric: true }),
    );
    node.count = (node.endpoint ? 1 : 0) + node.children.reduce((sum, child) => sum + finalize(child), 0);
    return node.count;
  };
  finalize(root);
  return root;
}

export function findNode(root: NamespaceNode, path: string): NamespaceNode | undefined {
  if (!path || path === "/") return root;
  let node: NamespaceNode | undefined = root;
  for (const segment of path.split("/").filter(Boolean)) {
    node = node?.children.find((child) => child.segment === segment);
    if (!node) return undefined;
  }
  return node;
}

export function flatten(root: NamespaceNode): NamespaceNode[] {
  const out: NamespaceNode[] = [];
  const walk = (node: NamespaceNode) => {
    for (const child of node.children) {
      out.push(child);
      walk(child);
    }
  };
  walk(root);
  return out;
}
