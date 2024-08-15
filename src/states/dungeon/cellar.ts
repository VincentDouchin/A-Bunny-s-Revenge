import { dialogs } from '@/constants/dialogs'
import { Faction, Interactable } from '@/global/entity'
import { ecs } from '@/global/init'
import type { DungeonRessources } from '@/global/states'
import type { Subscriber } from '@/lib/state'
import { getRandom } from '@/utils/mapFunctions'

const enemiesQuery = ecs.with('faction').where(e => e.faction === Faction.Enemy)
const cratesQuery = ecs.with('crate').without('interactable')
const cratesToOpenQuery = ecs.with('crate').with('interactable', 'onPrimary')
export const addcrateInteractable: Subscriber<DungeonRessources> = ressources => enemiesQuery.onEntityRemoved.subscribe(() => {
	if (enemiesQuery.size === 1 && ressources.dungeon.plan.type === 'cellar') {
		const cauldronCrate = getRandom(cratesQuery.entities)
		for (const crate of cratesQuery) {
			ecs.update(crate, {
				interactable: Interactable.Open,
				onPrimary() {
					ecs.removeComponent(crate, 'onPrimary')
					ecs.removeComponent(crate, 'interactable')
					ecs.add({
						dialog: dialogs.cellar(crate, cauldronCrate, cratesToOpenQuery),
					})
				},
			})
		}
	}
})