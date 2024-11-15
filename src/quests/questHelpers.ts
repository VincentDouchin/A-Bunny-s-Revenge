import type { Quest2 } from '@/constants/quests'
import type { Actor, Entity, QueryEntity } from '@/global/entity'
import type { app } from '@/global/states'
import type { AppStates, Plugin } from '@/lib/app'
import { toastEvent } from '@/global/events'
import { ecs, levelsData, questManager, tweens } from '@/global/init'
import { entries } from '@/utils/mapFunctions'
import { circIn } from 'popmotion'
import { CylinderGeometry, Group, Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from 'three'

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
export const addActors = (actors: Partial<Record<Actor, (e: QueryEntity<typeof actorsQuery>) => Entity | void>>) => (state: AppStates<typeof app>): Plugin<typeof app> => (app) => {
	app.addSubscribers(state, () => actorsQuery.onEntityAdded.subscribe((e) => {
		setActor(e, actors)
	}))
	app.onEnter(state, () => {
		for (const e of actorsQuery) {
			setActor(e, actors)
		}
	})
}

const questMarkerQuery = ecs.with('questMarker')

export const showMarker = ({ quest, step }: { quest: Quest2<any, any, any>, step: string }) => {
	return quest.showMarker(step)
}

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
	} else if (e.questMarkerContainer) {
		ecs.removeComponent(e, 'questMarkerContainer')
	}
}
export const addQuestMarkers = () => questMarkerQuery.onEntityAdded.subscribe(displayQuestMarker)

export const completeQuestStep = () => questManager.completeStepEvent.subscribe((questStep) => {
	toastEvent.emit({ type: 'questStep', description: questStep.description })
	for (const entity of questMarkerQuery) {
		displayQuestMarker(entity)
	}
})

export const displayUnlockQuestToast = () => questManager.unlockedQuestEvent.subscribe((quest) => {
	toastEvent.emit({ type: 'quest', quest: quest.name })

	for (const entity of questMarkerQuery) {
		displayQuestMarker(entity)
	}
})

const mapQuery = ecs.with('map')
export const isInMap = (map: string) => {
	const mapId = levelsData.levels.find(level => level.name === map)?.id
	for (const { map } of mapQuery) {
		if (map === mapId) {
			return true
		}
	}
	return false
}