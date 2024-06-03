import Exit from '@assets/icons/arrow-left-solid.svg'
import Spoon from '@assets/icons/spoon-solid.svg'
import { Tween } from '@tweenjs/tween.js'
import { between } from 'randomish'
import { Show, createMemo, createSignal, onCleanup, onMount } from 'solid-js'
import { Portal } from 'solid-js/web'
import { css } from 'solid-styled'
import { Color, PointLight, Vector3 } from 'three'
import { itemBundle } from '../game/items'
import { ItemDisplay } from './InventoryUi'
import { updateCameraZoom } from '@/global/camera'
import { params } from '@/global/context'
import type { Entity } from '@/global/entity'
import { MenuType } from '@/global/entity'
import { ecs, gameTweens, inputManager, time, ui } from '@/global/init'
import { cameraQuery } from '@/global/rendering'
import { playSound } from '@/global/sounds'
import { addTag } from '@/lib/hierarchy'
import { getWorldPosition } from '@/lib/transforms'
import { cauldronSparkles } from '@/particles/cauldronSparkles'
import { fireParticles } from '@/particles/fireParticles'
import { useGame, useQuery } from '@/ui/store'
import { TouchButton } from '@/ui/TouchControls'

export const cauldronQuery = useQuery(ecs.with('menuType', 'interactionContainer', 'group', 'rotation', 'recipesQueued', 'spoon').where(({ menuType }) => menuType === MenuType.CauldronGame))
export const CauldronMinigameUi = () => {
	const context = useGame()
	const player = context!.player()
	const cauldron = createMemo(() => cauldronQuery()?.[0])
	return (
		<Show when={cauldron()}>
			{(cauldron) => {
				let lightEntity: Entity | null = null
				onMount(() => {
					gameTweens.add(new Tween([params.zoom]).to([15], 1000).onUpdate(([zoom]) => {
						updateCameraZoom(zoom)
					}))
					const light = new PointLight(new Color(0xFF0000), 10, 10)
					light.position.setY(5)
					lightEntity = ecs.add({ light, parent: cauldron(), position: new Vector3(0, 0, 0), emitter: fireParticles() })
				})
				onCleanup(() => {
					lightEntity && ecs.remove(lightEntity)
					gameTweens.add(new Tween([15]).to([params.zoom], 1000).onUpdate(([zoom]) => {
						updateCameraZoom(zoom)
					}))
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
						ecs.addComponent(camera, 'cameraOffset', new Vector3(0, 40, -1).applyQuaternion(cauldron().rotation))
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
						return
					}
					if (output()) {
						setSpoon(x => x + time.delta / 500 * (1 + progress() / 50))
						cauldron().spoon.rotation?.setFromAxisAngle(new Vector3(0, 1, 0), Math.PI - spoon())
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
										ecs.add({ ...itemBundle(output().name), position: cauldronPosition.clone().add(new Vector3(0, 15, 0)), groundLevel: cauldronPosition.y })
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
				.inputs-container{
					position: fixed;
					bottom: 0;
					right: 0;
					margin: 7em;
					display: flex;
					gap: 7rem;
					flex-direction: row-reverse;
				}
				`
				return (
					<>
						<Show when={isTouch()}>
							<div class="inputs-container">
								<TouchButton input="primary" controller={player.playerControls.touchController!}>
									<Spoon />
								</TouchButton>
								<TouchButton input="cancel" controller={player.menuInputs.touchController!}>
									<Exit />
								</TouchButton>
							</div>
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
}