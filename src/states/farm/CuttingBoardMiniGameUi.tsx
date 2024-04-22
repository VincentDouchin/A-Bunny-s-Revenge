import { Tween } from '@tweenjs/tween.js'
import { Vector3 } from 'three'
import { onCleanup, onMount } from 'solid-js'
import { params } from '@/global/context'
import type { Entity } from '@/global/entity'
import { MenuType } from '@/global/entity'
import { ecs, gameTweens, ui } from '@/global/init'
import { ForQuery } from '@/ui/components/ForQuery'
import type { FarmUiProps } from '@/ui/types'
import { updateCameraZoom } from '@/global/camera'
import { cameraQuery } from '@/global/rendering'
import { getWorldPosition } from '@/lib/transforms'
import { addTag } from '@/lib/hierarchy'

const boardQuery = ecs.with('menuType', 'recipesQueued', 'position', 'rotation', 'group').where(({ menuType }) => menuType === MenuType.BenchGame)

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

				return (
					<div>
						ok
					</div>
				)
			}}
		</ForQuery>
	)
}