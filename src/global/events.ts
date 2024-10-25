import type { crops } from '@/constants/items'
import type { QuestMarkers } from '@/constants/quests'
import type { TutorialWindow } from '@/ui/Tutorial'
import type { items } from '@assets/assets'
import { Event } from 'eventery'

export const completeQuestStepEvent = new Event<[QuestMarkers]>()
export const harvestCropEvent = new Event<[string, crops]>()
export const cookedMealEvent = new Event<['oven' | 'cookingPot', items]>()
export const showTutorialEvent = new Event<[TutorialWindow]>()
export const errorEvent = new Event<[string]>()