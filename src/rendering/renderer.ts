import { ACESFilmicToneMapping, BasicShadowMap, SRGBColorSpace, WebGPURenderer } from 'three/webgpu'
import type { Settings } from 'src/global/save'

export const getRenderer = async (settings: Settings) => {
	const renderer = new WebGPURenderer({ alpha: false })
	await renderer.init()
	renderer.debug.checkShaderErrors = false
	renderer.setPixelRatio(1)
	renderer.clear()
	renderer.shadowMap.enabled = !settings.disableShadows
	renderer.shadowMap.type = BasicShadowMap
	renderer.domElement.classList.add('main')
	document.body.appendChild(renderer.domElement)
	renderer.outputColorSpace = SRGBColorSpace
	renderer.toneMapping = ACESFilmicToneMapping
	renderer.toneMappingExposure = 0.8
	renderer.setSize(window.innerWidth, window.innerHeight, false)
	return renderer
}
