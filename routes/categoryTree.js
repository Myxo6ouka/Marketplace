// Строит дерево из плоского списка категорий (parentId -> children)
function buildTree(categories) {
  const nodes = new Map();
  categories.forEach((c) => {
    const plain = typeof c.toJSON === 'function' ? c.toJSON() : c;
    nodes.set(plain.id, { id: plain.id, name: plain.name, parentId: plain.parentId, children: [] });
  });
  const roots = [];
  nodes.forEach((node) => {
    if (node.parentId && nodes.has(node.parentId)) nodes.get(node.parentId).children.push(node);
    else roots.push(node);
  });
  return roots;
}

// id категории + всех её потомков
function descendantIds(categories, rootId) {
  const byParent = new Map();
  categories.forEach((c) => {
    const key = c.parentId || 0;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(c.id);
  });
  const result = [];
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop();
    result.push(id);
    (byParent.get(id) || []).forEach((child) => stack.push(child));
  }
  return result;
}

module.exports = { buildTree, descendantIds };
