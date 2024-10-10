import type { items } from '@assets/assets'
import { circIn } from 'popmotion'
import { CylinderGeometry, Group, Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from 'three'
import { Event } from 'eventery'
import type { Item } from '@/constants/items'
import type { QuestMarkers, QuestName, QuestStepKey } from '@/constants/quests'
import { quests } from '@/constants/quests'
import { recipes } from '@/constants/recipes'
import type { Actor, Entity, QueryEntity } from '@/global/entity'
import { completeQuestStepEvent } from '@/global/events'
import { ecs, save, tweens } from '@/global/init'
import type { State } from '@/lib/state'
import { addToast } from '@/ui/Toaster'
import { playerInventoryQuery, removeItemFromPlayer, unlockRecipe } from '@/utils/dialogHelpers'
import { entries } from '@/utils/mapFunctions'

const actorsQuery = ecs.with('actor', 'position', 'rotation')

const setActor = (e: QueryEntity<typeof actorsQuery>, actors: Partial<Record<Actor, (e: QueryEntity<typeof actorsQuery>) => Entity | void>>) => {
	for (const [actor, fn] of entries(actors)) {
		if (e.actor === actor && fn) {
			const entity = fn(e)
			if (entity) {
				delete entity.actor
				ecs.update(e, entity)
			}
		}
	}
}
export const addActors = (actors: Partial<Record<Actor, (e: QueryEntity<typeof actorsQuery>) => Entity | void>>) => (s: State) => {
	s.addSubscriber(() => actorsQuery.onEntityAdded.subscribe((e) => {
		setActor(e, actors)
	}))
	s.onEnter(() => {
		for (const e of actorsQuery) {
			setActor(e, actors)
		}
	})
}
export const canCompleteQuest = (name: QuestName) => {
	const player = playerInventoryQuery.first
	if (player) {
		return quests[name].steps.every((step) => {
			return save.quests[name]?.steps[step.key] === true || step.items?.every((item: Item) => {
				return player.inventory.some((saveItem) => {
					return saveItem && saveItem.name === item.name && saveItem.quantity >= item.quantity
				})
			})
		})
	}
}

export const completeQuest = <Q extends QuestName>(name: Q) => {
	if (canCompleteQuest(name)) {
		const quest = save.quests[name]
		if (quest) {
			for (let i = 0; i < quests[name].steps.length; i++) {
				const step = quests[name].steps[i]
				const key: QuestStepKey<Q> = step.key
				for (const item of step.items ?? []) {
					removeItemFromPlayer(item)
				}
				quest.steps[key] = true
			}
			quests[name].state.disable()
		}
	}
}
export const showMarker = <T extends QuestName>(name: QuestMarkers) => {
	const [questName, key] = name.split('#') as [T, QuestStepKey<T>]
	const savedQuest = save.quests[questName]
	if (savedQuest) {
		const index = quests[questName].steps.findIndex(step => step.key === key)
		const prevKey: QuestStepKey<T> | undefined = quests[questName].steps[index - 1]?.key
		if (index === 0) {
			return quests[questName].unlock()
		} else {
			return savedQuest.steps[prevKey] && !savedQuest.steps[key]
		}
	} else {
		return false
	}
}

const questMarkerQuery = ecs.with('questMarker')
export const displayQuestMarker = (e: QueryEntity<typeof questMarkerQuery>) => {
	if (e.questMarker.some(showMarker)) {
		const questMarkerContainer = new Group()
		const mat = new MeshBasicMaterial({ color: 0xFFFF33, depthWrite: false })
		const dot = new Mesh(new SphereGeometry(0.5), mat)
		const line = new Mesh(new CylinderGeometry(0.5, 0.5, 4), mat)
		line.position.setY(3)

		if (e.rotation) {
			questMarkerContainer.rotation.setFromQuaternion(e.rotation.clone().invert())
		}
		questMarkerContainer.add(dot)
		questMarkerContainer.add(line)
		if (e.questMarkerPosition) {
			questMarkerContainer.position.copy(e.questMarkerPosition.clone())
		} else {
			questMarkerContainer.position.setY(15)
		}
		questMarkerContainer.renderOrder = 100
		tweens.add({
			from: line.scale.clone(),
			to: new Vector3(2, 0.5, 2),
			duration: 500,
			parent: e,
			ease: circIn,
			repeat: Number.POSITIVE_INFINITY,
			repeatType: 'mirror',
			onUpdate: (f) => {
				line.scale.copy(f)
				line.position.setY(3 + (4 * f.y) / 2)
			},
		})
		ecs.update(e, { questMarkerContainer })
	}
}
export const addQuestMarkers = () => questMarkerQuery.onEntityAdded.subscribe(displayQuestMarker)
export const addQuest = async <Name extends QuestName>(name: Name) => {
	if (!(name in save.quests)) {
		save.quests[name] = {
			steps: quests[name].steps.reduce((acc, v) => ({ ...acc, [v.key]: false }), {} as Record<QuestStepKey<Name>, false>),
			data: quests[name].data(),
		}
		const toUnlock: items[] = []
		for (const step of quests[name].steps) {
			for (const item of step.items as unknown as Item[]) {
				if (!save.unlockedRecipes.includes(item.name) && recipes.some(r => r.output.name === item.name)) {
					toUnlock.push(item.name)
				}
			}
		}
		for (const unlockedRecipe of toUnlock) {
			unlockRecipe(unlockedRecipe)
		}
		for (const npc of questMarkerQuery) {
			const marker = npc.questMarker.find(q => q.split('#')[0] === name)
			if (marker) {
				const markers = [...npc.questMarker].filter(m => m !== marker)
				ecs.removeComponent(npc, 'questMarker')
				ecs.removeComponent(npc, 'questMarkerContainer')
				ecs.addComponent(npc, 'questMarker', markers)
			}
		}
		if (quests[name].state.disabled) quests[name].state.enable()
		addToast({ type: 'quest', quest: name })
	}
}

export const completeQuestStep = <Q extends QuestName>(questName: Q, step: QuestStepKey<Q>) => {
	const quest = save.quests[questName]
	if (quest) {
		const index = quests[questName].steps.findIndex(s => s.key === step)
		quest.steps[step] = true
		addToast({ type: 'questStep', step: quests[questName].steps[index] })
		for (const entity of questMarkerQuery) {
			displayQuestMarker(entity)
			if (entity.questMarker.includes(`${questName}#${step}`)) {
				ecs.removeComponent(entity, 'questMarkerContainer')
			}
		}
		completeQuestStepEvent.emit(`${questName}#${step}`)
		if (Object.values(quest.steps).every(s => s === true)) {
			quests[questName].state.disable()
		}
	}
}

export const hasCompletedQuest = (name: QuestName) => {
	return Boolean(save.quests[name]) && Object.values(save.quests[name]?.steps ?? {})?.every(step => step === true)
}

export const hasCompletedStep = <Q extends QuestName>(questName: Q, step: QuestStepKey<Q>) => {
	return save.quests[questName]?.steps[step]
}

export const hasQuest = <T extends QuestName>(name: QuestMarkers) => {
	const [quest, key] = name.split('#') as [T, QuestStepKey<T>]
	return quest in save.quests && save.quests[quest]?.steps[key]
}

export const isQuestActive = (name: QuestName) => {
	return save.quests[name] && Object.values(save.quests[name]?.steps ?? {})?.some(s => s === false)
}

export const enableQuests = async () => {
	for (const quest of Object.keys(quests) as QuestName[]) {
		if (isQuestActive(quest) && quests[quest].state) {
			await quests[quest].state.enable()
		}
	}
}

interface Step {
	name: string
	description: string
	items: Item[]
}
export class Quest<S extends string = never> {
	steps: Step[] = []
	events: { [key: string]: Event<[void]> } = {}
	constructor(public name: string) { }
	addStep<s extends string>(name: s, description: string, items: Item[] = []) {
		this.steps.push({ name, description, items })
		this.events[name] = new Event()
		return this as unknown as Quest<S | s>
	}

	hasCompleted(step: S) {
		return save.quests[this.name].steps[step]
	}

	onCompleteStep(step: S, fn: () => void) {
		this.events[step]?.subscribe(fn)
		return this
	}

	completeStep(step: S) {
		save.quests[this.name].steps[step] = true
	}
}
