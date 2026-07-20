const imageModules = import.meta.glob('@/assets/images/products/*.jpg', { eager: true, query: '?url', import: 'default' })

const imageMap: Record<string, string> = {}
for (const [path, url] of Object.entries(imageModules)) {
  const match = path.match(/([^/\\]+)\.jpg$/)
  if (match) imageMap[match[1]] = url as string
}

const FALLBACK = imageMap['default'] || ''

export function getDishImage(dishId: string): string {
  return imageMap[dishId] || FALLBACK
}

export function getDishThumbnail(dishId: string): string {
  return imageMap[dishId + '_s'] || getDishImage(dishId)
}
