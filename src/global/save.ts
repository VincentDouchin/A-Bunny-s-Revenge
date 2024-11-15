import type { crops, Item, Meals } from '@/constants/items'
import type { items } from '@assets/assets'
import type { With } from 'miniplex'
import type { Crop, Entity } from './entity'
import { trackStore } from '@solid-primitives/deep'
import { createScheduled, debounce } from '@solid-primitives/scheduled'
import { get, set } from 'idb-keyval'
import { createEffect } from 'solid-js'
import { createMutable, unwrap } from 'solid-js/store'
import { createObject } from 'solid-proxies'
import { Quaternion, Vector3 } from 'three'
import { context } from './context'
import { questManager } from './init'

const blankSettings = (): Settings => ({
	volume: 100,
	mute: false,
	fullscreen: null,
	controls: 'mouse',
	showControls: true,
	musicVolume: 100,
	musicMute: false,
	ambianceVolume: 100,
	ambianceMute: false,
	soundEffectsVolume: 100,
	soundEffectsMute: false,
	disableShadows: true,
	lockCamera: false,
	uiScale: 10,
	uiOpacity: 50,
	difficulty: 'normal',
})
// eslint-disable-next-line ts/consistent-type-definitions
export type Settings = {
	volume: number
	mute: boolean
	fullscreen: boolean | null
	controls: 'mouse' | 'keyboard'
	showControls: boolean
	musicVolume: number
	musicMute: boolean
	ambianceVolume: number
	ambianceMute: boolean
	soundEffectsVolume: number
	soundEffectsMute: boolean
	disableShadows: boolean
	lockCamera: boolean
	uiScale: number
	uiOpacity: number
	difficulty: 'normal' | 'easy'
}
export const useSettings = async () => {
	const existingSettings = await get<Settings>('settings')
	const settings = createObject<Settings>(existingSettings ?? blankSettings())
	const scheduled = createScheduled(fn => debounce(fn, 5000))
	createEffect(() => {
		if (scheduled()) {
			set('settings', { ...settings })
		}
	})
	return settings
}

// eslint-disable-next-line ts/consistent-type-definitions
export type SaveData = {
	crops: Record<string, NonNullable<Crop>>
	playerPosition: number[]
	playerRotation: number[]
	quests: Record<string, { steps: Record<string, boolean>, data: any, unlocked: boolean }>
	selectedSeed: null | crops
	inventories: Record<string, Item[]>
	modifiers: Meals[]
	unlockedRecipes: items[]
	unlockedPaths: number
	acorns: number
	started: boolean
	daytime: { current: number, dayToNight: boolean, timePassed: number, dayLight: number }
}
const blankSave = (): SaveData => ({
	crops: {},
	playerPosition: new Vector3().toArray(),
	playerRotation: new Quaternion().toArray(),
	quests: {},
	selectedSeed: null,
	inventories: {},
	modifiers: [],
	unlockedRecipes: [],
	unlockedPaths: 0,
	acorns: 0,
	started: false,
	daytime: { current: 0, dayToNight: true, timePassed: 0, dayLight: 0 },
})

export const useSave = async () => {
	const existingSave = await get<SaveData>('save')
	const save = createMutable(existingSave ?? blankSave())
	const scheduled = createScheduled(fn => debounce(fn, 2000))
	createEffect(() => {
		if (scheduled()) {
			trackStore(save)
			set(context.save, unwrap(save))
		}
	})
	const resetSave = (newSave: SaveData = blankSave()) => {
		Object.assign(save, newSave)

		questManager.enableQuests()
		return set(context.save, unwrap(save))
	}
	const addItem = async (entity: With<Entity, 'inventoryId' | 'inventory' | 'inventorySize'>, item: Item, stack = true) => {
		let wasAdded = false
		save.inventories[entity.inventoryId] ??= []
		const inventory = save.inventories[entity.inventoryId]

		const existingItem = inventory.find(it => it && it.name === item.name && stack)
		if (existingItem) {
			wasAdded = true
			existingItem.quantity += item.quantity
		} else {
			for (let i = 0; i < entity.inventorySize; i++) {
				if (inventory[i] === undefined) {
					inventory[i] = item
					wasAdded = true
					break
				}
			}
		}
		return wasAdded
	}
	const removeItem = (entity: With<Entity, 'inventoryId' | 'inventory' | 'inventorySize'>, item: Item, slot?: number) => {
		const inventory = save.inventories[entity.inventoryId]
		const existingItemIndex = inventory.findIndex((it, i) => it && it.name === item.name && (slot === undefined || i === slot))
		const existingItem = inventory[existingItemIndex]
		if (existingItem) {
			existingItem.quantity -= item.quantity
			if (existingItem.quantity <= 0) {
				delete inventory[existingItemIndex]
			}
		}
	}
	return { save, resetSave, addItem, removeItem }
}