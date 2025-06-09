import { type ResponseAPI } from './utils.type'

export type AuthResponse = ResponseAPI<{
  access_token: string
  refresh_token: string
  user_id: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  users: any
  name: string
}>
