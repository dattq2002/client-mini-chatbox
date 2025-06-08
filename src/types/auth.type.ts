import { type ResponseAPI } from './utils.type'

export type AuthResponse = ResponseAPI<{
  access_token: string
  refresh_token: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: any
}>
