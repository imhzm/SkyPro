export interface ApiResponse<T = Record<string, unknown>> {
  success: boolean
  message?: string
  data?: T
  error?: string
}

export function successResponse<T = Record<string, unknown>>(data: T, message?: string): ApiResponse<T> {
  return { success: true, data, message }
}

export function errorResponse(message: string): ApiResponse {
  return { success: false, error: message }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (process.env.NODE_ENV === 'development') return error.message
  }
  return 'حدث خطأ غير متوقع'
}