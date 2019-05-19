export default `
varying vec3 vPosition;
void main()	{
	float tileWidth = 7.5;
	float z = tileWidth * step(tileWidth, mod(vPosition.z, tileWidth * 2.0));
	float x = step(tileWidth, mod(z + vPosition.x, tileWidth * 2.0));
	gl_FragColor = vec4(x, x, x, 1.0);
}
`
