import * as THREE from 'three';

let OBJLoader = require('three-obj-loader'); OBJLoader(THREE);
let OrbitControls = require('three-orbitcontrols');
let scene, camera, renderer, light, meshes, textures, plane, controls, rayCastMouse;
let srt, srtScene, srtCamera, srtPlane, swapTarget;
let cameraRotation = 0.0;
let cameraTarget = new THREE.Vector3();

let XMIN = 1; 	let XMAX = 61;
let YMIN = 0; 	let YMAX = 20;
let ZMIN = -47; let ZMAX = 1;
let PLANE_WIDTH = XMAX - XMIN;
let PLANE_HEIGHT = ZMAX - ZMIN;
let WIDTH_SEGMENTS = 256;
let HEIGHT_SEGMENTS = Math.round(PLANE_HEIGHT * WIDTH_SEGMENTS / PLANE_WIDTH);
let T0 = Date.now() / 1000.0;
let T = 0;
let DT = 0.0125;
let FRAME = 0;
let MOUSE_DOWN = 0.0;
let MOUSE_POSITION = new THREE.Vector2(0.5, 0.5);

let loadTextures = () => {
	var textureLoader = new THREE.TextureLoader();
	textures = [];
	return new Promise((resolve, reject) => {
		textureLoader.load("assets/diffuse_tile.png", texture => {
			textures[0] = texture;
			resolve();
		});
	});
}

let loadAssets = () => {
	let loader = new THREE.OBJLoader();
	return new Promise((resolve, reject) => {
		loader.load(
			'assets/pool.obj',
			(object) => {
				console.log("pool.obj", object);
				meshes = [];
				object.children.forEach((mesh, i) => {
					if (i == 0) {
						// pool
						let material = new THREE.MeshPhongMaterial({ map: textures[0], side: THREE.DoubleSide });
						meshes.push(new THREE.Mesh(
							new THREE.Geometry().fromBufferGeometry(mesh.geometry),
							material
						));
					} else if (i == 2) {
						// ladder
						let material = new THREE.MeshPhongMaterial({ color: 0xa0a0a0, side: THREE.DoubleSide });
						meshes.push(new THREE.Mesh(
							new THREE.Geometry().fromBufferGeometry(mesh.geometry),
							material
						));
					}
				});
				resolve();
			},
			(xhr) => {
				console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
			},
			reject
		);
	});
}

let addDebugSphere = (x, y, z) => {
	let sphere = new THREE.SphereGeometry(1).translate(x, y, z);
	scene.add(new THREE.Mesh(sphere, new THREE.MeshBasicMaterial({color: 0xff0000})));
}

let init = () => {
	// Simulation render target
	let renderTargetOptions = { format: THREE.RGBAFormat , type: THREE.FloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter };
	swapTarget = new THREE.WebGLRenderTarget(WIDTH_SEGMENTS + 1, HEIGHT_SEGMENTS + 1, renderTargetOptions);
	srt 			 = new THREE.WebGLRenderTarget(WIDTH_SEGMENTS + 1, HEIGHT_SEGMENTS + 1, renderTargetOptions);
	srtScene	 = new THREE.Scene();
	srtCamera  = new THREE.OrthographicCamera(
		-(WIDTH_SEGMENTS  + 1) / 2,
		 (WIDTH_SEGMENTS  + 1) / 2,
		 (HEIGHT_SEGMENTS + 1) / 2,
		-(HEIGHT_SEGMENTS + 1) / 2,
		-500, 1000
	);
	srtPlane = new THREE.Mesh(
		new THREE.PlaneGeometry(WIDTH_SEGMENTS + 1, HEIGHT_SEGMENTS + 1, 1, 1),
		new THREE.ShaderMaterial({
			uniforms: {
				FRAME: 					{ value: FRAME },
				XMIN: 					{ value: XMIN },
				XMAX: 					{ value: XMAX },
				YMIN: 					{ value: YMIN },
				YMAX: 					{ value: YMAX },
				ZMIN: 					{ value: ZMIN },
				ZMAX: 					{ value: ZMAX },
				WIDTH_SEGMENTS: { value: WIDTH_SEGMENTS },
				HEIGHT_SEGMENTS:{ value: HEIGHT_SEGMENTS },
				T:							{ value: T },
				DT:							{ value: DT },
				MOUSE_DOWN:			{ value: MOUSE_DOWN },
				MOUSE_POSITION:	{ value: MOUSE_POSITION },
				DT:							{ value: DT },
				dx:							{ value: (XMAX - XMIN) / (WIDTH_SEGMENTS + 1) },
				dz:							{ value: (ZMAX - ZMIN) / (HEIGHT_SEGMENTS + 1) },
				resolution: 		{ value: new THREE.Vector2(WIDTH_SEGMENTS + 1, HEIGHT_SEGMENTS + 1) },
				simulationData: { type: 't', value: swapTarget.texture }
			},
			vertexShader: require('./shaders/srtVertexShader.js'),
			fragmentShader: require('./shaders/srtFragmentShader.js')
		})
	);
	srtScene.add(srtPlane);
	srtPlane.position.z = -100;
	// Scene
	scene = new THREE.Scene();
	// Sky
	let cubeTex = new THREE.CubeTextureLoader()
		.setPath( 'assets/spacebox/' )
		.load( [
			'skybox_left.png',
			'skybox_right.png',
			'skybox_up.png',
			'skybox_down.png',
			'skybox_front.png',
			'skybox_back.png'
		] );
	rayCastMouse = new THREE.Vector3(0, 0, 0);
	scene.background = cubeTex;
	// Renderer
	renderer = new THREE.WebGLRenderer();
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.getElementById("three").appendChild( renderer.domElement );
	// Camera
	camera = new THREE.PerspectiveCamera(30, window.innerWidth/window.innerHeight, 0.1, 1000 );
	camera.position.x = 0.5*XMAX + 0.5*XMIN
	camera.position.y = 3.5 *(YMAX-YMIN);
	camera.position.z = 2.5 *(ZMAX+ZMIN);
	cameraTarget.x = 0.5*(XMIN+XMAX);
	cameraTarget.y = YMIN*0.5+YMAX*0.5;
	cameraTarget.z = 0.5*ZMAX + 0.5*ZMIN;
	camera.lookAt(cameraTarget);
	controls = new THREE.OrbitControls( camera );
	controls.autoRotate = true;
	controls.autoRotateSpeed = 1.0;
	controls.enableZoom = false;
	controls.enablePan = false;
	controls.enableRotate = false;
	controls.target = cameraTarget;
	// Lights
	light = new THREE.PointLight( 0xffffff, 0.25, 0, 0);
	light.position.set( camera.position.x, camera.position.y, camera.position.z );
	scene.add( light );
	var ambientLight = new THREE.AmbientLight( 0xffffff, 0.75 );
	scene.add( ambientLight );
	// Pool
	meshes.forEach(mesh => { scene.add(mesh); });
	// Water plane
	plane = new THREE.Mesh(
		new THREE.PlaneGeometry(PLANE_WIDTH, PLANE_HEIGHT, WIDTH_SEGMENTS, HEIGHT_SEGMENTS)
			.rotateX(-Math.PI/2)
			.translate(0.5*(XMIN+XMAX), 0.5*(YMIN+YMAX), 0.5*(ZMIN+ZMAX)),
		new THREE.ShaderMaterial({
			uniforms: {
				cameraPosition: { value: camera.position },
				lightDirection: { value: light.position },
				poolTexture: 		{ type: 't', value: textures[0] },
				simulationData: { type: 't', value: swapTarget.texture },
				cubeTexture:		{ value: cubeTex },
				WIDTH_SEGMENTS: { value: WIDTH_SEGMENTS },
				HEIGHT_SEGMENTS:{ value: HEIGHT_SEGMENTS },
				T:    					{ value: T },
				DT:   					{ value: DT },
				XMIN: 					{ value: XMIN },
				XMAX: 					{ value: XMAX },
				YMIN: 					{ value: YMIN },
				YMAX: 					{ value: YMAX },
				ZMIN: 					{ value: ZMIN },
				ZMAX: 					{ value: ZMAX }
			},
			vertexShader: require('./shaders/waterVertexShader.js'),
			fragmentShader: require('./shaders/waterFragmentShader.js')
		})
	);
	scene.add(plane);
	// Floor plane
	let floorMaterial = new THREE.ShaderMaterial({
		vertexShader: require('./shaders/floorVertexShader.js'),
		fragmentShader: require('./shaders/floorFragmentShader.js')
	});
	let planeWidth = 1000;
	let plane1 = new THREE.Mesh(new THREE.PlaneGeometry(planeWidth, ZMAX - ZMIN, 1, 1), floorMaterial);
	plane1.position.x = XMAX + planeWidth/2;
	plane1.position.y = YMAX;
	plane1.position.z = ZMIN*0.5 + ZMAX*0.5;
	plane1.rotation.x = -Math.PI/2;
	//scene.add(plane1);
	let plane2 = new THREE.Mesh(new THREE.PlaneGeometry(planeWidth, ZMAX - ZMIN, 1, 1), floorMaterial);
	plane2.position.x = XMIN - planeWidth/2;
	plane2.position.y = YMAX;
	plane2.position.z = ZMIN*0.5 + ZMAX*0.5;
	plane2.rotation.x = -Math.PI/2;
	//scene.add(plane2);
	let plane3 = new THREE.Mesh(new THREE.PlaneGeometry(planeWidth, 2 * planeWidth + XMAX - XMIN, 1, 1), floorMaterial);
	plane3.position.x = XMIN * 0.5 + XMAX * 0.5;
	plane3.position.y = YMAX;
	plane3.position.z = ZMAX + planeWidth/2;
	plane3.rotation.x = -Math.PI/2;
	plane3.rotation.z = Math.PI/2;
	//scene.add(plane3);
	let plane4 = new THREE.Mesh(new THREE.PlaneGeometry(planeWidth, 2 * planeWidth + XMAX - XMIN, 1, 1), floorMaterial);
	plane4.position.x = XMIN * 0.5 + XMAX * 0.5;
	plane4.position.y = YMAX;
	plane4.position.z = ZMIN - planeWidth/2;
	plane4.rotation.x = -Math.PI/2;
	plane4.rotation.z = Math.PI/2;
	//scene.add(plane4);
};

let animate = () => {
	// (Keep time delta fixed for stability)
	T = T + DT;
	// render simulation render target
	srtPlane.material.uniforms.FRAME.value = FRAME;
	srtPlane.material.uniforms.simulationData.value = swapTarget.texture;
	srtPlane.material.uniforms.T.value = T;
	srtPlane.material.uniforms.DT.value = DT;
	srtPlane.material.uniforms.MOUSE_DOWN.value = MOUSE_DOWN;
	renderer.render(srtScene, srtCamera, srt);
	// swap render targets
	let temp = swapTarget;
	swapTarget = srt;
	srt = temp;
	cameraRotation += DT;
	// controls
	controls.update();
	// render scene
  renderer.setRenderTarget(null);
	light.position.set( camera.position.x, camera.position.y, camera.position.z );
	plane.material.uniforms.cameraPosition.value = camera.position;
	plane.material.uniforms.simulationData.value = swapTarget.texture;
	plane.material.uniforms.T.value = T;
	plane.material.uniforms.DT.value = DT;
	renderer.render( scene, camera );
	FRAME++;
	// limit framerate to max 60fps
	let ms = Date.now() / 1000.0 - T0 - T;
	let max = 17;
	if (ms < max) {
		setTimeout(() => {
			requestAnimationFrame(animate);
		}, max - ms);
	} else {
		requestAnimationFrame(animate);
	}
}

let reset = () => {
	// setting frame to zero will cause data reset in shader
	FRAME = 0;
}

document.getElementById("three").addEventListener("mousemove", event => {
	if (rayCastMouse === undefined) return; // mouse moved before init()
	rayCastMouse.set(
		(event.clientX / window.innerWidth ) * 2 - 1,
		- (event.clientY / window.innerHeight ) * 2 + 1,
		0.5
	);
	rayCastMouse.unproject(camera);
	rayCastMouse.sub(camera.position).normalize();
	let distance = (0.75*YMAX - camera.position.y) / (rayCastMouse.y);
	let x = camera.position.x + rayCastMouse.x * distance;
	x = Math.min(1, Math.max(0, (x - XMIN) / (XMAX - XMIN)));
	let z = camera.position.z + rayCastMouse.z * distance;
	z =  Math.min(1, Math.max(0,(z - ZMIN) / (ZMAX - ZMIN)));
	MOUSE_POSITION.x = x;
	MOUSE_POSITION.y = z;
});

document.getElementById("three").addEventListener("mousedown", event => {
	MOUSE_DOWN = 1.0;
});

document.getElementById("three").addEventListener("mouseup", event => {
	MOUSE_DOWN = 0.0;
});

document.getElementById("reset-button").addEventListener("click", event => {
	reset();
});


loadTextures().then(() => {
	loadAssets().then(() => {
		init();
		animate();
	});
});
