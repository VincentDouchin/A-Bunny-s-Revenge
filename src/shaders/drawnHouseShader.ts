import { ShaderMaterial, Uniform, Vector2 } from 'three'
import { assets } from '@/global/init'
import { finalTarget } from '@/global/rendering'
import noise from '@/shaders/glsl/lib/cnoise.glsl?raw'
import kuwahara from '@/shaders/glsl/lib/kuwahara.glsl?raw'

export const drawnHouseShader = () => new ShaderMaterial({
	uniforms: {
		house: new Uniform(finalTarget.texture),
		parchment: new Uniform(assets.textures.parchment),
		time: new Uniform(0),
		parchmentMix: new Uniform(0.7),
		windowSize: new Uniform(0),
		resolution: new Uniform(new Vector2(window.innerWidth, window.innerHeight)),
		kSize: new Uniform(5),
	},
	defines: {
		USE_UV: '',
	},
	vertexShader: /* glsl */`
	varying vec2 vUv;
	varying vec4 vPos;
	void main() {
		vUv = uv;
		vPos = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		gl_Position = vPos;
	}`,
	fragmentShader: /* glsl */`
	${noise}
	${kuwahara}
	varying vec2 vUv;
	varying vec4 vPos;
	uniform sampler2D house;
	uniform sampler2D parchment;
	uniform float time;
	uniform float windowSize;
	uniform float parchmentMix;
	uniform int kSize;
	uniform vec2 resolution;
	void main(){
		vec2 vCoords = vPos.xy;
		vCoords /= vPos.w;
		vCoords = vCoords * 0.5 + 0.5 ;
		vec4 house_color = kuwahara(house,resolution,vCoords,kSize);
		vec4 parchment_color = texture2D(parchment, vUv);
		vec2 centered_uv = abs(vUv *0.5 -0.25)*5.;
		float distance = abs(length(centered_uv));
		float mask = smoothstep(2., 0.0, distance);
		float noise =  step(0.5- mask - windowSize,cnoise(vec3(vUv*15.,time/10.))*(mask/2.));
		vec4 house_color_2 = mix(parchment_color,house_color,parchmentMix);
		vec4 mixed_color = mix(parchment_color,house_color_2,noise);
		gl_FragColor = mixed_color;
	}
	`,
})