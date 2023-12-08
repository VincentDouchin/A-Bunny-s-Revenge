import type { Color } from 'three'
import { ShaderMaterial, Uniform, UniformsLib } from 'three'
import { mergeUniforms } from 'three/src/renderers/shaders/UniformsUtils.js'
import cnoise from '@/shaders/glsl/lib/cnoise.glsl?raw'

export class GroundShader extends ShaderMaterial {
	constructor(color1: Color) {
		super({
			 uniforms: mergeUniforms([
				UniformsLib.lights,
				UniformsLib.fog,
				{
					color1: new Uniform(color1),
				},
			]),
			lights: true,

			vertexShader: /* glsl */`
				#include <common>
				#include <fog_pars_vertex>
				#include <shadowmap_pars_vertex>
				varying vec2 vUv;
				void main() {
					vUv = uv;
					#include <begin_vertex>
					#include <beginnormal_vertex>
					#include <project_vertex>
					#include <worldpos_vertex>
					#include <defaultnormal_vertex> 
					#include <shadowmap_vertex>
					#include <fog_vertex>
				}
			`,

			fragmentShader: /* glsl */`
				#include <common>
				#include <packing>
				#include <fog_pars_fragment>
				#include <bsdfs>
				#include <lights_pars_begin>
				#include <shadowmap_pars_fragment>
				#include <shadowmask_pars_fragment>
				#include <dithering_pars_fragment>
				${cnoise}
				varying vec2 vUv;
				uniform vec3 color1;
				void main() {
					vec3 shadowColor = vec3(0, 0, 0);
					float shadowPower = 0.5;
					float noise = cnoise(vec3(vUv.xy,1)*25.);
					vec3 colorStepped = step(0.3,noise) ==1.?color1:color1 -vec3(0.05) ;
					gl_FragColor = vec4( mix(colorStepped, shadowColor, (1.0 - getShadowMask() ) * shadowPower), 1.0);
					#include <fog_fragment>
					#include <dithering_fragment>
				}
			`,
		})
	}
}