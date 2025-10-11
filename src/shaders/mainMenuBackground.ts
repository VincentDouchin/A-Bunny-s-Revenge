import { Color, ShaderMaterial, Uniform, Vector2 } from 'three'
import noise from '@/shaders/glsl/lib/cnoise.glsl?raw'

export const mainMenuBackgound = new ShaderMaterial({
	uniforms: {
		time: new Uniform(0),
		resolution: new Uniform(new Vector2(window.innerWidth, window.innerHeight)),
		color1: new Uniform(new Color(0x228399)),
		color2: new Uniform(new Color(0x041B38)),
		color3: new Uniform(new Color(0x145D87)),
	},
	vertexShader: /* glsl */`
	varying vec2 vUv;
	varying vec4 vPos;
	void main() {
		vUv = uv;
		vPos = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		gl_Position = vPos;
	}
	`,
	fragmentShader: /* glsl */`
	${noise}
	uniform vec3 color1;
	uniform vec3 color2;
	uniform vec3 color3;
	uniform float time;
	uniform vec2 resolution;
	varying vec4 vPos;
	float speed = 4000.;
	void main(){
		vec2 vCoords = vPos.xy;
		vCoords /= vPos.w;
		vCoords = (vCoords * 0.5 + 0.5) * resolution/100.;
		float t = time/speed;
		float n1 = cnoise(vec3(t,vCoords.x+t,vCoords.y)) ;
		float n2 = cnoise(vec3(t,vCoords.x,vCoords.y+t)) ;
		vec3 c1 = mix(color2,color1,(n1+n2));
		float n3 = cnoise(vec3(t/2.,vCoords.x+t,vCoords.y+t));
		vec3 c4 = c1 + color3*n3;
		gl_FragColor = vec4(c4,1.);
	}
	`,
})