export interface ResponseAPI<Data> {
  message: string
  result?: Data
}

export interface UserResponse {
  message: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: any
}
