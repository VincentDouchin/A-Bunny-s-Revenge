import { between } from 'randomish'
import { Show, createMemo, createSignal, onCleanup, onMount } from 'solid-js'
import { Portal } from 'solid-js/web'
import { Vector3 } from 'three'
import { itemBundle } from '../game/items'
import { ItemDisplay } from './InventoryUi'
import type { Entity } from '@/global/entity'
import { MenuType } from '@/global/entity'
import { ecs, time, ui } from '@/global/init'
import { cameraQuery } from '@/global/rendering'
import { addTag } from '@/lib/hierarchy'
import { getWorldPosition } from '@/lib/transforms'
import type { FarmUiProps } from '@/ui/types'
import { cauldronSparkles } from '@/particles/cauldronSparkles'

const cauldronQuery = ecs.with('menuType', 'interactionContainer', 'group', 'rotation', 'recipesQueued').where(({ menuType }) => menuType === MenuType.CauldronGame)
export const CauldronMinigameUi = ({ player }: FarmUiProps) => {
	const cauldron = ui.sync(() => cauldronQuery.first)
	return (
		<Show when={cauldron()}>
			{(cauldron) => {
				const output = ui.sync(() => cauldron().recipesQueued[0]?.output)
				let targetEntity: Entity | null = null
				const [spot, setSpot] = createSignal(0)
				const [progress, setProgress] = createSignal(0)
				const [spoon, setSpoon] = createSignal(0)

				const spotCoordinates = createMemo(() => ({
					x: Math.cos(spot()),
					y: Math.sin(spot()),
				}))
				const targetCoordinates = createMemo(() => ({
					x: Math.cos(spoon()),
					y: Math.sin(spoon()),
				}))
				const cauldronPosition = getWorldPosition(cauldron().group).add(new Vector3(0, 0, -10))
				onMount(() => {
					targetEntity = ecs.add({
						cameratarget: true,
						worldPosition: cauldronPosition,
					})
					for (const camera of cameraQuery) {
						ecs.addComponent(camera, 'cameraOffset', new Vector3(0, 40, 0).applyQuaternion(cauldron().rotation))
					}

					ecs.removeComponent(player, 'cameratarget')
				})
				onCleanup(() => {
					for (const camera of cameraQuery) {
						ecs.removeComponent(camera, 'cameraOffset')
					}
					targetEntity && ecs.remove(targetEntity)
					addTag(player, 'cameratarget')
				})
				const percentSynced = createMemo(() => {
					const precision = 0.05
					const diff = (spoon() - spot()) / (Math.PI * 2)
					const delta = diff - Math.floor(diff)
					const percent = delta > 0.5 ? ((1 - delta) / precision) : delta / precision
					return percent > 1 ? 0 : 1 - percent
				})
				const isSynced = createMemo(() => percentSynced() > 0)

				ui.updateSync(() => {
					if (player.playerControls.get('pause').justReleased) {
						ecs.removeComponent(cauldron(), 'menuType')
					}
					if (output()) {
						setSpoon(x => x + time.delta / 1000 * (1 + progress() / 50))
						if (player.playerControls.get('primary').justReleased) {
							if (isSynced()) {
								setProgress(x => x + (30 * percentSynced()))
							} else {
								setProgress(x => Math.max(0, x - 10))
							}
							setSpot(between(0, 10))
							ecs.add({
								parent: cauldron(),
								singleEmitter: true,
								position: new Vector3(),
								emitter: cauldronSparkles(progress()),
							})
							if (progress() >= 100) {
								for (let i = 0; i < output().quantity; i++) {
									const direction = new Vector3().randomDirection().add(new Vector3(0, 0, 10))
									direction.setY(10)
									ecs.add({ ...itemBundle(output().name), position: cauldronPosition.clone().add(direction) })
								}
								setProgress(0)
								cauldron().recipesQueued.shift()
							}
						}
					}
				})
				const spotColor = createMemo(() => {
					return `color-mix(in srgb, #33cc33 ${percentSynced() * 100}%, hsl(0,0%,0%,0.5))`
				})

				return (
					<Portal mount={cauldron().interactionContainer.element}>
						<div style={{ 'display': 'grid', 'grid-template-columns': '1fr auto 1fr', 'place-items': 'center', 'gap': '3rem' }}>
							<div style={{ position: 'relative' }}>
								<div style={{ 'position': 'absolute', 'translate': '-50% -100%', 'font-size': '2rem', 'color': 'white', 'left': '50%' }}>Progress</div>
								<div style={{ 'width': '2rem', 'height': '20rem', 'border': 'solid 0.5rem hsl(0,0%,0%,0.7)', 'border-radius': '1rem', 'overflow': 'hidden', 'position': 'relative' }}>
									<div style={{ 'height': `${progress()}%`, 'width': '100%', 'background': 'linear-gradient(0, #5ab552,#9de64e)', 'margin-top': 'auto', 'position': 'absolute', 'bottom': 0 }}></div>
								</div>
							</div>
							<div style={{ 'width': '20rem', 'height': '20rem', 'border-radius': '200rem', 'border': 'solid 0.5rem hsl(0,0%,0%,0.7)', 'position': 'relative' }}>
								<Show when={output()}>
									{output => (
										<>
											<div style={{ position: 'absolute', left: '50%', translate: '-50%', bottom: 'calc(100% + 2rem)' }}>
												<ItemDisplay item={output()}></ItemDisplay>
											</div>
											<div style={{ 'position': 'absolute', 'width': '5rem', 'height': '5rem', 'background': 'hsl(0,0%,100%,0.5)', 'border-radius': '300rem', 'transform': 'translate(-50%,-50%)', 'top': '50%', 'left': '50%', 'translate': `calc(10rem * ${targetCoordinates().x}) calc(10rem * ${targetCoordinates().y})` }}></div>
											<div style={{ 'position': 'absolute', 'width': '7rem', 'height': '7rem', 'border': `solid ${spotColor()} 1rem`, 'border-radius': '300rem', 'transform': 'translate(-50%,-50%)', 'top': '50%', 'left': '50%', 'translate': `calc(10rem * ${spotCoordinates().x}) calc(10rem * ${spotCoordinates().y})` }}></div>
										</>
									)}
								</Show>
							</div>

						</div>
					</Portal>
				)
			}}
		</Show>
	)
}