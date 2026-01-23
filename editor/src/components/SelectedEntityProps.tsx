import type { Atom } from 'solid-use/atom'
import type { AssetData, LevelEntity } from '../types'
import { faArrowRotateBack, faClone, faLink, faLinkSlash, faTrash } from '@fortawesome/free-solid-svg-icons'
import Fa, { } from 'solid-fa'
import { createMemo, For, Show } from 'solid-js'
import { css } from 'solid-styled'
import { Euler, Quaternion } from 'three'

export function SelectedEntityProps({ destroy, entity, update, applyGlobalScale, assetData, scaleLock, resetScale, resetGlobalScale, duplicate }: {
	destroy: () => void
	entity: LevelEntity
	assetData?: AssetData
	update: () => void
	applyGlobalScale: () => void
	scaleLock: Atom<boolean>
	resetScale: () => void
	duplicate: () => void
	resetGlobalScale: () => void
}) {
	const setGrid = (key: keyof NonNullable<LevelEntity['grid']>) => (e: Event & {
		currentTarget: HTMLInputElement
		target: HTMLInputElement
	}) => {
		entity.grid ??= {
			repetitionX: 0,
			repetitionY: 0,
			spacingX: 0,
			spacingY: 0,
			[key]: e.target.valueAsNumber,
		}
		entity.grid[key] = e.target.valueAsNumber
		if (entity.grid.repetitionX === 0 && entity.grid.repetitionY === 0) {
			delete entity.grid
		}
		update()
	}
	const updateScale = (index: number, value: number, model: LevelEntity | AssetData, global: boolean) => {
		if (scaleLock()) {
			model.scale = [value, value, value]
		} else if (model.scale) {
			model.scale[index] = value
		}
		update()
		if (global) applyGlobalScale()
	}
	const updatePosition = (index: number, value: number) => {
		entity.position[index] = value
		update()
	}
	const eulerAngle = createMemo(() => {
		const euler =	new Euler().setFromQuaternion(new Quaternion().fromArray(entity.rotation))
		return [euler.x, euler.y, euler.z].map(x => x / Math.PI * 360)
	})
	const updateRotation = (index: number, value: number) => {
		const val = value / 360 * Math.PI
		const eulerAngleValue = eulerAngle().map((x, i) => i === index ? val : x) as [number, number, number]
		const quaternion = new Quaternion().setFromEuler(new Euler().set(...eulerAngleValue))
		entity.rotation = quaternion.toArray()
		update()
	}
	css/* css */`
	.icon-button{
		padding: 0.5rem;
		width: 100%;
		display: grid;
		place-items: center;
	}
	.button-content{
		display: flex;
		place-items: center;
		gap: 0.5rem;
	}
	.grid-inputs{
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 1rem;
		place-items: center;
		white-space: nowrap;
		padding: 0.5rem;
		background: var(--color-1);
	}
	.grid-inputs input{
		height: 100%;
		width: 5rem;
	}
	.selected-entity-props-buttons{
		display: grid;
	}
	.vec-display{
		display: grid;
		place-items: center;
		padding: 0.5rem;
	}
	.vec-display > div{
		display: grid;
		grid-template-columns: 1fr 1fr;
		place-items: center;

	}
	`
	return (
		<>
			<section class="selected-entity-props-buttons">
				<button class="icon-button" onClick={duplicate}>
					<div class="button-content">
						Clone
						<Fa icon={faClone} />
					</div>
				</button>
				<button class="icon-button" onClick={destroy}>
					<div class="button-content">
						Remove
						<Fa icon={faTrash} />
					</div>
				</button>
				<button
					class="icon-button"
					onClick={() => {
						entity.grounded = !entity.grounded
						update()
					}}
					classList={{ selected: entity.grounded }}
				>
					<div class="button-content">
						Grounded
						<Fa icon={entity.grounded ? faLink : faLinkSlash} />
					</div>
				</button>
			</section>
			<section>
				<div class="title">
					Position
				</div>
				<div class="vec-display">
					<For each={['X', 'Y', 'Z']}>
						{(axis, index) => (
							<div>
								{axis}
								<input
									disabled={axis === 'Y' && entity.grounded}
									type="number"
									value={entity.position[index()].toFixed(1)}
									onChange={e => updatePosition(index(), e.target.valueAsNumber)}
								/>

							</div>
						)}
					</For>
				</div>
			</section>
			<section>
				<div class="title">
					Rotation
				</div>
				<div class="vec-display">
					<For each={['x', 'y', 'z'] as const}>
						{(axis, index) => (
							<div>
								{axis}
								<input
									max={180}
									min={-180}
									step={15}
									type="number"
									value={eulerAngle()[index()].toFixed(0)}
									onChange={e => updateRotation(index(), e.target.valueAsNumber)}
								/>

							</div>
						)}
					</For>
				</div>
			</section>
			<section>
				<div class="title with-button">
					Scale
					<button onClick={resetScale}>
						<Fa icon={faArrowRotateBack}></Fa>
					</button>
				</div>
				<div class="vec-display">
					<For each={['X', 'Y', 'Z']}>
						{(axis, index) => (
							<div>
								{axis}
								<input
									type="number"
									value={entity.scale?.[index()].toFixed(1)}
									onChange={e => updateScale(index(), e.target.valueAsNumber, entity, false)}
								/>

							</div>
						)}
					</For>
				</div>
			</section>
			<Show when={assetData?.scale}>
				<section>
					<div class="title with-button">
						Model scale
						<button onClick={resetGlobalScale}>
							<Fa icon={faArrowRotateBack}></Fa>
						</button>
					</div>
					<div class="vec-display">
						<For each={['X', 'Y', 'Z']}>
							{(axis, index) => (
								<div>
									{axis}
									<input
										type="number"
										value={assetData?.scale?.[index()].toFixed(1)}
										onChange={e => updateScale(index(), e.target.valueAsNumber, assetData!, true)}
									/>
								</div>
							)}
						</For>
					</div>
				</section>
			</Show>
			<section>
				<div class="title">Repetitions</div>

				<div class="grid-inputs">
					Repetition X
					<input type="number" value={entity.grid?.repetitionX ?? 0} onChange={setGrid('repetitionX')}></input>
					Repetition Y
					<input type="number" value={entity.grid?.repetitionY ?? 0} onChange={setGrid('repetitionY')}></input>
					Spacing X
					<input type="number" value={entity.grid?.spacingX ?? 0} onChange={setGrid('spacingX')}></input>
					Spacing Y
					<input type="number" value={entity.grid?.spacingY ?? 0} onChange={setGrid('spacingY')}></input>
				</div>
			</section>
		</>
	)
}