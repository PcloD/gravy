
uniform sampler2D Radiance;
uniform sampler2D RngData;
uniform sampler2D Depth;

varying vec2 vTexCoord;

uniform vec2 resolution;
uniform vec3 camPos;
uniform vec3 camDir;
uniform vec3 camX;
uniform vec3 camY;
uniform float camNear;
uniform float camFar;
uniform float camFovy; // degrees 
uniform float camZoom;
uniform float camAspect;
uniform float SceneScale;


//////////////////////////////////////////////////////////////
// Dynamically injected code
//////////////////////////////////////////////////////////////

SDF_FUNC

LIGHTING_FUNC

//////////////////////////////////////////////////////////////


bool hit(inout vec3 X, vec3 D, inout int numSteps)
{
	float minMarchDist = 1.0e-5*SceneScale;
	float maxMarchDist = 1.0e5*SceneScale;
	float t = 0.0;
	float h = 1.0;
    for( int i=0; i<MAX_MARCH_STEPS; i++ )
    {
		if (h<minMarchDist || t>maxMarchDist) break;
		h = SDF(X + D*t);
        t += h;
    }
    X += t*D;
	if (t<maxMarchDist) return true;
	return false;
}


vec3 NORMAL( in vec3 X )
{
	// Compute normal as gradient of SDF
	float normalEpsilon = 2.0e-5*SceneScale;
	vec3 eps = vec3(normalEpsilon, 0.0, 0.0);
	vec3 nor = vec3(
	    SDF(X+eps.xyy) - SDF(X-eps.xyy),
	    SDF(X+eps.yxy) - SDF(X-eps.yxy),
	    SDF(X+eps.yyx) - SDF(X-eps.yyx) );
	return normalize(nor);
}


void main()
{
	vec4 rnd = texture2D(RngData, vTexCoord);

	// Initialize world ray position
	vec3 X = camPos;

	// Jitter over pixel
	vec2 pixel = gl_FragCoord.xy;
	pixel += -0.5 + 0.5*vec2(rand(rnd), rand(rnd));

	// Compute world ray direction for this fragment
	vec2 ndc = -1.0 + 2.0*(pixel/resolution.xy);
	float fh = camNear*tan(0.5*radians(camFovy)) / camZoom; // frustum height
	float fw = camAspect*fh;
	vec3 s = -fw*ndc.x*camX + fh*ndc.y*camY;
	vec3 D = normalize(camNear*camDir + s); // ray direction

	// Raycast to first hit point
	float zEye = camFar;
	vec3 L = vec3(0.0, 0.0, 0.0);
	int numSteps;	
	if ( hit(X, D, numSteps) )
	{
		zEye = dot(X - camPos, camDir);
		vec3 N = NORMAL(X);
		vec3 V = normalize(camPos-X);
		L = LIGHTING(V, N);
	}

	float clipDepth = computeClipDepth(zEye, camNear, camFar);

	// Write updated radiance and sample count
	vec4 oldL = texture2D(Radiance, vTexCoord);
	float oldN = oldL.w;
	float newN = oldN + 1.0;
	vec3 newL = (oldN*oldL.rgb + L) / newN;

	gl_FragData[0] = vec4(newL, newN);
	gl_FragData[1] = rnd;
	gl_FragData[2] = pack_depth(clipDepth);
}




