export default `
#define EPSILON 0.001
uniform vec3 lightDirection;
uniform sampler2D poolTexture;
uniform samplerCube cubeTexture;
uniform float XMIN;
uniform float XMAX;
uniform float YMIN;
uniform float YMAX;
uniform float ZMIN;
uniform float ZMAX;
uniform float T;
varying vec3 vPosition;
varying vec3 vNormal;
struct intersection {
	bool hit;
	float distance;
};
intersection intersect_box(vec3 bmin, vec3 bmax, vec3 ray_origin, vec3 ray_direction) {
	intersection result;
	result.hit = false;
	vec3 dirfrac;
	dirfrac.x = 1.0 / ray_direction.x; // todo: precompute
	dirfrac.y = 1.0 / ray_direction.y; // todo: precompute
	dirfrac.z = 1.0 / ray_direction.z; // todo: precompute
	float t1 = (bmin.x - ray_origin.x)*dirfrac.x;
	float t2 = (bmax.x - ray_origin.x)*dirfrac.x;
	float t3 = (bmin.y - ray_origin.y)*dirfrac.y;
	float t4 = (bmax.y - ray_origin.y)*dirfrac.y;
	float t5 = (bmin.z - ray_origin.z)*dirfrac.z;
	float t6 = (bmax.z - ray_origin.z)*dirfrac.z;
	float tmin = max(max(min(t1, t2), min(t3, t4)), min(t5, t6));
	float tmax = min(min(max(t1, t2), max(t3, t4)), max(t5, t6));
	// if tmax < 0, ray (line) is intersecting AABB, but the whole AABB is behind us
	if (tmax < 0.0) return result; // miss
	// if tmin > tmax, ray doesn't intersect AABB
	if (tmin > tmax) return result; // miss
	result.hit = true;
	result.distance = tmin;
	return result;
}
float light(vec3 normal, vec3 position) {
	// return light intensity at given normal and position
	vec3 dir1 = normalize(vec3(1,0,0));
	vec3 dir2 = normalize(vec3(0,1,0));
	vec3 dir3 = normalize(vec3(0,0,1));
	vec3 dir = normalize(cameraPosition - position);
	return 0.75 + 0.25 * max(0.0, dot(dir, normal));
}
vec2 poolTextureCoords(vec3 iPosition) {
	if (iPosition.x < XMIN + EPSILON || iPosition.x > XMAX - EPSILON) {
		return mod(0.5*vec2(ZMAX - iPosition.z, YMAX - iPosition.y), 1.0);
	} else if (iPosition.y < YMIN + EPSILON || iPosition.y > YMAX - EPSILON) {
		return mod(0.5*vec2(ZMAX - iPosition.z, XMAX - iPosition.x), 1.0);
	} else if (iPosition.z < ZMIN + EPSILON || iPosition.z > ZMAX - EPSILON) {
		return mod(0.5*vec2(XMAX - iPosition.x, YMAX - iPosition.y), 1.0);
	} else {
		return vec2(0,0);
	}
}
vec3 poolNormal(vec3 iPosition) {
	if (iPosition.x < XMIN + EPSILON || iPosition.x > XMAX - EPSILON) {
		return vec3(-1,0,0) * sign(iPosition.x - 0.5*XMIN - 0.5*XMAX);
	} else if (iPosition.y < YMIN + EPSILON || iPosition.y > YMAX - EPSILON) {
		return vec3(0,-1,0) * sign(iPosition.y - 0.5*YMIN - 0.5*YMAX);
	} else if (iPosition.z < ZMIN + EPSILON || iPosition.z > ZMAX - EPSILON) {
		return vec3(0,0,-1) * sign(iPosition.z - 0.5*ZMIN - 0.5*ZMAX);
	} else {
		return vec3(0);
	}
}
vec3 poolColor(vec2 texCoord) {
	//return vec3(texCoord.x, texCoord.y, 0.0);
	return texture2D(poolTexture, texCoord).xyz;
}
void main()	{
	vec3 viewDirection = normalize(cameraPosition - vPosition);
	// refraction
	float m = (1.0/(1.33));
	float c1 = dot(vNormal, viewDirection);
	float c2 = sign(c1) * sqrt(1.0 - m*m*(1.0 - c1*c1));
	vec3 refractDirection = m*viewDirection - 1.0*(m*c1 - c2)*vNormal;
	float fresnel =
			0.5 * (1.33*c1 - c2)*(1.33*c1 - c2)/((1.33*c1 + c2)*(1.33*c1 + c2))
		+ 0.5 * (c2 - 1.33*c1)*(c2 - 1.33*c1)/((c2 + 1.33*c1)*(c2 + 1.33*c1));
	intersection ib = intersect_box(vec3(XMIN, YMIN, ZMIN), vec3(XMAX, YMAX, ZMAX), vPosition, refractDirection);
	vec3 refractColor;
	if (ib.hit) {
		vec3 iPosition = vPosition + ib.distance * refractDirection;
		vec3 poolNormal = poolNormal(iPosition);
		refractColor = poolColor(poolTextureCoords(iPosition)) * light(poolNormal, iPosition);
	} else {
		// ray should always hit
		refractColor = vec3(1,0,0);
	}
	// reflection
	vec3 reflectDirection = normalize(vPosition - cameraPosition);
	reflectDirection -= 2.0*dot(reflectDirection, vNormal) * vNormal;
	vec3 reflectionColor;
	ib = intersect_box(vec3(XMIN, YMIN, ZMIN), vec3(XMAX, YMAX, ZMAX), vPosition, -reflectDirection);
	if (ib.hit) {
		vec3 iPosition = vPosition - ib.distance * reflectDirection;
		if (iPosition.y >= YMAX - EPSILON) {
			reflectionColor = textureCube(cubeTexture, vec3(reflectDirection.x, reflectDirection.y, reflectDirection.z)).xyz;
		} else {
			vec3 poolNormal = poolNormal(iPosition);
			reflectionColor = poolColor(poolTextureCoords(iPosition)) * light(poolNormal, iPosition);
		}
	} else {
		reflectionColor = vec3(1,0,0); // debug
	}
	// specular
	vec3 specularColor = vec3(1.0) * max(0.0, pow(dot(vNormal, viewDirection), 1.5));
	float specularIntensity = 0.2;
	// final color
	gl_FragColor = vec4(
		(1.0 - specularIntensity) * fresnel * reflectionColor +
		(1.0 - specularIntensity) * (1.0-fresnel) * refractColor +
		specularIntensity * specularColor, 1.0);
}
`
