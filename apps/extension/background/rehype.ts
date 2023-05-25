// @ts-nocheck Rehype plugin

import type { Plugin } from "unified";
import type { Node } from "unist";

import { visit } from "unist-util-visit";

function extractPre(node): Node | undefined {
  if (node.tagName === "pre") {
    return node;
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      const pre = extractPre(child);
      if (pre) {
        return pre;
      }
    }
  }
}

export const rehypeCustom: Plugin = () => (tree) => {
  visit(tree, "element", (node, index, parent) => {
    if (node.tagName === "code-block") {
      const pre = extractPre(node);
      if (pre) {
        parent.children[index] = pre;
      } else {
        parent.children.splice(index, 1);
      }
    }
  });
};
