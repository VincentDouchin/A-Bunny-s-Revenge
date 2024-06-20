import Exit from '@assets/icons/arrow-left-solid.svg'
import Fire from '@assets/icons/fire-solid.svg'
import { Tween } from '@tweenjs/tween.js'
import type { With } from 'miniplex'
import { between } from 'randomish'
import { For, Show, createMemo, createSignal, onCleanup, onMount } from 'solid-js'
import { css } from 'solid-styled'
import { Color, PointLight, Vector3 } from 'three'
import { ConstantValue } from 'three.quarks'
import { itemBundle } from '../game/items'
import { ItemDisplay } from './InventoryUi'
import { updateCameraZoom } from '@/global/camera'
import { params } from '@/global/context'
import type { Entity } from '@/global/entity'
import { MenuType } from '@/global/entity'
import { ecs, gameTweens, time, ui } from '@/global/init'
import { cameraQuery } from '@/global/rendering'
import { playSound } from '@/global/sounds'
import { addTag } from '@/lib/hierarchy'
import { getWorldPosition } from '@/lib/transforms'
import { fireParticles } from '@/particles/fireParticles'
import { smoke } from '@/particles/smoke'
import { TouchButton } from '@/ui/TouchControls'
import { OutlineText } from '@/ui/components/styledComponents'
import { useGame, useQuery } from '@/ui/store'
import { sleep } from '@/utils/sleep'
import { InputIcon } from '@/ui/InputIcon'

export const ovenQuery = useQuery(ecs.with('menuType', 'recipesQueued', 'ovenAnimator', 'position').where(({ menuType }) => menuType === MenuType.OvenMinigame))

export const OvenMinigameUi = () => {
	const context = useGame()
	return (
		<Show when={context?.player()}>
			{(player) => {
				return (
					<For each={ovenQuery()}>
						{(oven) => {
							const output = ui.sync(() => oven.recipesQueued?.[0]?.output)
							const smokeTrails: With<Entity, 'emitter'>[] = []
							let targetEntity: Entity | null = null
							let lightEntity: With<Entity, 'light' | 'emitter'> | null = null
							onMount(() => {
								gameTweens.add(new Tween([params.zoom]).to([15], 1000).onUpdate(([zoom]) => {
									updateCameraZoom(zoom)
								}))
								for (const camera of cameraQuery) {
									// ecs.removeComponent(camera, 'lockX')
									ecs.addComponent(camera, 'cameraOffset', new Vector3(0, 30, 80).applyQuaternion(oven.rotation!))
								}
								const position = getWorldPosition(oven.group!)
								targetEntity = ecs.add({
									worldPosition: position.add(new Vector3(0, 10, 0)),
									cameratarget: true,
								})
								ecs.removeComponent(player(), 'cameratarget')
								oven.model?.traverse((node) => {
									if (node.name.includes('smoke')) {
										const smokeTrail = ecs.add({
											parent: oven,
											position: node.position.clone().multiply(oven.model!.scale),
											emitter: smoke(),
											autoDestroy: true,
										})
										smokeTrails.push(smokeTrail)
									}
								})
								const light = new PointLight(new Color(0xFF0000), 10, 20)
								light.position.setY(5)
								lightEntity = ecs.add({ light, parent: oven, position: new Vector3(0, 0, 0), emitter: fireParticles() })
							})
							onCleanup(() => {
								gameTweens.add(new Tween([15]).to([params.zoom], 1000).onUpdate(([zoom]) => {
									updateCameraZoom(zoom)
								}))
								targetEntity && ecs.remove(targetEntity)
								addTag(player(), 'cameratarget')
								for (const camera of cameraQuery) {
									ecs.removeComponent(camera, 'cameraOffset')
								}
								ecs.removeComponent(oven, 'cameratarget')
								for (const smokeTrail of smokeTrails) {
									smokeTrail.emitter.system.looping = false
								}
								gameTweens.add(new Tween([1]).to([0], 4000).onUpdate(([f]) => {
									if (lightEntity) {
										lightEntity.light.intensity = f * 10
										// @ts-expect-error wrong type
										lightEntity.emitter.system.emissionOverTime = new ConstantValue(f * 2 / 30)
									}
								}))
							})
							const [bar, setBar] = createSignal(50)
							const [target, setTarget] = createSignal(50)
							const [heat, setHeat] = createSignal(100)
							const heatHeight = createMemo(() => 10 + 20 * heat() / 100)
							const [progress, setProgress] = createSignal(0)
							const [direction, setDirection] = createSignal(Math.random() > 0.5 ? 1 : -1)
							const [timer, setTimer] = createSignal(between(3, 5))
							ui.updateSync(() => {
								if (player().menuInputs.get('cancel').justReleased) {
									ecs.removeComponent(oven, 'menuType')
									return
								}
								if (output()) {
									if (player().playerControls.get('primary').justReleased) {
										setBar(x => Math.min(100, x - 10))
									}
									setBar(x => x + 25 * time.delta / 1000)
									if (bar() < target() + heatHeight() / 2 && bar() > target() - heatHeight() / 2) {
										setProgress(x => Math.min(100, x + 20 * time.delta / 1000))
										setHeat(x => Math.min(100, x + 5 * time.delta / 1000))
									} else {
										setHeat(x => Math.max(0, x - 15 * time.delta / 1000))
									}
									for (const { emitter } of smokeTrails) {
										// @ts-expect-error wrong type
										emitter.system.emissionOverTime = new ConstantValue(heat() / 30)
									}
									setTimer(x => x - time.delta / 1000)
									if (timer() <= 0) {
										setDirection(x => x *= -1)
										setTimer(between(2, 7))
									}
									setTarget(x => Math.max(0, Math.min(100, x + direction() * 3 * (time.delta / 1000) * (1 + progress() / 20))))
									if (progress() >= 100) {
										setProgress(0)
										playSound('zapsplat_foley_heavy_flat_stone_very_sort_drag_scrape_002_87118')
										oven.ovenAnimator.playClamped('Opening').then(async () => {
											oven.recipesQueued.shift()
											const position = new Vector3()
											oven.model!.traverse((node) => {
												if (node.name.includes('Door')) {
													node.getWorldPosition(position)
												}
											})
											for (let i = 0; i < output().quantity; i++) {
												playSound('cauldron2')
												ecs.add({
													...itemBundle(output().name),
													position,
													popDirection: new Vector3(between(-1, 1), 0, between(2, 2.5)).applyQuaternion(oven.rotation!),
													groundLevel: oven.position.y,
												})
											}
											await sleep(500)
											playSound('zapsplat_foley_rubble_rock_drop_onto_pile_others_medium_sized_006_108147')
											oven.ovenAnimator.playClamped('Closing')
										})
									}
								}
							})
							css/* css */`
				.minigame-container{
					display: grid;
					grid-template-columns: auto auto auto;
					gap: 1rem 3rem;
					width: fit-content;
					align-items: center;
					margin-left: 15rem;
					position: relative;
				}
				.progress-text{
					position: absolute;
					transform: translate(-50%, -100%);
					font-size: 2rem;
					color: white;
					left: 50%;
				}
				.progress-container{
					width: 2rem;
					height: 20rem;
					border: solid 0.5rem hsla(0, 0%, 0%, 0.7);
					border-radius: 1rem;
					overflow: hidden;
					position: relative;
				}
				.progress-bar{
					height: ${`${progress()}%`};
					width: 100%;
					background: linear-gradient(0, #5ab552, #9de64e);
					margin-top: auto;
					position: absolute;
					bottom: 0;
				}
				.target-container{
					width: 5rem;
					height: 20rem;
					background: hsla(0, 0%, 100%, 0.7);
					border-radius: 1rem;
					outline: solid 0.5rem hsla(0, 0%, 0%, 0.7);
					display: grid;
					overflow: hidden;
					position: relative;
				}
				.target{
					height: ${`${heatHeight()}%`};
					width: 100%;
					position: absolute;
					background: linear-gradient(0deg, transparent, #f3a833, #e98537, #f3a833, transparent);
					transform: translate(0, -50%);
					top: ${`${target()}%`};
				}
				.target-bar{
					height: 0.5rem;
					background: black;
					top: ${`${bar()}%`};
					position: relative;
					width: 100%;
					transition: all 200ms ease;
				}
				.relative{
					position: relative;
				}
				.heat-text{
					position: absolute;
					transform: translate(-50%, -100%);
					font-size: 2rem;
					color: white;
					left: 50%;
				}
				.heat-container{
					width: 2rem;
					height: 20rem;
					border: solid 0.5rem hsla(0, 0%, 0%, 0.7);
					border-radius: 1rem;
					overflow: hidden;
					position: relative;
				}
				.heat-bar{
					height: ${`${heat()}%`};
					width: 100%;
					background: linear-gradient(0, #ec273f, #de5d3a, #e98537, #f3a833);
					margin-top: auto;
					position: absolute;
					bottom: 0;
				}
				.input-container{
					position: absolute;
					top: 100%;
					font-size: 1.5rem;
					color: white;
					width: max-content;
					transform: translateX(-50%);
					margin-top: 1rem;
					left: 50%;
				}
				.input-icon{
					display: flex;
					flex-wrap: nowrap;
				}
				
				`
							return (
								<>
									<Show when={context?.usingTouch()}>
										<div class="inputs-container">
											<TouchButton input="primary" controller={player().playerControls.touchController!}>
												<Fire />
											</TouchButton>
											<TouchButton input="cancel" controller={player().menuInputs.touchController!}>
												<Exit />
											</TouchButton>
										</div>
									</Show>

									<div class="minigame-container">

										{/*  progress */}
										<div class="relative">
											<div class="progress-text"><OutlineText>Progress</OutlineText></div>
											<div class="progress-container">
												<div class="progress-bar"></div>
											</div>
										</div>
										{/* middle */}
										<div class="relative">
											<Show when={output()}>
												{output => (
													<div class="output" style={{ position: 'absolute', bottom: 'calc(100% + 2rem)', transform: 'translate(-50%)', left: '50%' }}>
														<ItemDisplay item={output()}></ItemDisplay>
													</div>
												)}
											</Show>
											<div class="target-container">
												{/* target */}
												<div class="target"></div>
												{/* bar */}
												<div class="target-bar"></div>
											</div>
											<Show when={!context?.usingTouch()}>
												<div class="input-container">
													<div class="input-icon">
														<InputIcon input={player().playerControls.get('primary')} />
														<OutlineText>Stoke fire</OutlineText>
													</div>
													<div class="input-icon">
														<InputIcon input={player().menuInputs.get('cancel')} />
														<OutlineText>Close</OutlineText>
													</div>
												</div>
											</Show>
										</div>
										{/* heat */}
										<div class="relative">
											<div class="heat-text"><OutlineText>Heat</OutlineText></div>
											<div class="heat-container">
												<div class="heat-bar"></div>
											</div>
										</div>

									</div>
								</>
							)
						}}
					</For>
				)
			}}
		</Show>
	)
}