import { Tween } from '@tweenjs/tween.js'
import { Vector3 } from 'three'
import { For, Show, createMemo, onCleanup, onMount } from 'solid-js'
import { Portal } from 'solid-js/web'
import { css } from 'solid-styled'
import atom from 'solid-use/atom'
import { params } from '@/global/context'
import type { Entity } from '@/global/entity'
import { MenuType } from '@/global/entity'
import { ecs, gameTweens, time, ui } from '@/global/init'
import { ForQuery } from '@/ui/components/ForQuery'
import type { FarmUiProps } from '@/ui/types'
import { updateCameraZoom } from '@/global/camera'
import { cameraQuery } from '@/global/rendering'
import { getWorldPosition } from '@/lib/transforms'
import { addTag } from '@/lib/hierarchy'

const boardQuery = ecs.with('menuType', 'recipesQueued', 'position', 'rotation', 'group', 'minigameContainer').where(({ menuType }) => menuType === MenuType.BenchGame)

export const CuttingBoardMinigameUi = ({ player }: FarmUiProps) => {
	return (
		<ForQuery query={boardQuery}>
			{(board) => {
				// const output = ui.sync(() => board.recipesQueued?.[0]?.output)
				let targetEntity: Entity | null = null
				onMount(() => {
					gameTweens.add(new Tween([params.zoom]).to([20], 1000).onUpdate(([zoom]) => {
						updateCameraZoom(zoom)
					}))
					for (const camera of cameraQuery) {
						ecs.removeComponent(camera, 'lockX')
						ecs.addComponent(camera, 'cameraOffset', new Vector3(0, 50, -10).applyQuaternion(board.rotation))
					}
					const position = getWorldPosition(board.group)
					targetEntity = ecs.add({
						worldPosition: position.add(new Vector3(0, 0, 0)),
						cameratarget: true,
					})
					ecs.removeComponent(player, 'cameratarget')
				})
				onCleanup(() => {
					gameTweens.add(new Tween([15]).to([params.zoom], 1000).onUpdate(([zoom]) => {
						updateCameraZoom(zoom)
					}))
					targetEntity && ecs.remove(targetEntity)
					addTag(player, 'cameratarget')
					for (const camera of cameraQuery) {
						ecs.removeComponent(camera, 'cameraOffset')
						ecs.addComponent(camera, 'lockX', true)
					}
				})
				ui.updateSync(() => {
					if (player.menuInputs.get('cancel').justReleased) {
						ecs.removeComponent(board, 'menuType')
					}
				})
				const arrowPos = atom(0)
				const forward = atom(true)
				ui.updateSync(() => {
					if (arrowPos() >= 1 || arrowPos() <= 0) {
						forward(!forward())
					}
					arrowPos(arrowPos() + (time.delta / 2000 * (forward() ? 1 : -1)))
				})
				const arrowLeft = createMemo(() => `${arrowPos() * 100}%`)
				css/* css */`
				.container{
					display: grid;
					gap: 2rem;
				}
				.dot-container{
					--size: 3rem;
					display: grid;
					/* gap: calc(var(--size) / 2); */
					grid-template-columns: repeat(5, var(--size));
					align-items:center;
					height:var(--size);
				}
				.dot-filled{
					border: solid black 0.5rem;
					border-radius: 100%;
					height: var(--size)
				}
				.dot-empty{
					height: 0.5rem;
					width: calc(var(--size) * 1.1);
					background: black;
				}
				.timer{
					height:fit-content;
					border-bottom: dashed black 0.4rem;
					position: relative;
				}
				.timer-arrow{
					width: 0;
					height: 0;
					border-left: 1rem solid transparent;
					border-right: 1rem solid transparent;
					border-bottom: 1.5rem solid black;
					position: absolute;
					left: calc(${arrowLeft()} - 1rem);
					transform: translateY(-100%);
				}
				`
				const dots = atom([true, false, true, false, true])
				return (
					<Portal mount={board.minigameContainer.element}>
						<div class="container">
							<div class="dot-container">
								<For each={dots()}>
									{(dot) => {
										return (
											<>
												<Show when={dot}>
													<div class="dot-filled"></div>
												</Show>
												<Show when={!dot}>
													<div class="dot-empty"></div>
												</Show>
											</>
										)
									}}
								</For>
							</div>
							<div class="timer">
								<div class="timer-arrow"></div>
							</div>
						</div>
					</Portal>
				)
			}}
		</ForQuery>
	)
}