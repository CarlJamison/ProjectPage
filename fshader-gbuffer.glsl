#version 300 es

precision mediump float;

in vec3 N;

layout(location = 0) out vec4 normal;
layout(location = 1) out vec4 depth;

void main()
{
    //Get the normal
    normal = vec4(normalize(N), 1);

    //Get the Z value
    float dcoef = gl_FragCoord.z;
    depth = vec4(vec3(dcoef), 1.0);
}