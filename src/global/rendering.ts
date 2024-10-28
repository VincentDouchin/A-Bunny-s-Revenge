import type { Object3D } from 'three'
import { getGameRenderGroup } from '@/debug/debugUi'
import { getSobelShader, outlineShader } from '@/shaders/EdgePass'
import { gameCameraQuery } from '@/states/mainMenu/mainMenuRendering'
import { entries, objectValues } from '@/utils/mapFunctions'
import { BasicShadowMap, DepthTexture, LinearSRGBColorSpace, Material, MeshBasicMaterial, Scene, ShaderMaterial, Texture, Vector2, WebGLRenderer, WebGLRenderTarget } from 'three'
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass'
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer'
import { params } from './context'
import { RenderGroup } from './entity'
import { assets, ecs, settings } from './init'
import { mainMenuState } from './states'

export const scene = new Scene()
export const renderer = new WebGLRenderer({ alpha: false })
renderer.debug.checkShaderErrors = false
renderer.setPixelRatio(1)

const cssRenderer = new CSS2DRenderer()

export const width = window.innerWidth
export const height = window.innerHeight
export const target = new WebGLRenderTarget(width, height, { depthBuffer: true })
target.depthTexture = new DepthTexture(width, height)
const outlineTarget = new WebGLRenderTarget(width, height, { depthBuffer: true })
outlineTarget.depthTexture = new DepthTexture(width, height)
const outlineTarget2 = new WebGLRenderTarget(width, height)
export const finalTarget = new WebGLRenderTarget(width, height)

const outlineMat = new ShaderMaterial(outlineShader(target, outlineTarget))
const outlineQuad = new FullScreenQuad(outlineMat)
export const sobelMat = new ShaderMaterial(getSobelShader(width, height, target, outlineTarget2))
const sobelQuad = new FullScreenQuad(sobelMat)
export const getTargetSize = (height = params.renderHeight) => {
	const ratio = window.innerWidth / window.innerHeight
	const width = height * ratio
	return new Vector2(width, height)
}
export const updateRenderSize = (newSize?: Vector2) => {
	newSize ??= getTargetSize()
	sobelMat.uniforms.resolution.value = newSize
	target.setSize(newSize.x, newSize.y)
	// target.depthTexture = new DepthTexture(newSize.x, newSize.y)
	outlineTarget.setSize(newSize.x, newSize.y)
	// outlineTarget.depthTexture = new DepthTexture(newSize.x, newSize.y)
	outlineTarget2.setSize(newSize.x, newSize.y)
	// finalTarget.setSize(newSize.x, newSize.y)
	renderer.setSize(newSize.x, newSize.y)
	cssRenderer.setSize(window.innerWidth, window.innerHeight)
}
export const initThree = () => {
	renderer.clear()
	renderer.shadowMap.enabled = !settings.disableShadows
	renderer.shadowMap.type = BasicShadowMap
	renderer.domElement.classList.add('main')
	document.body.appendChild(renderer.domElement)
	renderer.outputColorSpace = LinearSRGBColorSpace
	renderer.setSize(width, height)
	cssRenderer.setSize(window.innerWidth, window.innerHeight)
	cssRenderer.domElement.classList.add('main', 'no-events', 'css-renderer')
	document.body.appendChild(cssRenderer.domElement)
	const overlay = document.createElement('div')
	document.body.appendChild(overlay)
	ecs.add({ scene, renderer, renderGroup: RenderGroup.Game })
}
export const gameRenderGroupQuery = ecs.with('renderer', 'renderGroup', 'scene').where(e => e.renderGroup === RenderGroup.Game)
export const cameraQuery = ecs.with('camera', 'renderGroup').where(e => e.renderGroup === RenderGroup.Game)
const outlineQuery = ecs.with('outline')
let withOutline = false
export const renderGame = () => {
	const camera = cameraQuery.first?.camera
	if (!camera) return
	// Base scene
	renderer.setRenderTarget(target)
	renderer.render(scene, camera)
	if (outlineQuery.size) {
		// outline entities
		camera.layers.set(1)
		scene.overrideMaterial = new MeshBasicMaterial()
		renderer.setRenderTarget(outlineTarget)
		renderer.render(scene, camera)
		scene.overrideMaterial = null
		camera.layers.set(0)
		// outline entities with depth
		renderer.setRenderTarget(outlineTarget2)
		outlineQuad.render(renderer)
	}
	if (withOutline && outlineQuery.size === 0) {
		renderer.setRenderTarget(outlineTarget2)
		renderer.clear()
	}
	withOutline = outlineQuery.size > 0

	if (mainMenuState.enabled) {
		renderer.setRenderTarget(finalTarget)
	} else {
		renderer.setRenderTarget(null)
	}
	sobelQuad.render(renderer)

	cssRenderer.render(scene, camera)
}

const initTextures = (obj: Object3D) => {
	// obj.traverse((node) => {
	// 	if ('material' in node && node.material instanceof Material) {
	// 		if ('map' in node.material && node.material.map instanceof Texture) {
	// 			renderer.initTexture(node.material.map)
	// 		}
	// 	}
	// })
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
	const { scene, renderer } = getGameRenderGroup()
	initTextures(scene)
	const invisible: Object3D[] = []
	scene.traverse((node) => {
		if (!node.visible) {
			node.visible = true
			invisible.push(node)
		}
	})
	for (const { camera } of gameCameraQuery) {
		await renderer.compileAsync(scene, camera)
	}
	for (const node of invisible) {
		node.visible = false
	}
}