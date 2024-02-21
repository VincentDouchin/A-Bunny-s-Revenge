import { between } from 'randomish'
import { Show, createMemo, createSignal, onCleanup, onMount } from 'solid-js'
import { Portal } from 'solid-js/web'
import { Vector3 } from 'three'
import arrowLeft from '@assets/icons/arrow-left-solid.svg?raw'
import spoonIcon from '@assets/icons/spoon-solid.svg?raw'
import { itemBundle } from '../game/items'
import { ItemDisplay } from './InventoryUi'
import type { Entity } from '@/global/entity'
import { MenuType } from '@/global/entity'
import { ecs, inputManager, time, ui } from '@/global/init'
import { cameraQuery } from '@/global/rendering'
import { addTag } from '@/lib/hierarchy'
import { getWorldPosition } from '@/lib/transforms'
import type { FarmUiProps } from '@/ui/types'
import { cauldronSparkles } from '@/particles/cauldronSparkles'
import { playSound } from '@/lib/dialogSound'

const cauldronQuery = ecs.with('menuType', 'interactionContainer', 'group', 'rotation', 'recipesQueued').where(({ menuType }) => menuType === MenuType.CauldronGame)
export const CauldronMinigameUi = ({ player }: FarmUiProps) => {
	const cauldron = ui.sync(() => cauldronQuery.first)
	return (
		<Show when={cauldron()}>
			{(cauldron) => {
				const output = ui.sync(() => cauldron().recipesQueued[0]?.output)
				let targetEntity: Entity | null = null
				const [spot, setSpot] = createSignal(between(0, Math.PI * 2))
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
					const precision = 0.08
					const diff = (spoon() - spot()) / (Math.PI * 2)
					const delta = diff - Math.floor(diff)
					const percent = delta > 0.5 ? ((1 - delta) / precision) : delta / precision
					return percent > 1 ? 0 : 1 - percent
				})
				const isSynced = createMemo(() => percentSynced() > 0)

				ui.updateSync(() => {
					if (player.menuInputs.get('cancel').justReleased) {
						ecs.removeComponent(cauldron(), 'menuType')
					}
					if (output()) {
						setSpoon(x => x + time.delta / 500 * (1 + progress() / 50))
						if (player.playerControls.get('primary').justReleased) {
							if (isSynced()) {
								setProgress(x => x + 5 + (30 * percentSynced()))
								setSpot(x => x + Math.PI / 4 + Math.random() * Math.PI)
								ecs.add({
									parent: cauldron(),
									singleEmitter: true,
									position: new Vector3(),
									emitter: cauldronSparkles(progress()),
								})
								if (progress() >= 100) {
									for (let i = 0; i < output().quantity; i++) {
										const angle = Math.random() * Math.PI * 2
										const direction = new Vector3(Math.cos(angle), 10, Math.sin(angle))
										direction.setY(10)
										ecs.add({ ...itemBundle(output().name), position: cauldronPosition.clone().add(new Vector3(0, 0, 10)) })
									}
									setProgress(0)
									cauldron().recipesQueued.shift()
									playSound('cauldron2')
								} else {
									playSound('cauldron1')
								}
							} else {
								setProgress(x => Math.max(0, x - 10))
								playSound('cauldron3')
							}
						}
					}
				})
				const spotColor = createMemo(() => {
					return `color-mix(in srgb, #33cc33 ${percentSynced() * 100}%, black)`
				})
				const spotSize = createMemo(() => {
					return `calc(0.5rem + ${percentSynced()}rem)`
				})
				const isTouch = ui.sync(() => inputManager.controls === 'touch')
				const close = () => ecs.removeComponent(cauldron(), 'menuType')
				const playerInputs = () => player.playerControls.touchController
				const isPrimaryPressed = ui.sync(() => playerInputs()?.get('primary'))
				const interact = (value: number, input: 'primary' | 'secondary' | 'pause') => () => {
					playerInputs()?.set(input, value)
				}
				return (
					<>
						<Show when={isTouch()}>
							<button class="button" style={{ 'position': 'fixed', 'height': '80%', 'left': 0, 'width': '5rem', 'margin': '3rem 2rem', 'display': 'flex', 'justify-content': 'center', 'flex-direction': 'column' }} onClick={close}>
								<div style={{ width: '2rem' }} innerHTML={arrowLeft}></div>
								<div>Exit</div>
							</button>
							<div style={{ 'position': 'fixed', 'width': '5rem', 'height': '5rem', 'background': 'hsl(0,0%,0%, 20%)', 'border-radius': '3rem', 'border': `solid ${isPrimaryPressed() ? '0.3rem' : '0.1rem'} hsl(0, 0%,100%, 30% )`, 'top': '50%', 'left': '50%', 'display': 'grid', 'place-items': 'center', 'translate': '-50% -50%' }} onTouchStart={interact(1, 'primary')} onTouchEnd={interact(0, 'primary')}>
								<div innerHTML={spoonIcon} style={{ color: 'white', width: '50%', height: '50%' }}></div>
							</div>
						</Show>
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
												<div style={{ 'position': 'absolute', 'width': '5rem', 'height': '5rem', 'border': `solid ${spotColor()} ${spotSize()}`, 'border-radius': '300rem', 'transform': 'translate(-50%,-50%)', 'top': '50%', 'left': '50%', 'translate': `calc(10rem * ${spotCoordinates().x}) calc(10rem * ${spotCoordinates().y})`, 'box-sizing': 'content-box' }}></div>
											</>
										)}
									</Show>
								</div>
							</div>
						</Portal>
					</>
				)
			}}
		</Show>
	)
}