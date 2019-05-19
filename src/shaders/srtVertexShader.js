export default `
varying vec2 texCoord;
uniform vec2 resolution;
void main()	{
	texCoord = uv; // 0.5 + position.xy / resolution;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`
