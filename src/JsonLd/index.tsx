// Renders a schema.org JSON-LD block. JSON.stringify already escapes quotes,
// but we also escape "<" so a value like a title containing "</script>" can
// never break out of the script tag.
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c')

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: json }}
    />
  )
}
