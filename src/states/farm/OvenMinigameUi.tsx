import type { With } from 'miniplex'
import { between } from 'randomish'
import { Show, createSignal, onCleanup, onMount } from 'solid-js'
import { Portal } from 'solid-js/web'
import { Vector3 } from 'three'
import { ConstantValue } from 'three.quarks'
import { itemBundle } from '../game/items'
import { ItemDisplay } from './InventoryUi'
import type { FarmUiProps } from '@/ui/types'
import { ForQuery } from '@/ui/components/ForQuery'
import { smoke } from '@/particles/smoke'
import { addTag } from '@/lib/hierarchy'
import { ecs, time, ui } from '@/global/init'
import { MenuType } from '@/global/entity'
import type { Entity } from '@/global/entity'

const bellowQuery = ecs.with('menuType', 'oven', 'menuOpen').where(({ menuType }) => menuType === MenuType.OvenMinigame)

export const OvenMinigameUi = ({ player }: FarmUiProps) => {
	return (
		<ForQuery query={bellowQuery}>
			{(bellow) => {
				const output = ui.sync(() => bellow.oven.recipesQueued[0]?.output)
				const smokeTrails: With<Entity, 'emitter'>[] = []
				onMount(() => {
					addTag(bellow.oven, 'cameratarget')
					ecs.removeComponent(player, 'cameratarget')
					bellow.oven.model?.traverse((node) => {
						if (node.name.includes('smoke')) {
							const smokeTrail = ecs.add({
								parent: bellow.oven,
								position: node.position.clone().multiply(bellow.oven.model!.scale),
								emitter: smoke(),
							})
							smokeTrails.push(smokeTrail)
						}
					})
				})
				onCleanup(() => {
					addTag(player, 'cameratarget')
					ecs.removeComponent(bellow.oven, 'cameratarget')
					for (const smokeTrail of smokeTrails) {
						ecs.remove(smokeTrail)
					}
				})
				const [bar, setBar] = createSignal(50)
				const height = 30
				const [target, setTarget] = createSignal(50)
				const [heat, setHeat] = createSignal(100)
				const [progress, setProgress] = createSignal(0)
				const [direction, setDirection] = createSignal(Math.random() > 0.5 ? 1 : -1)
				const [timer, setTimer] = createSignal(between(3, 5))
				ui.updateSync(() => {
					if (player.playerControls.get('pause').justReleased) {
						ecs.removeComponent(bellow, 'menuOpen')
					}
					if (output()) {
						if (player.playerControls.get('primary').justPressed) {
							setBar(x => Math.min(100, x - 10))
						}
						setBar(x => x + 7 * time.delta / 1000)
						if (bar() < target() + height / 2 && bar() > target() - height / 2) {
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
						setTarget(x => Math.max(0, Math.min(100, x + direction() * 3 * time.delta / 1000)))
						if (progress() >= 100) {
							setProgress(0)
							bellow.oven.recipesQueued?.shift()
							const position = new Vector3()
							bellow.oven.model!.traverse((node) => {
								if (node.name.includes('Door')) {
									node.getWorldPosition(position)
								}
							})
							for (let i = 0; i < output().quantity; i++) {
								ecs.add({ ...itemBundle(output().name), position, popDirection: new Vector3(0, 0, -1) })
							}
						}
					}
				})
				return (
					<Portal mount={bellow.oven.minigameContainer?.element}>
						<div style={{ display: 'flex', gap: '3rem', translate: '-100%' }}>
							{/*  progress */}
							<div style={{ position: 'relative' }}>
								<div style={{ 'position': 'absolute', 'translate': '-50% -100%', 'font-size': '2rem', 'color': 'white', 'left': '50%' }}>Progress</div>
								<div style={{ 'width': '2rem', 'height': '20rem', 'border': 'solid 0.5rem hsl(0,0%,0%,0.7)', 'border-radius': '1rem', 'overflow': 'hidden', 'position': 'relative' }}>
									<div style={{ 'height': `${progress()}%`, 'width': '100%', 'background': 'linear-gradient(0, #5ab552,#9de64e)', 'margin-top': 'auto', 'position': 'absolute', 'bottom': 0 }}></div>
								</div>
							</div>
							{/* middle */}
							<div style={{ position: 'relative' }}>
								<Show when={output()}>
									{output => (
										<div style={{ position: 'absolute', bottom: 'calc(100% + 2rem)' }}>
											<ItemDisplay item={output()}></ItemDisplay>
										</div>
									)}
								</Show>
								<div style={{ 'width': '5rem', 'height': '20rem', 'background': 'hsl(0,0%,100%,0.7)', 'border-radius': '1rem', 'outline': 'solid 0.5rem hsl(0,0%,0%,0.7)', 'display': 'grid', 'overflow': 'hidden', 'position': 'relative' }}>
									{/* target */}
									<div style={{ height: `${height}%`, width: '100%', position: 'absolute', background: 'linear-gradient(0deg, transparent, #f3a833, #e98537, #f3a833, transparent)', translate: '0 -50%', top: `${target()}%` }}></div>
									{/* bar */}
									<div style={{ height: '0.5rem', background: 'black', top: `${bar()}%`, position: 'relative', width: '100%', transition: 'all 200ms ease' }}></div>
								</div>
							</div>
							{/* heat */}
							<div style={{ position: 'relative' }}>
								<div style={{ 'position': 'absolute', 'translate': '-50% -100%', 'font-size': '2rem', 'color': 'white', 'left': '50%' }}>Heat</div>
								<div style={{ 'width': '2rem', 'height': '20rem', 'border': 'solid 0.5rem hsl(0,0%,0%,0.7)', 'border-radius': '1rem', 'overflow': 'hidden', 'position': 'relative' }}>
									<div style={{ 'height': `${heat()}%`, 'width': '100%', 'background': 'linear-gradient(0, #ec273f,#de5d3a,#e98537,#f3a833)', 'margin-top': 'auto', 'position': 'absolute', 'bottom': 0 }}></div>
								</div>
							</div>

						</div>
					</Portal>
				)
			}}
		</ForQuery>
	)
}