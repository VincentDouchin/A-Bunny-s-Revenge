import type { ColorRepresentation, Shader, Texture, WebGLRenderer } from 'three'
import { MeshStandardMaterial, Uniform } from 'three'
import noise from '@/shaders/glsl/lib/cnoise.glsl?raw'

// export const groundShader = () => {
// 	const mat = new MeshStandardMaterial()
// 	mat.onBeforeCompile = (shader, _renderer) => {
// 		console.log(shader)
// 	}
// 	return mat
// }

// export class GroundShader extends ShaderMaterial {
// 	constructor(color1: Color) {
// 		super({
// 			uniforms: mergeUniforms([
// 				UniformsLib.lights,
// 				UniformsLib.fog,
// 				{
// 					color1: new Uniform(color1),
// 				},
// 			]),
// 			lights: true,

// 			vertexShader: /* glsl */`
// 				#include <common>
// 				#include <fog_pars_vertex>
// 				#include <shadowmap_pars_vertex>
// 				varying vec2 vUv;
// 				void main() {
// 					vUv = uv;
// 					#include <begin_vertex>
// 					#include <beginnormal_vertex>
// 					#include <project_vertex>
// 					#include <worldpos_vertex>
// 					#include <defaultnormal_vertex>
// 					#include <shadowmap_vertex>
// 					#include <fog_vertex>
// 				}
// 			`,

// 			fragmentShader: /* glsl */`
// 				#include <common>
// 				#include <packing>
// 				#include <fog_pars_fragment>
// 				#include <bsdfs>
// 				#include <lights_pars_begin>
// 				#include <shadowmap_pars_fragment>
// 				#include <shadowmask_pars_fragment>
// 				#include <dithering_pars_fragment>
// 				${cnoise}
// 				varying vec2 vUv;
// 				uniform vec3 color1;
// 				void main() {
// 					vec3 shadowColor = vec3(0, 0, 0);
// 					float shadowPower = 0.5;
// 					float noise = cnoise(vec3(vUv.xy,1)*25.);
// 					vec3 colorStepped = step(0.3,noise) ==1.?color1:color1 -vec3(0.05) ;
// 					gl_FragColor = vec4( mix(colorStepped, shadowColor, (1.0 - getShadowMask() ) * shadowPower), 1.0);
// 					#include <fog_fragment>
// 					#include <dithering_fragment>
// 				}
// 			`,
// 		})
// 	}
// }
import { gradient } from '@/shaders/glsl/lib/generateGradient'

export class GroundShader extends MeshStandardMaterial {
	shader?: Shader

	constructor(args: { color?: ColorRepresentation, map?: Texture | null }) {
		super(args)
	}

	onBeforeCompile(shader: Shader, _renderer: WebGLRenderer): void {
		shader.uniforms.is_ground = new Uniform(0)
		this.shader = shader
		shader.vertexShader = /* glsl */`
		#define USE_UV
		${shader.vertexShader}
		`
		shader.fragmentShader = /* glsl */`
		precision highp float;
		#define STANDARD
		#define USE_UV
		#ifdef PHYSICAL
			#define IOR
			#define USE_SPECULAR
		#endif
		uniform vec3 diffuse;
		uniform vec3 emissive;
		uniform float roughness;
		uniform float metalness;
		uniform float opacity;
		varying vec3 vViewPosition;
		#include <common>
		#include <packing>
		#include <dithering_pars_fragment>
		#include <color_pars_fragment>
		#include <uv_pars_fragment>
		#include <map_pars_fragment>
		#include <alphamap_pars_fragment>
		#include <alphatest_pars_fragment>
		#include <alphahash_pars_fragment>
		#include <aomap_pars_fragment>
		#include <lightmap_pars_fragment>
		#include <emissivemap_pars_fragment>
		#include <iridescence_fragment>
		#include <cube_uv_reflection_fragment>
		#include <envmap_common_pars_fragment>
		#include <envmap_physical_pars_fragment>
		#include <fog_pars_fragment>
		#include <lights_pars_begin>
		#include <normal_pars_fragment>
		#include <lights_physical_pars_fragment>
		#include <transmission_pars_fragment>
		#include <shadowmap_pars_fragment>
		#include <bumpmap_pars_fragment>
		#include <normalmap_pars_fragment>
		#include <clearcoat_pars_fragment>
		#include <iridescence_pars_fragment>
		#include <roughnessmap_pars_fragment>
		#include <metalnessmap_pars_fragment>
		#include <logdepthbuf_pars_fragment>
		#include <clipping_planes_pars_fragment>
		${gradient}
		${noise}
		uniform int is_ground;
		void main() {
			#include <clipping_planes_fragment>
			// vec4 diffuseColor = vec4( diffuse, opacity );
			vec4 diffuseColor = vec4( 1. );
			ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
			vec3 totalEmissiveRadiance = emissive;
			#include <logdepthbuf_fragment>
			// #include <map_fragment>
			
			// diffuseColor *= vec4(1.);
			// #include <color_fragment>
			#include <alphamap_fragment>
			#include <alphatest_fragment>
			#include <alphahash_fragment>
			#include <roughnessmap_fragment>
			#include <metalnessmap_fragment>
			#include <normal_fragment_begin>
			#include <normal_fragment_maps>
			// #include <clearcoat_normal_fragment_begin>
			// #include <clearcoat_normal_fragment_maps>
			#include <emissivemap_fragment>
			#include <lights_physical_fragment>
			#include <lights_fragment_begin>
			#include <lights_fragment_maps>
			#include <lights_fragment_end>
			#include <aomap_fragment>
			vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
			vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
			// vec3 outgoingLight = totalDiffuse;
			vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;

			#ifdef OPAQUE
			diffuseColor.a = 1.0;
			#endif
			vec4 color = vec4(1.);
			#ifdef USE_MAP
			vec4 sampledDiffuseColor = texture2D( map, vMapUv );
			color *= sampledDiffuseColor;
			#endif
			color.rgb *= diffuse;
			float max_light = max(outgoingLight.z,max(outgoingLight.x,outgoingLight.y)) * 3.;
			vec3 outgoingLight2 = colorRamp(color.xyz, max_light);
			gl_FragColor = vec4(  outgoingLight2  , diffuseColor.a );
			#include <tonemapping_fragment>
			#include <colorspace_fragment>
			#include <fog_fragment>
			#include <premultiplied_alpha_fragment>
			#include <dithering_fragment>
			
		}
`
	}
}
export class GroundShader2 extends MeshStandardMaterial {
	shader?: Shader

	constructor(args: { color?: ColorRepresentation, map?: Texture }) {
		super(args)
	}

	onBeforeCompile(shader: Shader, _renderer: WebGLRenderer): void {
		this.shader = shader
		shader.vertexShader = /* glsl */`
		#define USE_UV
		${shader.vertexShader}
		`
		shader.fragmentShader = /* glsl */`
		precision highp float;
		#define STANDARD
		#define USE_UV
		#ifdef PHYSICAL
			#define IOR
			#define USE_SPECULAR
		#endif
		uniform vec3 diffuse;
		uniform vec3 emissive;
		uniform float roughness;
		uniform float metalness;
		uniform float opacity;
		varying vec3 vViewPosition;
		#include <common>
		#include <packing>
		#include <dithering_pars_fragment>
		#include <color_pars_fragment>
		#include <uv_pars_fragment>
		#include <map_pars_fragment>
		#include <alphamap_pars_fragment>
		#include <alphatest_pars_fragment>
		#include <alphahash_pars_fragment>
		#include <aomap_pars_fragment>
		#include <lightmap_pars_fragment>
		#include <emissivemap_pars_fragment>
		#include <iridescence_fragment>
		#include <cube_uv_reflection_fragment>
		#include <envmap_common_pars_fragment>
		#include <envmap_physical_pars_fragment>
		#include <fog_pars_fragment>
		#include <lights_pars_begin>
		#include <normal_pars_fragment>
		#include <lights_physical_pars_fragment>
		#include <transmission_pars_fragment>
		#include <shadowmap_pars_fragment>
		#include <bumpmap_pars_fragment>
		#include <normalmap_pars_fragment>
		#include <clearcoat_pars_fragment>
		#include <iridescence_pars_fragment>
		#include <roughnessmap_pars_fragment>
		#include <metalnessmap_pars_fragment>
		#include <logdepthbuf_pars_fragment>
		#include <clipping_planes_pars_fragment>
		${gradient}
		${noise}
		void main() {
			#include <clipping_planes_fragment>
			// vec4 diffuseColor = vec4( diffuse, opacity );
			vec4 diffuseColor = vec4( 1. );
			ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
			vec3 totalEmissiveRadiance = emissive;
			#include <logdepthbuf_fragment>
			// #include <map_fragment>
			
			// diffuseColor *= vec4(1.);
			// #include <color_fragment>
			#include <alphamap_fragment>
			#include <alphatest_fragment>
			#include <alphahash_fragment>
			#include <roughnessmap_fragment>
			#include <metalnessmap_fragment>
			#include <normal_fragment_begin>
			#include <normal_fragment_maps>
			// #include <clearcoat_normal_fragment_begin>
			// #include <clearcoat_normal_fragment_maps>
			#include <emissivemap_fragment>
			#include <lights_physical_fragment>
			#include <lights_fragment_begin>
			#include <lights_fragment_maps>
			#include <lights_fragment_end>
			#include <aomap_fragment>
			vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
			vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
			// vec3 outgoingLight = totalDiffuse;
			vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;

			#ifdef OPAQUE
			diffuseColor.a = 1.0;
			#endif
			vec4 color = vec4(1.);
			float noise = cnoise(vec3(vUv.xy,1)*25.);
			color.rgb = step(0.3,noise) ==1. ? diffuse:diffuse -vec3(0.05) ;

			float max_light = max(outgoingLight.z,max(outgoingLight.x,outgoingLight.y)) * 3.;
			vec3 outgoingLight2 = colorRamp(color.xyz, max_light);
			gl_FragColor = vec4(  outgoingLight2  , diffuseColor.a );
			#include <tonemapping_fragment>
			#include <colorspace_fragment>
			#include <fog_fragment>
			#include <premultiplied_alpha_fragment>
			#include <dithering_fragment>
			
		}
`
	}
}

// export class GroundShader extends MeshToonMaterial {
// 	shader?: Shader
// 	onBeforeCompile(shader: Shader, _renderer: WebGLRenderer): void {
// 		shader.uniforms.color1 = new Uniform(new Color(0x26854C))
// 		this.shader = shader
// 		shader.vertexShader = /* glsl */`
// 		#define USE_UV
// 		${shader.vertexShader}
// 		`
// 		shader.fragmentShader = /* glsl */`
// 		#define TOON
// 		#define USE_UV
// 		uniform vec3 diffuse;
// 		uniform vec3 emissive;
// 		uniform float opacity;
// 		uniform vec3 color1;

// 		#include <common>
// 		#include <packing>
// 		#include <dithering_pars_fragment>
// 		#include <color_pars_fragment>
// 		#include <uv_pars_fragment>
// 		#include <map_pars_fragment>
// 		#include <alphamap_pars_fragment>
// 		#include <alphatest_pars_fragment>
// 		#include <alphahash_pars_fragment>
// 		#include <aomap_pars_fragment>
// 		#include <lightmap_pars_fragment>
// 		#include <emissivemap_pars_fragment>
// 		#include <gradientmap_pars_fragment>
// 		#include <fog_pars_fragment>
// 		#include <bsdfs>
// 		#include <lights_pars_begin>
// 		#include <normal_pars_fragment>
// 		#include <lights_toon_pars_fragment>
// 		#include <shadowmap_pars_fragment>
// 		#include <shadowmask_pars_fragment>
// 		#include <bumpmap_pars_fragment>
// 		#include <normalmap_pars_fragment>
// 		#include <logdepthbuf_pars_fragment>
// 		#include <clipping_planes_pars_fragment>
// 		${cnoise}
// 		void main() {

// 			#include <clipping_planes_fragment>

// 			vec4 diffuseColor = vec4( diffuse, opacity );
// 			ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
// 			vec3 totalEmissiveRadiance = emissive;

// 			#include <logdepthbuf_fragment>
// 			#include <map_fragment>
// 			#include <color_fragment>
// 			#include <alphamap_fragment>
// 			#include <alphatest_fragment>
// 			#include <alphahash_fragment>
// 			#include <normal_fragment_begin>
// 			#include <normal_fragment_maps>
// 			#include <emissivemap_fragment>

// 			// accumulation
// 			#include <lights_toon_fragment>
// 			#include <lights_fragment_begin>
// 			#include <lights_fragment_maps>
// 			#include <lights_fragment_end>

// 			// modulation
// 			#include <aomap_fragment>

// 			vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;

// 			#ifdef OPAQUE
// 			diffuseColor.a = 1.0;
// 			#endif

// 			#ifdef USE_TRANSMISSION
// 			diffuseColor.a *= material.transmissionAlpha;
// 			#endif
// 			vec3 shadowColor = vec3(0, 0, 0);
// 			float shadowPower = 0.5;
// 			float noise = cnoise(vec3(vUv.xy,1)*25.);
// 			vec3 colorStepped = step(0.3,noise) ==1.?color1:color1 -vec3(0.05) ;
// 			vec3 ground_with_shadows =  mix(colorStepped, shadowColor, (1.0 - getShadowMask() ) * shadowPower);
// 			// gl_FragColor = vec4(ground_with_shadows + (1.0 - outgoingLight)   ,1.);
// 			gl_FragColor = vec4(mix(outgoingLight,ground_with_shadows,0.1)  ,1.);
// 			gl_FragColor = vec4(ground_with_shadows,1.);
// 			#include <tonemapping_fragment>
// 			#include <colorspace_fragment>
// 			#include <fog_fragment>
// 			#include <premultiplied_alpha_fragment>
// 			#include <dithering_fragment>

// 		}

// 		`
// 	}
// }