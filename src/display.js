var lightStruct = `
struct Light {
    highp vec3 center;
    highp vec4 radius;
    lowp vec4 color;
    lowp int shadows;
};
`

var depthVertex = `#version 300 es
in vec3 a_position;

uniform mat4 worldTransform;
uniform mat4 projectionTransform;

void main(){
    gl_Position = projectionTransform * worldTransform * vec4(a_position, 1.0);
}
`

var depthFrag = `#version 300 es
precision mediump float;

out vec4 outColor;

void main(){
    outColor = vec4(0, 0, 0, 1);
}
`

var lightVertex = `#version 300 es
` + lightStruct + `

    in vec3 a_position;
    in vec2 a_textureCoord;
    in vec3 a_normal;

    uniform Light uLight;
    uniform mat4 worldTransform;
    uniform mat4 projectionTransform;

    out vec3 v_position;
    out vec2 v_textureCoord;
    out vec3 v_normal;
    out vec3 v_light;

    void main(){
        vec4 position = worldTransform * vec4(a_position, 1.0);
        v_position = a_position;

        v_light = (worldTransform * vec4(uLight.center, 1.0)).xyz;
        v_textureCoord = a_textureCoord;
        v_normal = normalize(a_normal);

        gl_Position = projectionTransform * position;
    }
`

var lightFragment = `#version 300 es
    precision mediump float;

    struct MaterialStage {
        sampler2D map;
    };

    ` + lightStruct + `

    in vec3 v_light;
    in vec3 v_position;
    in vec2 v_textureCoord;
    in vec3 v_normal;

    uniform Light uLight;
    uniform MaterialStage uDiffuse;
    uniform MaterialStage uSpecular;

    out vec4 outColor;

    vec3 calculateDiffuse(float nDotL, float power){
        vec3 color = texture(uDiffuse.map, v_textureCoord).rgb;

        return color * uLight.color.rgb * nDotL * power;
    }

    vec3 calculateSpecular(vec3 n, float power){
        // TODO: calcualte based on the camera.
        float eDotL = dot(vec3(0, 0, -1), normalize(v_light));
        return texture(uSpecular.map, v_textureCoord).rgb * power * eDotL;
    }

    void main(){
        vec3 n = normalize(v_normal);
        vec3 lightVec = uLight.center.xyz - v_position.xyz;
        float nDotL = clamp(dot(n, normalize(lightVec)), 0.0, 1.0);
        float power = 1.0 - clamp(length(lightVec / uLight.radius.xyz), 0.0, 1.0);

        outColor.rgb = clamp(calculateDiffuse(nDotL, power) + calculateSpecular(n, 0.0), 0.0, 1.0);
        outColor.a = 1.0;
    }
`

// Gobal Functions
function createVertexBuffer(gl, vertecies){
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

    gl.bufferData(gl.ARRAY_BUFFER, vertecies, gl.STATIC_DRAW);

    vertecies.glBuffer = buffer;
}

function createIndexBuffer(gl, indecies){
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);

    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indecies, gl.STATIC_DRAW);

    indecies.glBuffer = buffer;
}

var BoundsTester = function(gl, createShaderProgramFunction){
    this.init(gl, createShaderProgramFunction);
    this.indecies = new Uint16Array([ // Not the best traversal, but it will work for now
        0, 1, 3, 2,
        0, 4, 5, 1,
        3, 7, 5, 4,
        6, 7, 6, 2
    ]);
    this.vertecies = new Float32Array([
        0, 0, 0,
        0, 0, 1,
        0, 1, 0,
        0, 1, 1,
        1, 0, 0,
        1, 0, 1,
        1, 1, 0,
        1, 1, 1
    ]);
    this.color = new Float32Array([0.0, 1.0, 0.0, 1.0]);
}
{
    var boundsVertex = `#version 300 es
        in vec3 a_position;

        uniform mat4 worldTransform;
        uniform mat4 projectionTransform;

        out vec4 v_position;

        void main(){
            v_position = worldTransform * vec4(a_position, 1.0);

            gl_Position = projectionTransform * v_position;
        }
    `

    var boundsFragment = `#version 300 es
        precision mediump float;

        uniform vec4 uColor;

        in vec4 v_position;

        out vec4 outColor;

        void main(){
            outColor = uColor;
        }
    `
    BoundsTester.prototype.init = function(gl, createShaderProgramFunction){
        this.program = createShaderProgramFunction(gl, "boundsTest", boundsVertex, boundsFragment, [
            { name: "positionAttribute", glName: "a_position", type: "attribute" },

            { name: "modelMatrixUniform", glName: "worldTransform", type: "uniform" },
            { name: "viewMatrixUniform", glName: "projectionTransform", type: "uniform" },
            { name: "colorUniform", glName: "uColor", type: "uniform" },
        ]);
    }

    BoundsTester.prototype.draw = function(gl, bounds, mvMatrix, projectionMatrix){
        var vert = this.vertecies;
        var indecies = this.indecies;
        var program = this.program;

        gl.useProgram(program);
        gl.enableVertexAttribArray(program.positionAttribute);

        // Set the new vertecies
        vert[0] = bounds[0]; vert[1] = bounds[1]; vert[2] = bounds[2];
        vert[3] = bounds[0]; vert[4] = bounds[1]; vert[5] = bounds[5];
        vert[6] = bounds[0]; vert[7] = bounds[4]; vert[8] = bounds[2];
        vert[9] = bounds[0]; vert[10] = bounds[4]; vert[11] = bounds[5];
        vert[12] = bounds[3]; vert[13] = bounds[1]; vert[14] = bounds[2];
        vert[15] = bounds[3]; vert[16] = bounds[1]; vert[17] = bounds[5];
        vert[18] = bounds[3]; vert[19] = bounds[4]; vert[20] = bounds[2];
        vert[21] = bounds[3]; vert[22] = bounds[4]; vert[23] = bounds[5];

        if(!indecies.glBuffer){
            createVertexBuffer(gl, vert);
            createIndexBuffer(gl, indecies);
        }else{
            gl.bindBuffer(gl.ARRAY_BUFFER, vert.glBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, vert, gl.STATIC_DRAW);
        }

        // Set the uniforms
        gl.uniformMatrix4fv(program.modelMatrixUniform, false, mvMatrix);
        gl.uniformMatrix4fv(program.viewMatrixUniform, false, projectionMatrix);
        gl.uniform4fv(program.colorUniform, this.color);

        // Draw the boxes
        gl.bindBuffer(gl.ARRAY_BUFFER, vert.glBuffer);
        gl.vertexAttribPointer(program.positionAttribute, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indecies.glBuffer);
        gl.drawElements(gl.LINE_LOOP, indecies.length, gl.UNSIGNED_SHORT, 0);
    }
}


function Display(canvas){
    this.init(canvas);
}
{
    function initializeGL(canvas){
        var gl = canvas.getContext("webgl2");

        if(gl == null){
            //TODO: throw exception
        }

        gl.clearColor(0.0, 0.0, 0.0, 1.0);

        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);

        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);

        gl.polygonOffset(-1.0, -1.0);

        return gl;
    }

    function createShader(gl, name, type, source){
        var shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if(gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
            shader.name = name;
            return shader;
        }

        Console.current.writeLine("Error creating shader " + name + ": " + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);

        return null;
    }

    function createShaderProgram(gl, name, vert, frag, variableNames){
        Console.current.writeLine("Loading shader " + name + "...");

        var vertexShader = createShader(gl, name + "_vert", gl.VERTEX_SHADER, vert);
        var fragmentShader = createShader(gl, name + "_frag", gl.FRAGMENT_SHADER, frag);

        var program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        program.setsTexture = false;
        program.setsNormal = false;

        if(gl.getProgramParameter(program, gl.LINK_STATUS)){
            program.name = name;

            Object.keys(variableNames).forEach(function(key){
                var propName = variableNames[key];

                if(propName.name == "textureCoordAttribute"){
                    program.setsTexture = true;
                }else if(propName.name == "normalAttribute"){
                    program.setsNormal = true;
                }

                switch(propName.type){
                    case "attribute":
                        program[propName.name] = gl.getAttribLocation(program, propName.glName);
                        break;

                    case "uniform":
                            program[propName.name] = gl.getUniformLocation(program, propName.glName);
                            break;
                }

                if(propName.name == "diffuseMap"){
                    gl.uniform1i(program["diffuseMap"], 0);
                }

                if(propName.name == "specularMap"){
                    gl.uniform1i(program["specularMap"], 1);
                }
            });

            Console.current.writeLine("Shader loaded successfully.");

            return program;
        }

        Console.current.writeLine("Error creating shader program " + name + ": " + gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
    }

    function setShaderUniforms(gl, program, camera, light){
        gl.uniformMatrix4fv(program.modelMatrixUniform, false, camera.transform.invMatrix);
        gl.uniformMatrix4fv(program.viewMatrixUniform, false, camera.projectionMatrix);
        gl.uniform1i(program.mapUniform, 0);
    }

    Display.prototype.init = function(canvas){
        var gl = initializeGL.call(this, canvas);

        this.size = new Uint16Array([canvas.width, canvas.height]);
        this.gl = gl;

        this.shaders = { 
            "depth" : createShaderProgram(gl, "depth", depthVertex, depthFrag, [
                { name: "positionAttribute", glName: "a_position", type: "attribute" },
                { name: "modelMatrixUniform", glName: "worldTransform", type: "uniform" },
                { name: "viewMatrixUniform", glName: "projectionTransform", type: "uniform" },
            ]),
            "light" : createShaderProgram(gl, "light", lightVertex, lightFragment, [
                { name: "positionAttribute", glName: "a_position", type: "attribute" },
                { name: "textureCoordAttribute", glName: "a_textureCoord", type: "attribute" },
                { name: "normalAttribute", glName: "a_normal", type: "attribute" },

                { name: "modelMatrixUniform", glName: "worldTransform", type: "uniform" },
                { name: "viewMatrixUniform", glName: "projectionTransform", type: "uniform" },

                { name: "lightCenter", glName: "uLight.center", type: "uniform" },
                { name: "lightRadius", glName: "uLight.radius", type: "uniform" },
                { name: "lightColor", glName: "uLight.color", type: "uniform" },
                { name: "lightShadow", glName: "uLight.shadows", type: "uniform" },

                { name: "diffuseMap", glName: "uDiffuse.map", type: "uniform" },

                { name: "specularMap", glName: "uSpecular.map", type: "uniform" },
            ]) 
        };

        this.showBounds = false;
        this.boundsRenderer = new BoundsTester(gl, createShaderProgram);

        this.resize(canvas.width, canvas.height);
    }

    function drawModel(gl, program, model){
        var vert = model.vertecies;
        var index = model.indecies;

        //Create the buffers if they do not exist.
        if(!vert.glBuffer){
            createVertexBuffer(gl, vert);
            createIndexBuffer(gl, index);
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, vert.glBuffer);
        gl.vertexAttribPointer(program.positionAttribute, 3, gl.FLOAT, false, ReadableVertex.stride, ReadableVertex.positionOffset);
        
        if(program.setsTexture){
            gl.vertexAttribPointer(program.textureCoordAttribute, 2, gl.FLOAT, false, ReadableVertex.stride, ReadableVertex.textureOffset);
        }

        if(program.setsNormal){
            gl.vertexAttribPointer(program.normalAttribute, 3, gl.FLOAT, true, ReadableVertex.stride, ReadableVertex.normalOffset);
        }

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index.glBuffer);
        gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);
    }

    function drawDepth(gl, drawBuffer, camera){
        var program = this.shaders.depth;

        gl.useProgram(program);
        gl.enableVertexAttribArray(program.positionAttribute);
        setShaderUniforms(gl, program, camera);

        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);
        gl.depthMask(true);

        drawBuffer.opaqueModels.forEach(function(model, cIndex){
            drawModel(gl, program, model);
        });

        gl.depthMask(false);
    }

    // TODO: fix
    function drawMaterialStage(gl, model, stage){
        if(!stage.map){
            return;
        }

        // Set the blend function
        gl.blendFunc(stage.blend.src, stage.blend.dst);

        // Set the color mask
        gl.colorMask(stage.maskRed, stage.maskGreen, stage.maskBlue, stage.maskAlpha);

        // Set the textures
        var texture = stage.map.getGlTexture(gl);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
    }

    function drawLights(gl, drawBuffer, camera){
        var program = this.shaders.light;
        var screenSize = this.size;
        var key, light;

        gl.useProgram(program);
        gl.enableVertexAttribArray(program.positionAttribute);
        gl.enableVertexAttribArray(program.normalAttribute);
        gl.enableVertexAttribArray(program.textureCoordAttribute);

        setShaderUniforms(gl, program, camera);

        gl.depthFunc(gl.LEQUAL);
        gl.blendFunc(gl.ONE, gl.ONE);

        gl.enable(gl.BLEND);

        gl.enable(gl.SCISSOR_TEST);
        gl.enable(gl.POLYGON_OFFSET_FILL);

        for(key in drawBuffer.lights){
            light = drawBuffer.lights[key];

            // Set the light viewing information
            gl.scissor(
                light.scissor[0] * screenSize[0],
                light.scissor[1] * screenSize[1],
                light.scissor[2] * screenSize[0],
                light.scissor[3] * screenSize[1]
            );

            // Set the light information
            gl.uniform3fv(program.lightCenter, light.light.transform.position);
            gl.uniform4fv(program.lightRadius, light.light.radius);
            gl.uniform4fv(program.lightColor, light.light.color);
            gl.uniform1i(program.lightShadow, light.light.shadows ? 1 : 0);

            light.models.forEach(function(model){
                var material = model.material;

                // Set the textures
                var texture = material.diffuseStage.map.getGlTexture(gl);
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, texture);

                texture = material.specularStage.map.getGlTexture(gl);
                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D, texture);

                // Set any properties


                drawModel(gl, program, model);
            })
        };

        gl.disableVertexAttribArray(program.normalAttribute);
        gl.disableVertexAttribArray(program.textureCoordAttribute);

        gl.disable(gl.SCISSOR_TEST);
        gl.disable(gl.POLYGON_OFFSET_FILL);
        gl.disable(gl.BLEND);
    }

    Display.prototype.draw = function(drawBuffer, camera){
        var gl = this.gl;
        var boundsRenderer = this.showBounds ? this.boundsRenderer : null;

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


        // Draw to the depth buffer
        drawDepth.call(this, gl, drawBuffer, camera);

        // Draw for each light
        drawLights.call(this, gl, drawBuffer, camera);

        // Draw fully bright elements

        // Draw transparent elements
        gl.depthMask(true);

        /*if(boundsRenderer != null){
            gl.disable(gl.DEPTH_TEST);
            boundsRenderer.draw(gl, brush.bounds, camera.transform.invMatrix, camera.projectionMatrix);
            gl.useProgram(program);
            gl.enable(gl.DEPTH_TEST);
        }*/
        
    }
    Display.prototype.resize = function(width, height){
        this.size[0] = width;
        this.size[1] = height;

        this.gl.viewport(0, 0, width, height);
    }
    
}