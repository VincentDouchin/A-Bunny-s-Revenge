import type { Entity } from '@/global/entity'
import type { With } from 'miniplex'
import type { Atom } from 'solid-use/atom'
import { ecs } from '@/global/init'
import { useQuery } from '@/ui/store'
import { For } from 'solid-js'
import { css } from 'solid-styled'

export const EntitiesSelector = ({ selectedEntity }: { selectedEntity: Atom<With<Entity, 'entityId' | 'model' | 'position' | 'rotation'> | null> }) => {
	const query = useQuery(ecs.with('entityId', 'model', 'position', 'rotation'))
	css/* css */`
	.entities-container{
		display:grid;
	}`
	const outline = (entity: With<Entity, 'entityId' | 'model' | 'position' | 'rotation'>) => {
		selectedEntity(null)
		selectedEntity(entity)
		for (const e of query()) {
			if (e.outline && e !== entity) {
				ecs.removeComponent(e, 'outline')
			}
			ecs.addComponent(entity, 'outline', true)
		}
	}
	return (
		<div class="entities-container">
			<For each={query().toSorted()}>
				{(entity) => {
					return <button onClick={() => outline(entity)}>{entity.entityId}</button>
				}}
			</For>
		</div>
	)
}