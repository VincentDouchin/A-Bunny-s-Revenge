import type { Material, WebGLProgramParametersWithUniforms } from 'three'
import { CanvasTexture, Color, MeshPhongMaterial, MeshStandardMaterial, Uniform, Vector2 } from 'three'

import { generateUUID } from 'three/src/math/MathUtils'
import noise from '@/shaders/glsl/lib/cnoise.glsl?raw'

import { gradient } from '@/shaders/glsl/lib/generateGradient'
import { assets } from '@/global/init'
import { useLocalStorage } from '@/utils/useLocalStorage'

type Constructor<T> = new (...args: any[]) => T
export class MaterialExtension<U extends Record<string, any>> {
	_defines: Record<string, 1 | 0> = {}
	_vert: ((vertexShader: string) => string)[] = []
	_frag: ((fragmentShader: string) => string)[] = []
	key = generateUUID()
	constructor(public uniforms: U) {

	}

	defines(key: string) {
		this._defines[key] = 1
		return this
	}

	vert(...fn: ((vertexShader: string) => string)[]) {
		this._vert = fn
		return this
	}

	frag(...fn: ((fragmentShader: string) => string)[]) {
		this._frag = fn
		return this
	}
}

export const extendMaterial = <M extends Constructor<Material>, E extends MaterialExtension<any>[]>(Base: M, extensions: E, options?: { debug: boolean }) => {
	return class extends Base {
		uniforms = {} as any
		customProgramCacheKey() {
			return Base.name + extensions.map(ext => ext.key).join('-')
		}

		constructor(...args: any[]) {
			super(...args)
			for (const extension of extensions) {
				for (const [name, value] of Object.entries(extension.uniforms)) {
					const uniform = new Uniform(value);
					(<any> this.uniforms[name]) = uniform
				}
			}
		}

		onBeforeCompile(shader: WebGLProgramParametersWithUniforms): void {
			shader.defines ??= {}

			for (const extension of extensions) {
				for (const name of Object.keys(extension.uniforms)) {
					shader.uniforms[name] = this.uniforms[name]
				}
				for (const fn of extension._vert) {
					shader.vertexShader = fn(shader.vertexShader)
				}
				for (const fn of extension._frag) {
					shader.fragmentShader = fn(shader.fragmentShader)
				}
				for (const [define, value] of Object.entries(extension._defines)) {
					shader.defines[define] = value
				}
			}
			if (options?.debug) {
				// eslint-disable-next-line no-console
				console.log(shader.fragmentShader)
			}
		}
	}
}
export const importLib = (part: string) => (shader: string) => {
	return shader.replace('void main() {', `${part}\nvoid main() {`)
}
export const insertBefore = (before: string, part: string) => (shader: string) => {
	return shader.replace(before, `${before}\n${part}`)
}

export const replaceInclude = (include: string, part: string) => (shader: string) => {
	return shader.replace(`#include <${include}>`, part)
}
export const override = (variable: string, part: string) => (shader: string) => {
	return shader.split(`\n\t`).map(p => p.startsWith(variable) ? `${variable} = ${part};` : p).join(`\n\t`)
}
export const replace = (toReplace: string, part: string) => (shader: string) => {
	return shader.replace(toReplace, part)
}
export const addUniform = (name: string, type: 'vec2' | 'vec3' | 'vec4' | 'float' | 'int' | 'bool' | 'sampler2D') => (shader: string) => {
	return importLib(`uniform ${type} ${name};`)(shader)
}
export const remove = (toRemove: string) => (shader: string) => shader.replace(toRemove, '')
const toonExtension = new MaterialExtension({ }).frag(
	override('vec4 diffuseColor ', 'vec4(1.)'),
	importLib(gradient),
	replaceInclude('map_fragment', ''),
	replaceInclude('opaque_fragment', /* glsl */`
	vec4 color = vec4(1.);
	#ifdef USE_MAP
		vec4 sampledDiffuseColor = texture2D( map, vMapUv );
		color *= sampledDiffuseColor;
	#endif
	color.rgb *= diffuse;
	float max_light = max(outgoingLight.z,max(outgoingLight.x,outgoingLight.y)) * 3.;
	vec3 outgoingLight2 = colorRamp(color.xyz, max_light);
	gl_FragColor = vec4(  outgoingLight2 , opacity);`),
)
const [groundColors] = useLocalStorage('groundColor', {
	topColor: '#5AB552',
	pathColor: '#856342',
	pathColor2: '#A26D3F',
	grassColor: '#26854C',
})
const groundExtension = (image: HTMLCanvasElement, x: number, y: number) => {
	const level = new CanvasTexture(image)
	level.flipY = false
	return new MaterialExtension({
		level,
		size: new Vector2(x, y),
		grassColor2: new Color(groundColors.topColor),
		pathColor: new Color(groundColors.pathColor),
		pathColor2: new Color(groundColors.pathColor2),
		grassColor: new Color(groundColors.grassColor),
		ground: assets.textures.Dirt4_Dark,
	}).defines('USE_UV').frag(
		importLib(noise),
		addUniform('size', 'vec2'),
		addUniform('level', 'sampler2D'),
		addUniform(`pathColor2`, 'vec3'),
		addUniform(`pathColor`, 'vec3'),
		addUniform(`grassColor2`, 'vec3'),
		addUniform(`grassColor`, 'vec3'),
		remove('color.rgb *= diffuse;'),
		replace('vec4 color = vec4(1.);', /* glsl */`
			vec4 color = vec4(1.);
			vec2 scaled_uv = vUv*size/10.;
			float noise = cnoise(scaled_uv.xyx);
			float noise2 = cnoise((scaled_uv/2.).yxy);
			bool is_path = texture2D(level,vUv ).r == 1.0;
			vec3 path = step(cnoise(scaled_uv.yyy)+cnoise(scaled_uv.xyy)/2.,0.2) ==0.
					? pathColor
					: mix(pathColor,pathColor2,0.1) ;
			vec3 grass = step(0.4,noise2) == 1.
				? mix(grassColor,grassColor2,0.3)
				: step(0.3,noise) == 1.
					? mix(grassColor,grassColor2,0.2)
					: grassColor ;
			color.rgb = mix(grass,path,smoothstep(0.2,0.8,texture2D(level,vUv ).r) );
	`),
	) }

const treeExtension = new MaterialExtension({ playerZ: 0 }).frag(
	addUniform('playerZ', 'float'),
	replace('gl_FragColor = vec4(  outgoingLight2  , opacity);', /* glsl */`
	vec2 view = vViewPosition.xy ;
	float new_opacity = playerZ == 1. ? smoothstep(15.,25.,abs(length(view))) : opacity;
	gl_FragColor = vec4(  outgoingLight2  , new_opacity);
	`),
)
const characterExtension = new MaterialExtension({ flash: 0 }).frag(
	addUniform('flash', 'float'),
	override('gl_FragColor', `
	vec4(outgoingLight2 + vec3(flash), opacity);;
	`),
)
export const CharacterMaterial = extendMaterial(MeshStandardMaterial, [toonExtension, characterExtension])
export const ToonMaterial = extendMaterial(MeshStandardMaterial, [toonExtension])
export const GroundMaterial = (image: HTMLCanvasElement, x: number, y: number) => extendMaterial(MeshStandardMaterial, [toonExtension, groundExtension(image, x, y)])
export const TreeMaterial = extendMaterial(MeshPhongMaterial, [toonExtension, treeExtension])
