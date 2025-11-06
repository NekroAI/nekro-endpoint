import type { endpoints } from "../db/schema";

export type EndpointNode = typeof endpoints.$inferSelect;

export interface TreeNode extends EndpointNode {
  children?: TreeNode[];
}

/**
 * 检测循环引用
 * @param nodes 所有端点节点
 * @param nodeId 当前节点 ID
 * @param newParentId 新的父节点 ID
 * @returns 是否存在循环引用
 */
export function checkCircularReference(nodes: EndpointNode[], nodeId: string, newParentId: string | null): boolean {
  if (!newParentId) {
    return false; // 移动到根节点，不会有循环引用
  }

  if (nodeId === newParentId) {
    return true; // 不能将节点设置为自己的父节点
  }

  // 检查 newParentId 是否是 nodeId 的子孙节点
  const visited = new Set<string>();
  let currentId: string | null = newParentId;

  while (currentId) {
    if (currentId === nodeId) {
      return true; // 发现循环
    }

    if (visited.has(currentId)) {
      break; // 已经检查过这个节点，避免无限循环
    }

    visited.add(currentId);
    const node = nodes.find((n) => n.id === currentId);
    currentId = node?.parentId ?? null;
  }

  return false;
}

/**
 * 将扁平的端点列表构建为树形结构
 * @param nodes 端点节点列表
 * @param parentId 父节点 ID（默认为 null，即根节点）
 * @returns 树形结构，按名称字母顺序排列
 */
export function buildTree(nodes: EndpointNode[], parentId: string | null = null): TreeNode[] {
  const children = nodes
    .filter((node) => node.parentId === parentId)
    .sort((a, b) => {
      // 首先按 sortOrder 排序（如果用户手动调整了顺序）
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      // 其次按名称字母顺序排序
      return a.name.localeCompare(b.name, "zh-CN");
    })
    .map((node) => ({
      ...node,
      children: buildTree(nodes, node.id),
    }));

  return children;
}

/**
 * 将树形结构扁平化为列表
 * @param tree 树形结构
 * @returns 扁平化的端点列表
 */
export function flattenTree(tree: TreeNode[]): EndpointNode[] {
  const result: EndpointNode[] = [];

  function traverse(nodes: TreeNode[]) {
    for (const node of nodes) {
      const { children, ...nodeWithoutChildren } = node;
      result.push(nodeWithoutChildren);

      if (children && children.length > 0) {
        traverse(children);
      }
    }
  }

  traverse(tree);
  return result;
}

/**
 * 获取节点的所有祖先节点 ID
 * @param nodes 所有端点节点
 * @param nodeId 当前节点 ID
 * @returns 祖先节点 ID 列表（从根到父节点）
 */
export function getAncestors(nodes: EndpointNode[], nodeId: string): string[] {
  const ancestors: string[] = [];
  let currentId: string | null = nodeId;

  while (currentId) {
    const node = nodes.find((n) => n.id === currentId);
    if (!node) break;

    if (node.parentId) {
      ancestors.unshift(node.parentId);
    }
    currentId = node.parentId;
  }

  return ancestors;
}

/**
 * 获取节点的所有后代节点 ID
 * @param nodes 所有端点节点
 * @param nodeId 当前节点 ID
 * @returns 后代节点 ID 列表
 */
export function getDescendants(nodes: EndpointNode[], nodeId: string): string[] {
  const descendants: string[] = [];

  function traverse(currentNodeId: string) {
    const children = nodes.filter((n) => n.parentId === currentNodeId);
    for (const child of children) {
      descendants.push(child.id);
      traverse(child.id);
    }
  }

  traverse(nodeId);
  return descendants;
}
