# webgl-water-demo
Real-time WebGL simulation of the "Shallow Water Equations".

Try it out here https://vuoriov4.github.io/webgl-water-demo/

# Integration scheme?
- Central difference for 1st order spatial derivative
- Forwards-backwards difference for 2nd order
- "Lax-friedrichs" scheme for integrating height with respect to time
- "Euler" scheme for integrating velocity with respect to time
- Points outside the boundary are obtained by reflecting with respect to normal vector

# Credits

Skybox: https://opengameart.org/content/space-nebulas-skybox

ThreeJS: https://threejs.org
