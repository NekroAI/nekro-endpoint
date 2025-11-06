import type { endpoints } from "../db/schema";

export type EndpointNode = typeof endpoints.$inferSelect;

/**
 * 路径树节点（仅包含基本信息，不包含 config）
 * - 真实节点：对应数据库中的端点
 * - 虚拟节点：路径中自动创建的目录节点
 */
export interface PathTreeNode {
  id: string; // 真实节点使用数据库ID，虚拟节点使用路径作为ID
  path: string; // 节点路径
  name: string; // 显示名称
  isVirtual: boolean; // 是否是虚拟目录节点
  endpoint?: {
    id: string;
    path: string;
    name: string;
    type: string;
    accessControl: string;
    isPublished: boolean;
    enabled: boolean;
  }; // 真实端点的基本信息（不包含 config）
  children: PathTreeNode[];
}

/**
 * 根据路径自动构建目录树
 * @param endpoints 端点列表
 * @returns 树形结构，按路径排序
 */
export function buildPathTree(endpoints: EndpointNode[]): PathTreeNode[] {
  const nodeMap = new Map<string, PathTreeNode>();
  const rootNodes: PathTreeNode[] = [];

  // 为每个端点创建节点和它的所有父级虚拟目录节点
  for (const endpoint of endpoints) {
    const pathParts = endpoint.path.split("/").filter(Boolean); // 移除空字符串

    let currentPath = "";
    let parentNode: PathTreeNode | null = null;

    // 遍历路径的每一部分，创建或获取节点
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      currentPath += `/${part}`;

      let node = nodeMap.get(currentPath);

      // 如果节点不存在，创建它
      if (!node) {
        const isLeaf = i === pathParts.length - 1; // 是否是路径的最后一部分

        if (isLeaf) {
          // 这是真实的端点节点（只包含基本信息）
          node = {
            id: endpoint.id,
            path: currentPath,
            name: endpoint.name, // 使用端点的名称
            isVirtual: false,
            endpoint: {
              id: endpoint.id,
              path: endpoint.path,
              name: endpoint.name,
              type: endpoint.type,
              accessControl: endpoint.accessControl,
              isPublished: endpoint.isPublished,
              enabled: endpoint.enabled,
            },
            children: [],
          };
        } else {
          // 这是虚拟的目录节点
          node = {
            id: currentPath, // 虚拟节点使用路径作为ID
            path: currentPath,
            name: part, // 目录节点显示路径部分
            isVirtual: true,
            children: [],
          };
        }

        nodeMap.set(currentPath, node);

        // 将节点添加到父节点或根节点
        if (parentNode) {
          parentNode.children.push(node);
        } else {
          rootNodes.push(node);
        }
      } else if (i === pathParts.length - 1 && !node.endpoint) {
        // 如果这是叶子节点，但之前创建为虚拟节点，现在更新为真实节点
        node.id = endpoint.id;
        node.name = endpoint.name;
        node.isVirtual = false;
        node.endpoint = {
          id: endpoint.id,
          path: endpoint.path,
          name: endpoint.name,
          type: endpoint.type,
          accessControl: endpoint.accessControl,
          isPublished: endpoint.isPublished,
          enabled: endpoint.enabled,
        };
      }

      parentNode = node;
    }
  }

  // 递归排序所有节点的子节点
  function sortChildren(nodes: PathTreeNode[]) {
    nodes.sort((a, b) => {
      // 虚拟目录节点排在前面
      if (a.isVirtual && !b.isVirtual) return -1;
      if (!a.isVirtual && b.isVirtual) return 1;
      // 按路径排序
      return a.path.localeCompare(b.path);
    });

    for (const node of nodes) {
      if (node.children.length > 0) {
        sortChildren(node.children);
      }
    }
  }

  sortChildren(rootNodes);

  return rootNodes;
}

/**
 * 从路径树中查找真实的端点节点
 * @param tree 路径树
 * @param endpointId 端点ID
 * @returns 找到的端点节点或 null
 */
export function findEndpointInTree(tree: PathTreeNode[], endpointId: string): PathTreeNode | null {
  for (const node of tree) {
    if (!node.isVirtual && node.id === endpointId) {
      return node;
    }
    if (node.children.length > 0) {
      const found = findEndpointInTree(node.children, endpointId);
      if (found) return found;
    }
  }
  return null;
}

/**
 * 获取所有真实的端点ID（排除虚拟目录节点）
 * @param tree 路径树
 * @returns 端点ID列表
 */
export function getAllEndpointIds(tree: PathTreeNode[]): string[] {
  const ids: string[] = [];

  function traverse(nodes: PathTreeNode[]) {
    for (const node of nodes) {
      if (!node.isVirtual && node.endpoint) {
        ids.push(node.endpoint.id);
      }
      if (node.children.length > 0) {
        traverse(node.children);
      }
    }
  }

  traverse(tree);
  return ids;
}
