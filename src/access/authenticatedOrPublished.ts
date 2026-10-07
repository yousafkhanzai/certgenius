import type { Access } from 'payload'

// Admins see drafts too; everyone else (guests and students) only sees published documents.
export const authenticatedOrPublished: Access = ({ req: { user } }) => {
  if (user?.collection === 'users') {
    return true
  }

  return {
    _status: {
      equals: 'published',
    },
  }
}
