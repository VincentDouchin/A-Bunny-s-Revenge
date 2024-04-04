import { BasicShadowMap, DepthTexture, LinearSRGBColorSpace, NearestFilter, RGBAFormat, Scene, ShaderMaterial, Vector2, WebGLRenderTarget, WebGLRenderer } from 'three'

import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass'
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer'
import { RenderGroup } from './entity'
import { ecs } from './init'
import { mainMenuState } from './states'
import { params } from './context'
import { getDepthShader, getSobelShader } from '@/shaders/EdgePass'

export const scene = new Scene()
export const renderer = new WebGLRenderer({ alpha: false, powerPreference: 'high-performance' })
renderer.setPixelRatio(1)
const cssRenderer = new CSS2DRenderer()

export const width = window.innerWidth
export const height = window.innerHeight
export const target = new WebGLRenderTarget(width, height)
export const depthTarget = new WebGLRenderTarget(width, height)
export const finalTarget = new WebGLRenderTarget(width, height)
depthTarget.texture.format = RGBAFormat
depthTarget.texture.magFilter = NearestFilter
depthTarget.texture.minFilter = NearestFilter
depthTarget.texture.generateMipmaps = false
target.texture.format = RGBAFormat
target.texture.minFilter = NearestFilter
target.texture.magFilter = NearestFilter
target.texture.generateMipmaps = false
target.stencilBuffer = false
target.depthBuffer = true
const depthTexture = new DepthTexture(width, height)
target.depthTexture = depthTexture
const depthMat = new ShaderMaterial(getDepthShader(target))
export const depthQuad = new FullScreenQuad(depthMat)
export const sobelMat = new ShaderMaterial(getSobelShader(width, height, target, depthTarget))
const sobelQuad = new FullScreenQuad(sobelMat)
export const getTargetSize = () => {
	const ratio = window.innerWidth / window.innerHeight
	const height = params.renderHeight
	const width = height * ratio
	return new Vector2(width, height)
}
export const updateRenderSize = (newSize?: Vector2) => {
	newSize ??= getTargetSize()
	renderer.setSize(newSize.x, newSize.y)
	cssRenderer.setSize(window.innerWidth, window.innerHeight)
	sobelMat.uniforms.resolution.value = newSize.multiplyScalar(2)
}
export const initThree = () => {
	renderer.clear()
	renderer.shadowMap.enabled = true
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

export const renderGame = () => {
	const camera = cameraQuery.first?.camera
	if (!camera) return
	renderer.setRenderTarget(target)
	renderer.render(scene, camera)
	renderer.setRenderTarget(depthTarget)
	depthQuad.render(renderer)
	if (mainMenuState.enabled) {
		renderer.setRenderTarget(finalTarget)
	} else {
		renderer.setRenderTarget(null)
	}
	sobelQuad.render(renderer)

	cssRenderer.render(scene, camera)
}
