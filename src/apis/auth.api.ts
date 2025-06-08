import type { AuthResponse } from '../types/auth.type'
import http from '../utils/http'

export const RegisterAccount = (body: { username: string; password: string; confirm_password: string }) =>
  http.post<AuthResponse>('/auth/register', body)

export const LoginAccount = (body: { username: string; password: string }) =>
  http.post<AuthResponse>('/auth/login', body)
