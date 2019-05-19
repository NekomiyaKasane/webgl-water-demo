export default `
uniform sampler2D simulationData;
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
varying vec3 vPosition;
varying vec3 vNormal;
vec4 difference(vec2 texCoord, vec2 base, float h) {
	vec2 tx = vec2(h / (XMAX - XMIN), h / (ZMAX - ZMIN));
	if (dot(base, texCoord - tx) < 0.0) {
		return (texture2D(simulationData, texCoord + base * tx) - texture2D(simulationData, texCoord)) / h;
	} else if (dot(base, texCoord + tx) > 1.0) {
		return (texture2D(simulationData, texCoord) - texture2D(simulationData, texCoord - base * tx)) / h;
	} else {
		return (texture2D(simulationData, texCoord + base * tx) - texture2D(simulationData, texCoord - base * tx)) / (2.0*h);
	}
}
void main()	{
	vec2 texCoord = vec2((position.x - XMIN) / (XMAX - XMIN), (position.z - ZMIN) / (ZMAX - ZMIN));
	vec4 simColor = texture2D(simulationData, texCoord);
	float dx = (XMAX-XMIN)/WIDTH_SEGMENTS;
	float dz = (ZMAX-ZMIN)/HEIGHT_SEGMENTS;
	vec3 n =  normalize(cross(
		normalize(vec3(0, difference(texCoord, vec2(0,1), dz).r, 1)),
		normalize(vec3(1, difference(texCoord, vec2(1,0), dx).r, 0))
	));
	vNormal = n;
	vec3 p = vec3(position.x, simColor.r, position.z);
	vPosition = p;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`
