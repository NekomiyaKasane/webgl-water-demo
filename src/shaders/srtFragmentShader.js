export default `
#define viscosity 0.1
#define gravity 5.25
#define coriolis 0.0
#define drag 0.1
varying vec2 texCoord;
uniform sampler2D simulationData;
uniform float FRAME;
uniform float T;
uniform float DT;
uniform float XMIN;
uniform float XMAX;
uniform float YMIN;
uniform float YMAX;
uniform float ZMIN;
uniform float ZMAX;
uniform float WIDTH_SEGMENTS;
uniform float HEIGHT_SEGMENTS;
uniform float MOUSE_DOWN;
uniform vec2 MOUSE_POSITION;
uniform float dx;
uniform float dz;
vec4 difference(vec4 current, vec2 texCoord, vec2 base, float h) {
	vec2 tx = vec2(h / (XMAX - XMIN), h / (ZMAX - ZMIN));
	vec4 boundary;
	if (dot(base, texCoord - tx) < 0.0) {
		boundary = texture2D(simulationData, texCoord + base * tx);
		boundary.g *= base.x >= 1.0 ? -1.0 : 1.0;
		boundary.b *= base.y >= 1.0 ? -1.0 : 1.0;
	} else if (dot(base, texCoord + tx) > 1.0) {
		boundary = texture2D(simulationData, texCoord - base * tx);
		boundary.g *= base.x >= 1.0 ? -1.0 : 1.0;
		boundary.b *= base.y >= 1.0 ? -1.0 : 1.0;
	}
	return (texture2D(simulationData, texCoord + base * tx) - texture2D(simulationData, texCoord - base * tx)) / (2.0*h);
}
vec4 difference2(vec4 current, vec2 texCoord, vec2 base, float h) {
	vec2 tx = vec2(h / (XMAX - XMIN), h / (ZMAX - ZMIN));
	vec4 boundary;
	if (dot(base, texCoord - tx) < 0.0) {
		boundary = texture2D(simulationData, texCoord + base * tx);
		boundary.g *= base.x >= 1.0 ? -1.0 : 1.0;
		boundary.b *= base.y >= 1.0 ? -1.0 : 1.0;
	} else if (dot(base, texCoord + tx) > 1.0) {
		boundary = texture2D(simulationData, texCoord - base * tx);
		boundary.g *= base.x >= 1.0 ? -1.0 : 1.0;
		boundary.b *= base.y >= 1.0 ? -1.0 : 1.0;
	}
	return (texture2D(simulationData, texCoord + base * tx) - 2.0 * current +  texture2D(simulationData, texCoord - base * tx)) / (h*h);
}
float dhdt(vec4 current, vec2 texCoord, float dx, float dz) {
	vec4 dfx = difference(current, texCoord, vec2(1, 0), dx);
	vec4 dfz = difference(current, texCoord, vec2(0, 1), dz);
	return -(current.r*dfx.g + current.g*dfx.r + current.r*dfz.b + current.b*dfz.r);
}
float dudt(vec4 current, vec2 texCoord, float dx, float dz) {
	vec4 dfx = difference(current, texCoord, vec2(1, 0), dx);
	vec4 dfz = difference(current, texCoord, vec2(0, 1), dz);
	vec4 dfx2 = difference2(current, texCoord, vec2(1, 0), dx);
	vec4 dfz2 = difference2(current, texCoord, vec2(0, 1), dz);
	return viscosity * (dfx2.g + dfz2.g) - current.g * dfx.g - current.b * dfz.g - gravity * dfx.r + coriolis * current.b - drag*current.g;
}
float dvdt(vec4 current, vec2 texCoord, float dx, float dz) {
	vec4 dfx = difference(current, texCoord, vec2(1, 0), dx);
	vec4 dfz = difference(current, texCoord, vec2(0, 1), dz);
	vec4 dfx2 = difference2(current, texCoord, vec2(1, 0), dx);
	vec4 dfz2 = difference2(current, texCoord, vec2(0, 1), dz);
	return viscosity * (dfx2.b + dfz2.b) - current.g * dfx.b - current.b * dfz.b - gravity * dfz.r  - coriolis * current.b - drag*current.b;
}
void main()	{
	vec3 color;
	float H = 0.75*(YMIN + YMAX);
	float dx = (XMAX-XMIN)/WIDTH_SEGMENTS;
	float dz = (ZMAX-ZMIN)/HEIGHT_SEGMENTS;
	if (FRAME == 0.0) {
		color = vec3(min(YMAX, max(YMIN, H)), 0, 0);
	} else {
		float len = length(texCoord - MOUSE_POSITION);
		float userInput = MOUSE_DOWN * 1.5 * (YMAX-YMIN) * exp(-400.0 * len * len);
		vec4 current = texture2D(simulationData, texCoord);
		vec4 right =   texture2D(simulationData, texCoord + vec2(1.0/WIDTH_SEGMENTS, 0.0));
		vec4 up =      texture2D(simulationData, texCoord + vec2(0.0, 1.0/HEIGHT_SEGMENTS));
		vec4 left =    texture2D(simulationData, texCoord + vec2(-1.0/WIDTH_SEGMENTS, 0.0));
		vec4 down =    texture2D(simulationData, texCoord + vec2(0.0, -1.0/HEIGHT_SEGMENTS));
		color = vec3(
			// Lax-friedrichs time step / clamping / user deform
			min(YMAX, 0.25 * (right.r + up.r + left.r + down.r) + dhdt(current, texCoord, dx, dz) * DT + userInput * DT),
			// Euler time step (velocity)
			current.g + dudt(current, texCoord, dx, dz) * DT,
			current.b + dvdt(current, texCoord, dx, dz) * DT
		);
	}
	gl_FragColor = vec4(color, 1.0);
}
`
