import type { Atom } from 'solid-use/atom'
import type { Vec2, Vector2 } from 'three'
import type { AnchorX, AnchorY } from './ResizeModal'
import { faMap } from '@fortawesome/free-solid-svg-icons'
import Fa from 'solid-fa'
import { For, Show } from 'solid-js'
import { css } from 'solid-styled'
import { ResizeModal } from './ResizeModal'

export function LevelProps({ levelSize, floorTexture, resize, addNavMesh }: {
	levelSize: Atom<Vector2 | null>
	floorTexture: Atom<'grass' | 'planks' | null>
	resize: (anchorX: AnchorX, anchorY: AnchorY, mode: 'extend' | 'resize', size: Vec2) => void
	addNavMesh: () => void
}) {
	css/* css */`
	.props-inputs {
		display: grid;
		grid-template-columns: auto 1fr;
		padding:0 1rem;
		gap: 0 0.5rem;
	}
	.size-icon {
		padding: 0.5rem;
		background: var(--color-1);
		aspect-ratio: 1;
		text-align: center;
	}
	.level-buttons{
		display: grid;
		gap: 1rem;
		padding: 1rem;
	}
	`

	return (
		<section>
			<div class="title">Level Properties</div>
			<div class="level-buttons">
				<Show when={levelSize()}>
					{size => <ResizeModal resize={resize} size={size}></ResizeModal>}
				</Show>
				<button with-icon onClick={addNavMesh}>
					<Fa icon={faMap}></Fa>
					Generate NavMesh
				</button>
				<div class="props-inputs">
					Floor
					<select value={floorTexture() ?? undefined} onChange={e => floorTexture(e.target.value as 'grass' | 'planks')}>
						<For each={['grass', 'planks']}>
							{floor => <option value={floor}>{floor}</option>}
						</For>
					</select>
				</div>
			</div>
		</section>
	)
}