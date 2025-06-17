import type { UserResponse } from '../types/utils.type'
import http from '../utils/http'

export const SearchAllUser = () => http.get<UserResponse>(`/user/`)

export const GetAllMessage = (body: { senderId: string; receiverId: string }) =>
  http.post<UserResponse>(`/user/chatting/all`, body)

// export const SendAudio
