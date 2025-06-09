import type { UserResponse } from '../types/utils.type'
import http from '../utils/http'

export const SearchAllUser = () => http.get<UserResponse>(`/user/`)
