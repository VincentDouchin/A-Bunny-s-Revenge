const existingData = localStorage.getItem('toonGradient')
const { colors, stops } = existingData
	? JSON.parse(existingData) as any
	: { colors: [0.5, 1.5, 1.7, 2.5], stops: [0.1, 0.5, 1.0, 2.0] }

const glslFloat = (nb: number) => Number.isInteger(nb) ? `${nb}.` : String(nb)
export const gradient = /* glsl */`
	vec3 colorRamp(vec3 color, float value) {
		float position1 = ${glslFloat(stops[0])};
		float position2 = ${glslFloat(stops[1])};
		float position3 = ${glslFloat(stops[2])};
		float position4 = ${glslFloat(stops[3])};

		vec3 color1 = color * ${glslFloat(colors[0])};
		vec3 color2 = color * ${glslFloat(colors[1])};
		vec3 color3 = color * ${glslFloat(colors[2])};
		vec3 color4 = color * ${glslFloat(colors[3])};

		// Interpolate between colors based on the value
		if (value <= position1) {
			return color1;
		} else if (value <= position2) {
			return color1* step(position1, value);
		} else if (value <= position3) {
			return color2* step(position2, value);
		} else if (value <= position4) {
			return color3 * step(position3, value);
		} else {
			return color4;
		}
	}`