import type { Atom } from 'solid-use/atom'
import type { LevelEntity } from '../types'
import { faTrash } from '@fortawesome/free-solid-svg-icons'
import Fa from 'solid-fa'
import { For } from 'solid-js'
import { css } from 'solid-styled'

export function EntityList({ hoveredEntity, selectedId, levelEntitiesData, removeEntity }: {
	hoveredEntity: Atom<string | null>
	selectedId: Atom<string | null>
	levelEntitiesData: Record<string, LevelEntity>
	removeEntity: (id: string) => void
}) {
	css/* css */`
	.entity-button{
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
	}
	.entity-buttons{
		display: grid;
	}
	.entity-label{
		text-overflow: ellipsis;
		overflow: clip;
	}
	`
	return (
		<section onMouseLeave={() => hoveredEntity(null)}>
			<div class="title">Entities List</div>
			<div class="entity-buttons">
				<For each={Object.entries(levelEntitiesData)}>
					{([id, data]) => (
						<div class="entity-button" onMouseOver={() => hoveredEntity(id)}>
							<button
								onClick={() => selectedId(id)}
								classList={{ selected: selectedId() === id }}
								class="entity-label"
							>
								<span>
									{data.category}
									{' '}
									-
									{' '}
									{data.model}
								</span>
							</button>
							<button onClick={() => removeEntity(id)}>
								<Fa icon={faTrash}></Fa>
							</button>
						</div>
					)}
				</For>
			</div>
		</section>
	)
}