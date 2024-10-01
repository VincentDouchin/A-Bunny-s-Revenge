import type { Texture, WebGLRenderTarget } from 'three'
import { Color, Uniform, Vector2 } from 'three'
import kuwahara from '@/shaders/glsl/lib/kuwahara.glsl?raw'
import sobel from '@/shaders/glsl/lib/sobel.glsl?raw'
import { target } from '@/global/rendering'

// export const getDepthShader = (target: WebGLRenderTarget) => ({
// 	uniforms: {
// 		tDepth: new Uniform<Texture>(target.depthTexture),
// 		cameraNear: { value: 0.1 },
// 		cameraFar: { value: 100 },
// 		orthographic: { value: true },
// 	},
// 	vertexShader: /* glsl */`

// 		varying vec2 vUv;

// 		void main() {

// 			vUv = uv;

// 			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

// 		}`,
// 	fragmentShader: /* glsl */`
// 		precision highp sampler2D;
// 		uniform sampler2D tDepth;
// 		uniform sampler2D tDiffuse;
// 		uniform float cameraNear;
// 		uniform float cameraFar;
// 		uniform bool orthographic;
// 		uniform vec2 resolution;
// 		varying vec2 vUv;

// 		#include <packing>
//         float readDepth( sampler2D depthSampler, vec2 coord ) {
//             float fragCoordZ = texture2D( depthSampler, coord ).x;
//             float viewZ = orthographic
//             	? orthographicDepthToViewZ( fragCoordZ, cameraNear, cameraFar )
// 				: perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
//             return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
//         }

// 		void main() {
// 			float depth = readDepth( tDepth, vUv );
//         	gl_FragColor.rgb = 1.0 - vec3( depth );
// 			gl_FragColor.a = 1.0;

// 		}`,
// })

export const outlineShader = (target: WebGLRenderTarget, outlineTarget: WebGLRenderTarget) => ({
	name: 'outlineShader',
	uniforms: {
		tDepth: new Uniform(target.depthTexture),
		outlineDepth: new Uniform(outlineTarget.depthTexture),
		outlineText: new Uniform(outlineTarget.texture),

	},
	vertexShader: /* glsl */`
	varying vec2 vUv;
	void main() {
		vUv = uv;
		gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
	}`,
	fragmentShader: /* glsl */`
	uniform sampler2D tDepth;
	uniform sampler2D outlineDepth;
	uniform sampler2D outlineText;
	varying vec2 vUv;
	void main(){
		float textD = texture2D(tDepth,vUv).x; 
		float outlineD = texture2D(outlineDepth,vUv).x; 
		if(outlineD > textD){
			discard;
		}
		gl_FragColor = texture2D(outlineText,vUv);
	}
	`,
})

export const getSobelShader = (x: number, y: number, diffuseTarget: WebGLRenderTarget, outlineTarget: WebGLRenderTarget) => ({

	name: 'SobelOperatorShader',

	uniforms: {

		tDiffuse: new Uniform<Texture>(diffuseTarget.texture),
		tDepth: new Uniform<Texture>(target.depthTexture),
		outline: new Uniform<Texture>(outlineTarget.texture),
		resolution: new Uniform(new Vector2(x, y)),
		edgeColor: new Uniform(new Color(0x4D3533)),
		brightness: new Uniform(0),
		contrast: new Uniform(1),
		saturation: new Uniform(1),
		powRGB: new Uniform(new Color(0xFFFFFF)),
		mulRGB: new Uniform(new Color(0xFFFFFF)),
		addRGB: new Uniform(new Color(0x00000)),
		cameraNear: { value: 0.1 },
		cameraFar: { value: 100 },
	},

	vertexShader: /* glsl */`
	varying vec2 vUv;
	void main() {
		vUv = uv;
		gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
	}`,
	fragmentShader: /* glsl */`
		precision highp sampler2D;
		uniform sampler2D tDepth;
		uniform sampler2D tDiffuse;
		uniform sampler2D outline;
		uniform vec3 edgeColor;
		uniform vec2 resolution;
		varying vec2 vUv;
		uniform float brightness;
		uniform float contrast;
		uniform float saturation;
		uniform vec3 powRGB;
		uniform vec3 mulRGB;
		uniform vec3 addRGB;
		uniform float cameraNear;
		uniform float cameraFar;

		${kuwahara}
		${sobel}
		#include <packing>
	
		void main() {
			vec2 uv = vUv;
			float G = sobel2(tDepth,uv,resolution);	
			float Gfactor = clamp(step(G * 5.0,0.01)+0.8,0.0,1.0);
			vec3 tex_color = texture2D(tDiffuse,uv).rgb;
			float dark = step(0.4,(tex_color.r+tex_color.g+tex_color.b) /3.);
			vec4 color = vec4(mix(edgeColor,tex_color,Gfactor),1.); 
			
			// Adjust brightness
			color.rgb += brightness;

			// Adjust contrast
			color.rgb = (color.rgb - 0.5) * contrast + 0.5;

			// Adjust saturation
			float grey = dot(color.rgb, vec3(0.299, 0.587, 0.114));
			
			color.rgb = mix(vec3(grey), color.rgb, saturation);
			color.rgb = mulRGB * pow(color.rgb + addRGB, powRGB );
			color = sobel2(outline,uv,resolution)>0. 
				? vec4(1.)
				: color;
			gl_FragColor = color;
		}`,

})
