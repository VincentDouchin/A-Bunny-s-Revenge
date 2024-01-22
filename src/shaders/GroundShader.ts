import type { ColorRepresentation, Shader, Texture, WebGLRenderer } from 'three'
import { MeshStandardMaterial, Uniform } from 'three'
import noise from '@/shaders/glsl/lib/cnoise.glsl?raw'

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
			color.rgb = step(0.3,noise) ==1. ? diffuse +vec3(0.05):diffuse ;

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
