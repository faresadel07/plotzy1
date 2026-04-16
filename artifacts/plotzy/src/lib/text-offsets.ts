/**
 * Single source of truth for mapping between DOM caret positions and
 * global character offsets within a container element.
 *
 * "textContent-space": offsets correspond to indices in container.textContent,
 * which is the concatenation of all Text node .data values in tree order.
 * This is deterministic, CSS-independent, and survives DOM mutations that
 * preserve text content (e.g. wrapping/unwrapping <mark> elements).
 */

/**
 * Given a container and a caret position (node + local offset from caretRangeFromPoint),
 * return the global character offset in textContent-space.
 *
 * Handles both:
 * - caretNode is a Text node: localOffset is a character index within that node
 * - caretNode is an Element: localOffset is a child index; we resolve to the
 *   nearest text boundary
 */
export function textOffsetFromCaret(
  container: HTMLElement,
  caretNode: Node,
  localOffset: number
): number {
  // If caretNode is an element, resolve to a text node boundary
  if (caretNode.nodeType !== Node.TEXT_NODE) {
    const resolved = resolveElementToText(caretNode, localOffset);
    if (!resolved) return -1;
    caretNode = resolved.node;
    localOffset = resolved.offset;
  }

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let accumulated = 0;
  let node: Text | null;

  while ((node = walker.nextNode() as Text | null)) {
    if (node === caretNode) {
      return accumulated + localOffset;
    }
    accumulated += node.data.length;
  }

  // caretNode not found in container
  return -1;
}

/**
 * Inverse of textOffsetFromCaret.
 * Given a global character offset in textContent-space, return the
 * Text node and local offset within that node.
 */
export function caretFromTextOffset(
  container: HTMLElement,
  globalOffset: number
): { node: Text; offset: number } | null {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let accumulated = 0;
  let node: Text | null;

  while ((node = walker.nextNode() as Text | null)) {
    const len = node.data.length;
    if (accumulated + len >= globalOffset) {
      return { node, offset: globalOffset - accumulated };
    }
    accumulated += len;
  }

  return null;
}

/**
 * When caretRangeFromPoint returns an Element node (not a Text node),
 * the offset is a child index. Resolve this to the nearest text node boundary.
 */
function resolveElementToText(
  elementNode: Node,
  childIndex: number
): { node: Text; offset: number } | null {
  const children = elementNode.childNodes;
  if (children.length === 0) return null;

  // If childIndex points past the last child, we want the END of the last text node
  if (childIndex >= children.length) {
    // Walk backwards to find the last text node
    for (let i = children.length - 1; i >= 0; i--) {
      const last = lastTextNode(children[i]);
      if (last) return { node: last, offset: last.data.length };
    }
    return null;
  }

  // childIndex points to a specific child — find the first text node at or after it
  const child = children[childIndex];
  if (child.nodeType === Node.TEXT_NODE) {
    return { node: child as Text, offset: 0 };
  }

  // Walk into the child to find its first text descendant
  const first = firstTextNode(child);
  if (first) return { node: first, offset: 0 };

  // No text in this child — try previous siblings (end of previous text)
  for (let i = childIndex - 1; i >= 0; i--) {
    const last = lastTextNode(children[i]);
    if (last) return { node: last, offset: last.data.length };
  }

  return null;
}

function firstTextNode(root: Node): Text | null {
  if (root.nodeType === Node.TEXT_NODE) return root as Text;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  return walker.nextNode() as Text | null;
}

function lastTextNode(root: Node): Text | null {
  if (root.nodeType === Node.TEXT_NODE) return root as Text;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let last: Text | null = null;
  let n: Text | null;
  while ((n = walker.nextNode() as Text | null)) last = n;
  return last;
}

/**
 * Dev-mode assertion: verify that the two functions are inverses.
 * Call after every selection to catch drift immediately.
 */
export function assertOffsetsConsistent(
  container: HTMLElement,
  globalOffset: number
): void {
  if (process.env.NODE_ENV === "production") return;
  const caret = caretFromTextOffset(container, globalOffset);
  if (!caret) {
    console.error(`[text-offsets] caretFromTextOffset returned null for offset ${globalOffset}`);
    return;
  }
  const roundTrip = textOffsetFromCaret(container, caret.node, caret.offset);
  if (roundTrip !== globalOffset) {
    console.error(
      `[text-offsets] INVERSE VIOLATION: input=${globalOffset}, caretFromTextOffset→(node="${caret.node.data.slice(0, 20)}...", offset=${caret.offset}), textOffsetFromCaret→${roundTrip}`
    );
  }
}
