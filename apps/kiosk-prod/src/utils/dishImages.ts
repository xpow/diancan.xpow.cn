const imageModules = import.meta.glob('@/assets/images/products/*.jpg', { eager: true, query: '?url', import: 'default' })

const imageMap: Record<string, string> = {}
for (const [path, url] of Object.entries(imageModules)) {
  const match = path.match(/([^/\\]+)\.jpg$/)
  if (match) imageMap[match[1]] = url as string
}

const FALLBACK = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80'

export function getDishImage(dishId: string): string {
  return imageMap[dishId] || FALLBACK
}
