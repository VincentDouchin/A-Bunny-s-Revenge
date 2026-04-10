import type { Object3D } from 'three/webgpu'
import { entries, objectValues } from '@/utils/mapFunctions'
import { Material, Texture, Vector2 } from 'three/webgpu'
import { params } from './context'
import { RenderGroup } from './entity'
import { assets, ecs, renderer } from './init'

export const gameRenderGroupQuery = ecs.with('renderGroup', 'scene', 'renderPipeline', 'cssRenderer').where((e) => e.renderGroup === RenderGroup.Game)
export const getTargetSize = (height = params.renderHeight) => {
	const ratio = window.innerWidth / window.innerHeight
	const width = height * ratio
	return new Vector2(width, height)
}
export const updateRenderSize = (newSize?: Vector2, force = true) => {
	const gameRenderGroup = gameRenderGroupQuery.first
	if (!gameRenderGroup) return
	newSize ??= getTargetSize()
	gameRenderGroup.renderPipeline.uniforms.resolution.value = newSize
	if (force) {
		const cssRendererSize = gameRenderGroup.cssRenderer.getSize()
		if (cssRendererSize.width !== window.innerWidth || cssRendererSize.height !== window.innerHeight) {
			gameRenderGroup.cssRenderer.setSize(window.innerWidth, window.innerHeight)
		}
	}
}

export const cameraQuery = ecs.with('camera', 'renderGroup', 'cameraOffset').where((e) => e.renderGroup === RenderGroup.Game)

export const gameCameraQuery = cameraQuery.with('cameraOffset').where((e) => e.renderGroup === RenderGroup.Game)

const initTextures = (obj: Object3D) => {
	const gameRenderGroup = gameRenderGroupQuery.first
	if (!gameRenderGroup) return
	obj.traverse((node) => {
		if ('material' in node && node.material instanceof Material) {
			if ('map' in node.material && node.material.map instanceof Texture) {
				renderer.initTexture(node.material.map)
			}
		}
	})
}

export const initTexturesItemsAndEnemies = () => {
	for (const [name, enemy] of entries(assets.characters)) {
		if (name !== 'BunnyClothed') {
			initTextures(enemy.scene)
		}
	}
	initTextures(assets.models.Chest.scene)
	for (const item of objectValues(assets.items)) {
		initTextures(item.model)
	}
}

export const compileShaders = async () => {
	// const gameRenderGroup = gameRenderGroupQuery.first
	// if (!gameRenderGroup) return
	// const { renderer, scene } = gameRenderGroup
	// initTextures(scene)
	// const invisible: Object3D[] = []
	// scene.traverse((node) => {
	// 	if (!node.visible) {
	// 		node.visible = true
	// 		invisible.push(node)
	// 	}
	// })
	// for (const { camera } of gameCameraQuery) {
	// 	await renderer.compileAsync(scene, camera)
	// }
	// for (const node of invisible) {
	// 	node.visible = false
	// }
}
