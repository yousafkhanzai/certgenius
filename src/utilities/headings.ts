// Helpers for linking to sections of a blog post (study guide).

type LexicalNode = { type?: string; tag?: string; text?: string; children?: LexicalNode[] }

export const headingId = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80)

export const nodeText = (node: LexicalNode): string =>
  typeof node.text === 'string' ? node.text : (node.children || []).map(nodeText).join('')

// The h2 headings of a post, in order: these are the topics a guide covers.
export function postHeadings(content: unknown): { text: string; id: string }[] {
  const root = (content as { root?: LexicalNode } | null | undefined)?.root
  if (!root?.children) return []
  return root.children
    .filter((n) => n.type === 'heading' && n.tag === 'h2')
    .map((n) => nodeText(n).trim())
    .filter((text) => text && !/^exam tips?$/i.test(text))
    .map((text) => ({ text, id: headingId(text) }))
}
