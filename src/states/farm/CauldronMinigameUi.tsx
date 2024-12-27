import type { Entity } from '@/global/entity'
import { updateCameraZoom } from '@/global/camera'
import { params } from '@/global/context'
import { MenuType } from '@/global/entity'
import { cookedMealEvent } from '@/global/events'
import { ecs, inputManager, time, tweens, ui } from '@/global/init'
import { cameraQuery } from '@/global/rendering'
import { playSound } from '@/global/sounds'
import { addTag } from '@/lib/hierarchy'
import { getWorldPosition } from '@/lib/transforms'
import { cauldronSparkles } from '@/particles/cauldronSparkles'
import { useGame, useQuery } from '@/ui/store'
import { TouchButton } from '@/ui/TouchControls'
import Exit from '@assets/icons/arrow-left-solid.svg'
import Spoon from '@assets/icons/spoon-solid.svg'
import { between } from 'randomish'
import { createMemo, createSignal, onCleanup, onMount, Show } from 'solid-js'
import { Portal } from 'solid-js/web'
import { css } from 'solid-styled'
import { Vector3 } from 'three'
import { itemBundle } from '../game/items'
import { ItemDisplay } from './InventoryUi'

export const cauldronQuery = useQuery(ecs.with('menuType', 'interactionContainer', 'group', 'rotation', 'recipesQueued', 'spoon').where(({ menuType }) => menuType === MenuType.CauldronGame))
export const CauldronMinigameUi = () => {
	const context = useGame()
	return (
		<Show when={context?.player()}>
			{(player) => {
				const cauldron = createMemo(() => cauldronQuery()?.[0])
				return (
					<Show when={cauldron()}>
						{(cauldron) => {
							const lightQuery = ecs.with('parent', 'fireParticles', 'light').where(e => e.parent === cauldron)
							onMount(() => {
								tweens.add({
									from: params.zoom,
									to: 15,
									duration: 1000,
									onUpdate: updateCameraZoom,
								})
								for (const { fireParticles } of lightQuery) {
									fireParticles.restart()
									fireParticles.play()
								}
							})
							onCleanup(() => {
								for (const { fireParticles } of lightQuery) {
									fireParticles.endEmit()
								}

								tweens.add({
									from: 15,
									to: params.zoom,
									duration: 1000,
									onUpdate: updateCameraZoom,
								})
							})
							const output = ui.sync(() => cauldron().recipesQueued[0]?.output)
							let targetEntity: Entity | null = null
							const [spot, setSpot] = createSignal(between(0, Math.PI * 2))
							const [progress, setProgress] = createSignal(0)
							const [spoon, setSpoon] = createSignal(0)

							const spotCoordinates = createMemo(() => ({
								x: Math.cos(spot()),
								y: Math.sin(spot()),
							}))
							const cauldronPosition = getWorldPosition(cauldron().group).add(new Vector3(0, 0, 0))
							onMount(() => {
								targetEntity = ecs.add({
									cameratarget: true,
									worldPosition: new Vector3(0, 0, 1).add(cauldronPosition),
								})
								for (const camera of cameraQuery) {
									ecs.removeComponent(camera, 'fixedCamera')
									ecs.removeComponent(camera, 'cameraOffset')
									ecs.addComponent(camera, 'cameraOffset', new Vector3(0, 40, -1).applyQuaternion(cauldron().rotation))
								}

								ecs.removeComponent(player(), 'cameratarget')
							})
							onCleanup(() => {
								for (const camera of cameraQuery) {
									ecs.removeComponent(camera, 'cameraOffset')
									addTag(camera, 'fixedCamera')
								}
								targetEntity && ecs.remove(targetEntity)
								addTag(player(), 'cameratarget')
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
								if (player().menuInputs.get('cancel').justReleased) {
									ecs.removeComponent(cauldron(), 'menuType')
									return
								}
								if (output()) {
									setSpoon(x => x + time.delta / 500 * (1 + progress() / 50))
									cauldron().spoon.rotation?.setFromAxisAngle(new Vector3(0, 1, 0), Math.PI - spoon())
									if (player().playerControls.get('primary').justReleased) {
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
													ecs.add({ ...itemBundle(output().name), position: cauldronPosition.clone().add(new Vector3(0, 15, 0)), groundLevel: cauldronPosition.y })
												}
												cookedMealEvent.emit('cookingPot', output().name)
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
							const isTouch = createMemo(() => inputManager.controls() === 'touch')
							css/* css */`
				.button {
					position: fixed;
					height: 80%;
					left: 0;
					width: 5rem;
					margin: 3rem 2rem;
					display: flex;
					justify-content: center;
					flex-direction: column;
				}
				.progress-container{
					display: grid;
					grid-template-columns: 1fr auto 1fr;
					place-items: center;
					gap: 3rem;
				}
				.progress{
					position: relative;
				}
				.progress-label {
					position: absolute;
					transform: translate(-50%, -100%);
					font-size: 2rem;
					color: white;
					left: 50%;
				}
				.progress-bar {
					width: 2rem;
					height: 20rem;
					border: solid 0.5rem hsl(0, 0%, 0%, 0.7);
					border-radius: 1rem;
					overflow: hidden;
					position: relative;
				}
				.progress-fill {
					background: linear-gradient(0, #5ab552, #9de64e);
					margin-top: auto;
					position: absolute;
					bottom: 0;
					width: 100%;
					height:${`${progress()}%`}
				}
				.output-container{
					width: 20rem;
					height: 20rem;
					border-radius: 200rem;
					position: relative;
				}
				.output{
					position: absolute;
					left: 50%;
					translate: -50%;
					bottom: calc(100% + 2rem);
				}
				.spot {
					position: absolute;
					width: 5rem;
					height: 5rem;
					border-radius: 300rem;
					top: 50%;
					left: 50%;
					box-sizing: content-box;
					transform: translate(-50%,-50%);
					border:  ${`solid ${spotColor()} ${spotSize()}`};
					translate: ${`calc(10rem * ${spotCoordinates().x}) calc(10rem * ${spotCoordinates().y})`};
				}
				`
							return (
								<>
									<Show when={isTouch()}>
										<TouchButton size="10rem" input="primary" controller={player().playerControls.touchController!}>
											<Spoon />
										</TouchButton>
										<TouchButton size="7rem" distance="15rem" angle="90deg" input="cancel" controller={player().menuInputs.touchController!}>
											<Exit />
										</TouchButton>
									</Show>
									<Portal mount={cauldron().interactionContainer.element}>
										<div class="progress-container">
											<div class="progress">
												<div class="progress-label">Progress</div>
												<div class="progress-bar">
													<div class="progress-fill"></div>
												</div>
											</div>
											<div class="output-container">
												<Show when={output()}>
													{output => (
														<>
															<div class="output">
																<ItemDisplay item={output()}></ItemDisplay>
															</div>
															<div class="spot"></div>
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
			}}
		</Show>
	)
}