import type { items } from '@assets/assets'
import { Event } from 'eventery'
import type { crops } from '@/constants/items'
import type { QuestMarkers } from '@/constants/quests'
import type { TutorialWindow } from '@/ui/Tutorial'

export const completeQuestStepEvent = new Event<[QuestMarkers]>()
export const harvestCropEvent = new Event<[string, crops]>()
export const cookedMealEvent = new Event<['oven' | 'cookingPot', items]>()
export const showTutorialEvent = new Event<[TutorialWindow]>()