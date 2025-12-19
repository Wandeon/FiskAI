export type AuthStep = "identify" | "authenticate" | "register" | "verify" | "success"

export interface AuthFlowState {
  step: AuthStep
  email: string
  name: string
  isNewUser: boolean
  hasPasskey: boolean
  error: string | null
  isLoading: boolean
}

export interface UserInfo {
  exists: boolean
  emailVerified?: boolean
  hasPasskey?: boolean
  name?: string
  error?: string
}
