// Small helper to build minimal Lexical rich-text JSON from plain paragraphs,
// so seed content doesn't have to hand-write the full editor JSON shape.

type LexicalParagraph = {
  type: 'paragraph'
  children: Array<{
    type: 'text'
    detail: number
    format: number
    mode: 'normal'
    style: string
    text: string
    version: number
  }>
  direction: 'ltr'
  format: ''
  indent: number
  version: number
}

type LexicalHeading = {
  type: 'heading'
  tag: 'h2' | 'h3'
  children: LexicalParagraph['children']
  direction: 'ltr'
  format: ''
  indent: number
  version: number
}

const textNode = (text: string) => ({
  type: 'text' as const,
  detail: 0,
  format: 0,
  mode: 'normal' as const,
  style: '',
  text,
  version: 1,
})

export const paragraph = (text: string): LexicalParagraph => ({
  type: 'paragraph',
  children: [textNode(text)],
  direction: 'ltr',
  format: '',
  indent: 0,
  version: 1,
})

export const heading = (text: string, tag: 'h2' | 'h3' = 'h2'): LexicalHeading => ({
  type: 'heading',
  tag,
  children: [textNode(text)],
  direction: 'ltr',
  format: '',
  indent: 0,
  version: 1,
})

export const richText = (blocks: Array<LexicalParagraph | LexicalHeading>) => ({
  root: {
    type: 'root',
    children: blocks,
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    version: 1,
  },
})
