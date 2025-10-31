export const track = (event: string, properties?: any) => {
  // Stub implementation - replace with real analytics
  console.log('Analytics:', event, properties)
}

export const identify = (userId: string, traits?: any) => {
  console.log('Identify:', userId, traits)
}

export const page = (name?: string, properties?: any) => {
  console.log('Page:', name, properties)
}