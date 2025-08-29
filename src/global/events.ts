import type { crops } from '@/constants/items'
import type { Toast } from '@/ui/Toaster'
import type { TutorialWindow } from '@/ui/Tutorial'
import type { Object3D } from 'three'
import { Event } from 'eventery'
import { AssetNames } from './entity'

export const harvestCropEvent = new Event<[string, crops]>()
export const cookedMealEvent = new Event<['oven' | 'cookingPot', AssetNames['items']]>()
export const showTutorialEvent = new Event<[TutorialWindow]>()
export const errorEvent = new Event<[string]>()
export const toastEvent = new Event<[Toast]>()
export const keyItemEvent = new Event<[string, Object3D]>()
export const gameOverEvent = new Event<[boolean]>()