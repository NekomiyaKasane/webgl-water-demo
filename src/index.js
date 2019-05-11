import * as THREE from 'three';

let OBJLoader = require('three-obj-loader'); OBJLoader(THREE);
let OrbitControls = require('three-orbitcontrols');
let scene, camera, renderer, light, meshes, textures, plane, controls, rayCastMouse;
let srt, srtScene, srtCamera, srtPlane, swapTarget;

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
	let p1 = new Promise((resolve, reject) => {
		textureLoader.load("assets/diffuse_tile.png", texture => {
			//texture.minFilter = THREE.NearestFilter;
			//texture.magFilter = THREE.NearestFilter;
			textures[0] = texture;
			resolve();
		});
	});
	let p2 = new Promise((resolve, reject) => {
		textureLoader.load("assets/wood_diffuse.png", texture => {
			//texture.minFilter = THREE.NearestFilter;
			//texture.magFilter = THREE.NearestFilter;
			textures[1] = texture;
			resolve();
		});
	});
	return Promise.all([p1, p2]);
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
			vertexShader: document.getElementById('srtVertexShader').textContent,
			fragmentShader: document.getElementById('srtFragmentShader').textContent,
		})
	);
	srtScene.add(srtPlane);
	srtPlane.position.z = -100;
	// Scene
	scene = new THREE.Scene();
	let cubeTex = new THREE.CubeTextureLoader()
		.setPath( 'assets/ely_mountain/' )
		.load( [
			'mountain_ft.png',
			'mountain_bk.png',
			'mountain_up.png',
			'mountain_dn.png',
			'mountain_rt.png',
			'mountain_lf.png'
		] );
	rayCastMouse = new THREE.Vector3(0, 0, 0);
	//scene.background = cubeTex;
	camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );
	camera.position.x = 0.5*XMAX+0.5*XMIN;
	camera.position.y = YMAX+0.66*(YMAX-YMIN);
	camera.position.z = -15+(ZMIN+ZMAX);
	camera.lookAt(new THREE.Vector3(0.5*(XMIN+XMAX), YMIN*0.5+YMAX*0.5, 0.5*(ZMIN+ZMAX)));
	renderer = new THREE.WebGLRenderer();
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.getElementById("three").appendChild( renderer.domElement );
	//controls = new THREE.OrbitControls(camera, renderer.domElement);
	//controls.target.set(0.5*(XMIN+XMAX), YMIN*0.5+YMAX*0.5, 0.5*(ZMIN+ZMAX));
	light = new THREE.PointLight( 0xffffff, 0.25, 0, 0);
	light.position.set( camera.position.x, camera.position.y, camera.position.z );
	scene.add( light );
	var ambientLight = new THREE.AmbientLight( 0xffffff, 0.75 );
	scene.add( ambientLight );
	meshes.forEach(mesh => { scene.add(mesh); });
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
			vertexShader: document.getElementById( 'waterVertexShader' ).textContent,
			fragmentShader: document.getElementById( 'waterFragmentShader' ).textContent
		})
	);
	scene.add(plane);

};

let animate = () => {
	requestAnimationFrame(animate);
	// DT = Date.now() / 1000.0 - T0 - T;
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
	// render scene
  renderer.setRenderTarget(null);
	//controls.update();
	light.position.set( camera.position.x, camera.position.y, camera.position.z );
	plane.material.uniforms.cameraPosition.value = camera.position;
	plane.material.uniforms.simulationData.value = swapTarget.texture;
	plane.material.uniforms.T.value = T;
	plane.material.uniforms.DT.value = DT;
	renderer.render( scene, camera );
	FRAME++;
};

loadTextures().then(() => {
	loadAssets().then(() => {
		init();
		animate();
	});
});


document.getElementById("three").addEventListener("mousemove", event => {
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
