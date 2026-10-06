// Disabled: the template's demo seed wipes pages, posts, categories, media,
// forms and form submissions before inserting demo content. That must never
// be reachable on the live site, so this endpoint always refuses.
// Launch content is managed by src/seed/run.ts (`npm run seed`) instead.
export async function POST(): Promise<Response> {
  return new Response('Not found.', { status: 404 })
}
