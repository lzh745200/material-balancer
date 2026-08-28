let counter = 0

/** 生成带前缀的短唯一 id（本地使用，无需全局唯一） */
export function uid(prefix: string): string {
  counter += 1
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`
}
