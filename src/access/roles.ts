import type { Access, FieldAccess, PayloadRequest } from 'payload'

// There are two kinds of logged-in people: admins (the `users` collection,
// who manage content in /admin) and students (the `students` collection, who
// take quizzes). Every content-management permission must check for an admin
// specifically - "logged in" alone would let any student edit the site.

export const isAdminUser = (req: PayloadRequest): boolean => req.user?.collection === 'users'

export const isStudentUser = (req: PayloadRequest): boolean => req.user?.collection === 'students'

export const adminOnly: Access = ({ req }) => isAdminUser(req)

export const adminOnlyField: FieldAccess = ({ req }) => isAdminUser(req)

export const loggedInStudent: Access = ({ req }) => isStudentUser(req)

// Admins see everything; a student sees only their own rows, matched on the
// given relationship field (or their own document for the students collection).
export const adminOrOwn =
  (studentField: string = 'student'): Access =>
  ({ req }) => {
    if (isAdminUser(req)) return true
    if (isStudentUser(req) && req.user) return { [studentField]: { equals: req.user.id } }
    return false
  }

export const adminOrSelf: Access = ({ req }) => {
  if (isAdminUser(req)) return true
  if (isStudentUser(req) && req.user) return { id: { equals: req.user.id } }
  return false
}

// Only plain http(s) links - blocks `javascript:` and other URL schemes that
// could run code when an admin-entered or imported link is clicked.
export const validateHttpUrl = (value: unknown): true | string => {
  if (value === null || value === undefined || value === '') return true
  if (typeof value !== 'string') return 'Must be a link'
  try {
    const url = new URL(value)
    if (url.protocol === 'https:' || url.protocol === 'http:') return true
  } catch {
    // fall through
  }
  return 'Must be a full link starting with https://'
}
