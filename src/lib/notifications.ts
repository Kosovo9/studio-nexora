export const notify = async (userId: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
  // Stub implementation - replace with real notifications
  console.log('Notification:', { userId, message, type })
  return { success: true }
}

export const sendEmail = async (to: string, subject: string, body: string) => {
  console.log('Email:', { to, subject, body })
  return { success: true }
}