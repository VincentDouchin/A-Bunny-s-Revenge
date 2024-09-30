import type { Dialog } from '@/global/entity'

export const dialogs = {

} as const satisfies Partial<Record<string, (...args: any) => Dialog>>