#version 300 es

in vec4 vPosition;
in vec4 vNormal;

out vec3 N;

uniform mat4 model_view;
uniform mat4 projection;

void main(){
    vec4 veyepos = model_view * vPosition;

    //No need to multiply by model_view since normal edges are dependant on only the object
    N = vNormal.xyz;

    gl_Position = projection * veyepos;
}