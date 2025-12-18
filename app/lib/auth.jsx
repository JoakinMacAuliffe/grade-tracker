import { createAuthClient } from '@neondatabase/serverless'

export const authClient = createAuthClient({
    baseURL: process.env.NEXT
})