 /**
 * Created by gosnat on 7/14/2017.
 */

"use strict";
var gl;
var canvas;

var normal;
var depth;

var geometryData;

var quad_program;
var texture_program;

var rotation = 0;

var textureSize = 512;

var randomTexture;
var perlinTexture;

var mode = 0;

window.onload = function init() {

    canvas = document.getElementById("gl-canvas");
    gl = canvas.getContext('webgl2');
    if (!gl) {
        alert("WebGL isn't available");
    }

    var fileInput = document.getElementById("fileInput");
    fileInput.addEventListener('change', function(e){
        var file = fileInput.files[0];
        var textType = /text.*/;
        if(file.type.match(textType)){

            var reader = new FileReader();
            reader.onload = function(e){
                createMesh(reader.result); //ok, we have our data, so parse it
            };
            reader.readAsText(file);
        }else{
            console.log("File not supported: " + file.type + ".");
        }
    });

    gl.clearColor(0.3, 0.2, 0.2, 1.0);
    gl.enable(gl.DEPTH_TEST);

    gl.viewport(0, 0, canvas.width, canvas.height);

    //Get the two shaders needed to render
    quad_program = (initShaders(gl, "vshader-quad.glsl", "fshader-quad.glsl"));
    texture_program = (initShaders(gl, "vshader-gbuffer.glsl", "fshader-gbuffer.glsl"));

    //Generate some initial geometry
    generateSphere(60);

    //Get our Noise Textures

    perlinTexture = gl.createTexture();
    var noiseImage = new Image();
    noiseImage.src = "PerlinNoise.png";
    noiseImage.onload = function() { handleTextureLoaded(noiseImage, perlinTexture); };

    randomTexture = generateNoise();

    window.setInterval(render, 64);

    //Set mode to automatically change
    window.setInterval(updateMode, 6000);
};

function updateMode(){
    mode = (mode + 1) % 5;
    var label = document.getElementById("label");

    if(mode == 0){
        label.innerHTML = "Normals";
    }else if(mode == 1){
        label.innerHTML = "Depth";
    }else if(mode == 2){
        label.innerHTML = "Edge pass";
    }else if(mode == 3){
        label.innerHTML = "Noise Jitter";
    }else if(mode == 4){
        label.innerHTML = "Perlin Jitter";
    }
    console.log("Mode: " + mode);
}

 function handleTextureLoaded(image, texture) {
     gl.bindTexture(gl.TEXTURE_2D, texture);
     gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
     gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
     gl.generateMipmap(gl.TEXTURE_2D);
     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
     gl.bindTexture(gl.TEXTURE_2D, null);
 }

function render(){
    rotation++;

    renderToTexture();
    renderScreenQuad();
}

function createMesh(input){
    var numbers = input.split(/\s+/); //split on white space
    var numVerts = numbers[0]; //first element is number of vertices
    var numTris = numbers[1]; //second element is number of triangles

    //make a list of all the points
    var positionData = [];
    var normalData = [];
    for(var i = 2; i < 8 * numVerts + 2; i += 8){
        positionData.push(vec4(parseFloat(numbers[i]), parseFloat(numbers[i+1]), parseFloat(numbers[i+2]), 1));
        normalData.push(vec4(parseFloat(numbers[i+3]), parseFloat(numbers[i+4]), parseFloat(numbers[i+5]), 1));
    }

    //now create the triangles
    geometryData = []; //empty out any previous data

    for(var i = 8 * numVerts + 2; i + 3 < numbers.length; i+=4){
        geometryData.push(positionData[parseInt(numbers[i+1])]);
        geometryData.push(normalData[parseInt(numbers[i+1])]);

        geometryData.push(positionData[parseInt(numbers[i+2])]);
        geometryData.push(normalData[parseInt(numbers[i+2])]);

        geometryData.push(positionData[parseInt(numbers[i+3])]);
        geometryData.push(normalData[parseInt(numbers[i+3])]);
    }
}

function generateSphere(subdiv){
    var step = (360.0 / subdiv)*(Math.PI / 180.0); //how much do we increase the angles by per triangle?
    geometryData = [];

    for (var lat = 0; lat <= Math.PI ; lat += step){ //latitude
        for (var lon = 0; lon + step <= 2*Math.PI; lon += step){ //longitude
            //triangle 1
            geometryData.push(vec4(Math.sin(lat)*Math.cos(lon), Math.sin(lon)*Math.sin(lat), Math.cos(lat), 1.0)); //position
            geometryData.push(vec4(Math.sin(lat)*Math.cos(lon), Math.sin(lon)*Math.sin(lat), Math.cos(lat), 0.0)); //normal
            geometryData.push(vec4(Math.sin(lat)*Math.cos(lon+step), Math.sin(lat)*Math.sin(lon+step), Math.cos(lat), 1.0)); //position
            geometryData.push(vec4(Math.sin(lat)*Math.cos(lon+step), Math.sin(lat)*Math.sin(lon+step), Math.cos(lat), 0.0)); //normal
            geometryData.push(vec4(Math.sin(lat+step)*Math.cos(lon+step), Math.sin(lon+step)*Math.sin(lat+step), Math.cos(lat+step), 1.0)); //etc
            geometryData.push(vec4(Math.sin(lat+step)*Math.cos(lon+step), Math.sin(lon+step)*Math.sin(lat+step), Math.cos(lat+step), 0.0));

            //triangle 2
            geometryData.push(vec4(Math.sin(lat+step)*Math.cos(lon+step), Math.sin(lon+step)*Math.sin(lat+step), Math.cos(lat+step), 1.0));
            geometryData.push(vec4(Math.sin(lat+step)*Math.cos(lon+step), Math.sin(lon+step)*Math.sin(lat+step), Math.cos(lat+step), 0.0));
            geometryData.push(vec4(Math.sin(lat+step)*Math.cos(lon), Math.sin(lat+step)*Math.sin(lon), Math.cos(lat+step), 1.0));
            geometryData.push(vec4(Math.sin(lat+step)*Math.cos(lon), Math.sin(lat+step)*Math.sin(lon), Math.cos(lat+step),0.0));
            geometryData.push(vec4(Math.sin(lat)*Math.cos(lon), Math.sin(lon)*Math.sin(lat), Math.cos(lat), 1.0));
            geometryData.push(vec4(Math.sin(lat)*Math.cos(lon), Math.sin(lon)*Math.sin(lat), Math.cos(lat), 0.0));
        }
    }
}

function renderToTexture() {
    gl.useProgram(texture_program);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, flatten(geometryData), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(texture_program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 32, 0); //stride is 32 bytes total for position, normal
    gl.enableVertexAttribArray(vPosition);

    var vNormal = gl.getAttribLocation(texture_program, "vNormal");
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 32, 16);
    gl.enableVertexAttribArray(vNormal);

    var umv = gl.getUniformLocation(texture_program, "model_view");
    var mv = lookAt(vec3(0, 0, 5), vec3(0, 0, 0), vec3(0, 1, 0));

    mv = mult(mv, rotateY(rotation));
    mv = mult(mv, rotateX(-90));

    gl.uniformMatrix4fv(umv, false, flatten(mv));

    var proj = gl.getUniformLocation(texture_program, "projection");
    var p = perspective(60, (canvas.width / canvas.height), 2.0, 7.0);
    gl.uniformMatrix4fv(proj, false, flatten(p));

    var fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

    //Create the normal texture
    normal = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, normal);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, textureSize, textureSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.bindTexture(gl.TEXTURE_2D, null); //we aren't bound to any textures now

    //Create the depth texture
    depth = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, depth);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, textureSize, textureSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.bindTexture(gl.TEXTURE_2D, null); //we aren't bound to any textures now

    //Create the new render buffer
    var renderBuffer = gl.createRenderbuffer()
    gl.bindRenderbuffer(gl.RENDERBUFFER, renderBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16,
        textureSize, textureSize);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT,
        gl.RENDERBUFFER, renderBuffer);

    //Attach our textures to the buffer
    gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, normal, 0);
    gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, depth, 0);

    gl.drawBuffers([
        gl.COLOR_ATTACHMENT0, // - Normal
        gl.COLOR_ATTACHMENT1// - Depth
    ]);

    gl.drawArrays(gl.TRIANGLES, 0, geometryData.length / 2);

    //Clean up
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
}

function renderScreenQuad(){
    gl.useProgram(quad_program);

    //Set up our screen
    var screen = [];

    screen.push(vec2(-1, -1));
    screen.push(vec2(-1, 1));
    screen.push(vec2(1, -1));
    screen.push(vec2(1, 1));
    screen.push(vec2(-1, 1));
    screen.push(vec2(1, -1));

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, flatten(screen), gl.STATIC_DRAW);

    var vertexLoc =  gl.getAttribLocation(quad_program, "vertexPosition");
    gl.vertexAttribPointer(vertexLoc, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vertexLoc);

    //Send over the normal map
    var normalMap =  gl.getUniformLocation(quad_program, "normalMap");
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, normal);
    gl.uniform1i(normalMap, 0);

    //Send over the depth map
    var depthMap =  gl.getUniformLocation(quad_program, "depthMap");
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, depth);
    gl.uniform1i(depthMap, 1);

    //Send over a noise map
    var noiseMap =  gl.getUniformLocation(quad_program, "noiseMap");
    gl.activeTexture(gl.TEXTURE2);

    if(mode == 3){
        gl.bindTexture(gl.TEXTURE_2D, randomTexture);
    }else {
        gl.bindTexture(gl.TEXTURE_2D, perlinTexture);
    }

    gl.uniform1i(noiseMap, 2);

    //Send over the mode
    gl.uniform1i(gl.getUniformLocation(quad_program, "mode"), mode);

    //Send over the size of the canvas
    var size =  gl.getUniformLocation(quad_program, "pixelSize");
    gl.uniform1f(size, textureSize);

    //Draw the screen
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

 function generateNoise(){
     var i, j;
     var texHeight = textureSize;
     var texWidth = textureSize;
     var mmtexture = new Uint8Array(texHeight * texWidth * 4);

     //This generates completely random noise, not Perlin or anything
     for (i = 0; i < texHeight; i++) {
         for (j = 0; j < texWidth; j++) {
             mmtexture[4*(texWidth * i + j)] = Math.random() * 255.0;
             mmtexture[4*(texWidth * i + j) + 1] = Math.random() * 255.0;
             mmtexture[4*(texWidth * i + j) + 2] = 0;
             mmtexture[4*(texWidth * i + j) + 3] = 255;
         }
     }

     var noiseTexture = gl.createTexture();
     gl.bindTexture(gl.TEXTURE_2D, noiseTexture);
     gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, textureSize, textureSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, mmtexture);

     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
     return noiseTexture;
 }


