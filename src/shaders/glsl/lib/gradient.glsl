vec3 colorRamp(vec3 color, float value) {
    float position1 = 0.1;
    float position2 = 0.5;
    float position3 = 1.0;
    float position4 = 2.;

	vec3 color1 = color * 0.5;
	vec3 color2 = color * 1.0;
	vec3 color3 = color * 1.3;
	vec3 color4 = color * 2.;

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
}