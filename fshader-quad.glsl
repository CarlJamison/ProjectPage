
precision mediump float;

uniform sampler2D depthMap;
uniform sampler2D normalMap;
uniform sampler2D noiseMap;

uniform int mode;

uniform float pixelSize;
varying vec2 vTexCoords;

//scaling factor for the noise
float k;

bool checkDirection(float x, float y){

    //Get pixel size
    float s = 1.0 / pixelSize;

    //This is the threshold for a change in normal to be an edge
    float threshold = 0.15;

    //Get the offset based on the noise texture
    vec2 offset = vec2(0, 0);
    if(mode == 3 || mode == 4){    //Here the texture is rotated 90 degrees to give a different jitter than the coloring
        offset = vec2(k * s * (texture2D(noiseMap, vec2(vTexCoords.y, vTexCoords.x)).x * 2.0 - 1.0)
                         , k * s * (texture2D(noiseMap, vec2(vTexCoords.y, vTexCoords.x)).y * 2.0 - 1.0));
    }

    //Gets the comparision coord based on our input x and y
    vec2 compCoord = vec2(vTexCoords.x + x, vTexCoords.y + y);

    //Gets the normal values at the coords + jitter
    vec4 comp = texture2D(normalMap, compCoord + offset);
    vec4 me = texture2D(normalMap, vTexCoords + offset);

    //If the change in any direction is greater than the threshold, we have an edge
    if(comp.x - me.x > threshold ||
           comp.y - me.y > threshold ||
           comp.z - me.z > threshold){
            return true;
    }

    //Reset the threshold for the depth pass
    threshold = 0.02;

    comp = texture2D(depthMap, compCoord + offset);
    me = texture2D(depthMap, vTexCoords + offset);

    //Using abs makes it so that both sides of an edge will think their an edge
    // making the edge thicker
    if(abs(comp.x - me.x) > threshold ||
       abs(comp.y - me.y) > threshold ||
       abs(comp.z - me.z) > threshold){
        return true;
    }

    return false;
}

void main()
{
    //Change k value based on the noise type
    if(mode == 3){
        k = 1.0;
    }else{
        k = 3.0;
    }

    //Get the size of a pixel
    float s = 1.0 / pixelSize;

    //Get the offset based on the noise texture
    vec2 offset = vec2(0, 0);
    if(mode == 3 || mode == 4){
        offset = vec2(k * s * (texture2D(noiseMap, vTexCoords).x * 2.0 - 1.0)
                    , k * s * (texture2D(noiseMap, vTexCoords).y * 2.0 - 1.0));
    }

    if(mode == 0){ //Just Normal
        gl_FragColor = texture2D(normalMap, vTexCoords);
    }else if(mode == 1){ //Just Depth
        gl_FragColor = texture2D(depthMap, vTexCoords);
    }else{  //Edges

        if(checkDirection(-s, 0.0) || //Check every direction to look for edges
           checkDirection(s, 0.0) ||
           checkDirection(0.0, -s) ||
           checkDirection(0.0, s)){
            gl_FragColor = vec4(0.2, 0.2, 0.2, 1); //Make the edges almost black
        }else{
            //Use the depth alpha to color between the lines
            gl_FragColor = texture2D(depthMap, vTexCoords + offset).a * vec4(0.4, 0.3, 1, 1);
        }
    }
}

