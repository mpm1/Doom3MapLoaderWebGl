const lightNear = 0.01;

var lightStruct = `
struct Light {
    highp vec3 center;
    highp vec4 radius;
    lowp vec4 color;
    lowp int shadows;
    samplerCube staticMap;
};
`

var stageStruct = `
struct MaterialStage {
    sampler2D map;
    highp vec2 translate;
    highp vec2 scale; 
    mediump float rotation;
    mediump float alphaTest;
};
`

var materialFunctions = `
    vec2 getTextureUV(vec2 inputUV, MaterialStage stage){
        vec2 uv = mod(inputUV, 1.0);

        uv *= stage.scale;

        uv += stage.translate;

        float sinFactor = sin(stage.rotation);
        float cosFactor = cos(stage.rotation);
        float mid = 0.5;

        uv = vec2(
            cosFactor * (uv.x - mid) + sinFactor * (uv.y - mid) + mid,
            cosFactor * (uv.y - mid) - sinFactor * (uv.x - mid) + mid
        );

        return uv;
    }

    vec4 getStageColor(vec2 inputUV, MaterialStage stage){
        vec2 uv = getTextureUV(inputUV, stage);
        vec4 color = texture(stage.map, uv);

        if(color.a < stage.alphaTest){
            return vec4(0.0, 0.0, 0.0, 0.0);
        }

        return color;
    }
`

var depthVertex = `#version 300 es
in vec3 a_position;

uniform mat4 worldTransform;
uniform mat4 projectionTransform;

out vec4 v_position;

void main(){
    gl_Position = projectionTransform * worldTransform * vec4(a_position, 1.0);
    v_position = gl_Position;
}
`

var depthFrag = `#version 300 es
precision mediump float;

out vec4 outColor;

in vec4 v_position;

void main(){
    float depth = v_position.z / v_position.w;
    float red = (depth - 0.99) / 0.01;
    outColor = vec4(red, red * red, red * red * red, 1);

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
    uniform mat4 normalTransform;

    out vec3 v_worldPosition;
    out vec3 v_position;
    out vec2 v_textureCoord;
    out vec3 v_normal;
    out vec3 v_lightPosition;

    void main(){
        vec4 position = worldTransform * vec4(a_position, 1.0);
        v_position = position.xyz;
        v_worldPosition = a_position;

        v_lightPosition = vec3(worldTransform * vec4(uLight.center, 1.0));
        
        v_normal = normalize(vec3(normalTransform * vec4(a_normal, 0.0)));

        v_textureCoord = a_textureCoord;

        gl_Position = projectionTransform * position;
    }
`

var lightFragment = `#version 300 es
    precision mediump float;

    ` + stageStruct + `

    ` + lightStruct + `

    in vec3 v_worldPosition;
    in vec3 v_lightPosition;
    in vec3 v_position;
    in vec2 v_textureCoord;
    in vec3 v_normal;

    uniform Light uLight;
    uniform MaterialStage uDiffuse;
    uniform MaterialStage uSpecular;

    out vec4 outColor;

    ` + materialFunctions + `

    vec4 calculateDiffuse(vec3 lightAngle, vec3 n){
        float nDotL = clamp(dot(n, lightAngle), 0.0, 1.0);

        vec4 color = getStageColor(v_textureCoord, uDiffuse);
        color.rgb *= uLight.color.rgb;
        color.rgb *= nDotL;

        return color;
    }

    vec3 calculateSpecular(vec3 n, vec3 lightAngle){
        vec4 textureColor = getStageColor(v_textureCoord, uSpecular);
        float specular = textureColor.r;
        
        vec3 eyeVec = normalize(-v_position);
        vec3 refVec = normalize(reflect(-lightAngle, n));
        float eDotL = clamp(dot(eyeVec, refVec), 0.0, 1.0);


        specular *= eDotL;

        // TODO: look up how to set the needed specular values.
        vec3 color = clamp(uLight.color.rgb * pow(specular, 100.0), 0.0, 1.0);

        return color;
    }

    void main(){
        vec3 n = normalize(v_normal);

        vec3 lightVec =  normalize(v_lightPosition.xyz - v_position.xyz);
        vec3 worldLightVec = uLight.center - v_worldPosition;

        float power = 1.0 - clamp(length(worldLightVec / uLight.radius.xyz), 0.0, 1.0);

        if(power > 0.0){
            power = 1.0;
        }

        if(uLight.shadows > 0){
            float lightNear = ` + lightNear + `; float lightFar = max(max(uLight.radius.x, uLight.radius.y), uLight.radius.z);
            float shadowDepth = texture(uLight.staticMap, normalize(worldLightVec)).r;
            float lightDepth = 1.0 - (length(worldLightVec) - lightNear) / (lightNear - lightFar);

            power = lightDepth > shadowDepth ? power : 0.0;
        }

        vec4 diffuse = calculateDiffuse(lightVec, n);
        vec3 specular = calculateSpecular(n, lightVec);

        outColor.a = diffuse.a;
        outColor.rgb = (diffuse.rgb + specular) * power;
        //outColor.rgb = uLight.color.rgb * power;
    }
`

var stageVertex = `#version 300 es
    in vec3 a_position;
    in vec2 a_textureCoord;
    in vec3 a_normal;

    uniform mat4 worldTransform;
    uniform mat4 projectionTransform;

    out vec3 v_position;
    out vec2 v_textureCoord;
    out vec3 v_normal;

    void main(){
        vec4 position = worldTransform * vec4(a_position, 1.0);
        v_position = a_position;
        v_textureCoord = a_textureCoord;
        v_normal = normalize(a_normal);

        gl_Position = projectionTransform * position;
    }
`

var stageFragment = `#version 300 es
    precision mediump float;

    ` + stageStruct + `

    in vec3 v_position;
    in vec2 v_textureCoord;
    in vec3 v_normal;

    uniform MaterialStage uStage;

    out vec4 outColor;

    ` + materialFunctions + `

    void main(){
        outColor = getStageColor(v_textureCoord, uStage);
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

function Display(canvas){
    this.init(canvas);
}
{
    function initializeGL(canvas){
        var gl = canvas.getContext("webgl2", {
            preserveDrawingBuffer: true, // Used to read the framebuffer values
        });

        if(gl == null){
            //TODO: throw exception
        }

        gl.clearColor(0.0, 0.0, 0.0, 1.0);

        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);

        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);

        gl.polygonOffset(-1.0, 0.0);

        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, DEFAULT_DIFFUSE.getGlTexture(gl));

        return gl;
    }

    function generateShadowFrameBuffer(gl, width, height){
        var fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

        var colorTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, colorTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorTexture, 0);

        return {
            buffer: fb,
            width: width,
            height: height
        };
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
        program.setsNormalTransform = false;

        gl.useProgram(program);

        if(gl.getProgramParameter(program, gl.LINK_STATUS)){
            program.name = name;

            Object.keys(variableNames).forEach(function(key){
                var propName = variableNames[key];

                if(propName.name == "textureCoordAttribute"){
                    program.setsTexture = true;
                }else if(propName.name == "normalAttribute"){
                    program.setsNormal = true;
                }else if(propName.name == "normalMatrixUniform"){
                    program.setsNormalTransform = true;
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

                if(propName.name == "stageMap"){
                    gl.uniform1i(program["stageMap"], 2);
                }

                if(propName.name == "lightStaticMap"){
                    gl.uniform1i(program["lightStaticMap"], 3);
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

        if(program.setsNormalTransform){
            gl.uniformMatrix4fv(program.normalMatrixUniform, false, camera.transform.normalMatrix); 
        }
    }

    Display.prototype.init = function(canvas){
        var gl = initializeGL.call(this, canvas);

        this.size = new Uint16Array([canvas.width, canvas.height, canvas.width >> 1, canvas.height >> 1]);
        this.gl = gl;

        this.shadowBuffer = generateShadowFrameBuffer(gl, 512, 512);

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
                { name: "normalMatrixUniform", glName: "normalTransform", type: "uniform" },

                { name: "lightCenter", glName: "uLight.center", type: "uniform" },
                { name: "lightRadius", glName: "uLight.radius", type: "uniform" },
                { name: "lightColor", glName: "uLight.color", type: "uniform" },
                { name: "lightShadow", glName: "uLight.shadows", type: "uniform" },
                { name: "lightStaticMap", glName: "uLight.staticMap", type: "uniform" },

                { name: "diffuseMap", glName: "uDiffuse.map", type: "uniform" },
                { name: "diffuseTranslate", glName: "uDiffuse.translate", type: "uniform" },
                { name: "diffuseScale", glName: "uDiffuse.scale", type: "uniform" },
                { name: "diffuseRotation", glName: "uDiffuse.rotation", type: "uniform" },
                { name: "diffuseAlphaTest", glName: "uDiffuse.alphaTest", type: "uniform" },

                { name: "specularMap", glName: "uSpecular.map", type: "uniform" },
                { name: "specularTranslate", glName: "uSpecular.translate", type: "uniform" },
                { name: "specularScale", glName: "uSpecular.scale", type: "uniform" },
                { name: "specularRotation", glName: "uSpecular.rotation", type: "uniform" },
                { name: "specularAlphaTest", glName: "uSpecular.alphaTest", type: "uniform" }
            ]),
            "stage" : createShaderProgram(gl, "stage", stageVertex, stageFragment, [
                { name: "positionAttribute", glName: "a_position", type: "attribute" },
                { name: "textureCoordAttribute", glName: "a_textureCoord", type: "attribute" },
                { name: "normalAttribute", glName: "a_normal", type: "attribute" },

                { name: "modelMatrixUniform", glName: "worldTransform", type: "uniform" },
                { name: "viewMatrixUniform", glName: "projectionTransform", type: "uniform" },

                { name: "stageMap", glName: "uStage.map", type: "uniform" },
                { name: "stageTranslate", glName: "uStage.translate", type: "uniform" },
                { name: "stageScale", glName: "uStage.scale", type: "uniform" },
                { name: "stageRotation", glName: "uStage.rotation", type: "uniform" },
                { name: "stageAlphaTest", glName: "uStage.alphaTest", type: "uniform" }
            ]) 
        };

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
        gl.colorMask(false, false, false, false);

        drawBuffer.opaqueModels.forEach(function(model, cIndex){
            drawModel(gl, program, model);
        });

        gl.depthMask(false);
    }

    function setStageUniforms(prefix, program, gl, stage){
        gl.uniform2fv(program[prefix + "Translate"], stage.translate);
        gl.uniform2fv(program[prefix + "Scale"], stage.scale);
        gl.uniform1f(program[prefix + "Rotation"], stage.rotate);
        gl.uniform1f(program[prefix + "AlphaTest"], stage.alphaTest);
    }

    function drawLights(gl, drawBuffer, camera){
        var program = this.shaders.light;
        var screenSize = this.size;
        var lights = drawBuffer.lights[Symbol.iterator]()
        var key, light;

        gl.useProgram(program);
        gl.enableVertexAttribArray(program.positionAttribute);
        gl.enableVertexAttribArray(program.normalAttribute);
        gl.enableVertexAttribArray(program.textureCoordAttribute);
        gl.colorMask(true, true, true, true);

        setShaderUniforms(gl, program, camera);

        gl.depthFunc(gl.LEQUAL);
        gl.depthMask(false);
        gl.blendFunc(gl.ONE, gl.ONE);

        gl.enable(gl.BLEND);

        gl.enable(gl.SCISSOR_TEST);
        gl.enable(gl.POLYGON_OFFSET_FILL);

        for(let key of lights){
            light = key[1];
            
            if(light.scissor == null){
                continue;
            }

            if(light.light.shadows){
                gl.activeTexture(gl.TEXTURE3);
                gl.bindTexture(gl.TEXTURE_CUBE_MAP, light.light.staticShadowMap);
            }

            // Set the light viewing information
            gl.scissor(
                Math.floor(light.scissor[0] * screenSize[2]) + screenSize[2],
                Math.floor(light.scissor[1] * screenSize[3]) + screenSize[3],
                Math.ceil(light.scissor[2] * screenSize[2]),
                Math.ceil(light.scissor[3] * screenSize[3])
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
                setStageUniforms("specular", program, gl, material.specularStage);
                setStageUniforms("diffuse", program, gl, material.diffuseStage);


                drawModel(gl, program, model);
            })
        };

        gl.disableVertexAttribArray(program.normalAttribute);
        gl.disableVertexAttribArray(program.textureCoordAttribute);

        gl.disable(gl.SCISSOR_TEST);
        gl.disable(gl.POLYGON_OFFSET_FILL);
        gl.disable(gl.BLEND);
    }

    function drawStages(gl, drawBuffer, camera){
        var program = this.shaders.stage;

        gl.useProgram(program);
        gl.enableVertexAttribArray(program.positionAttribute);
        gl.enableVertexAttribArray(program.normalAttribute);
        gl.enableVertexAttribArray(program.textureCoordAttribute);

        setShaderUniforms(gl, program, camera);

        gl.depthFunc(gl.LEQUAL);

        gl.enable(gl.BLEND);
        gl.enable(gl.POLYGON_OFFSET_FILL);

        drawBuffer.fullBrightModels.forEach(function(model){
            var material = model.material;

            material.stages.forEach(function(stage){
                if(!stage.map){
                    return;
                }
        
                // Set the blend function
                gl.blendFunc(stage.blend.src, stage.blend.dst);
        
                // Set the color mask
                gl.colorMask(stage.maskRed, stage.maskGreen, stage.maskBlue, stage.maskAlpha);

                // Set stage properties
                setStageUniforms("stage", program, gl, stage);
        
                // Set the textures
                var texture = stage.map.getGlTexture(gl);
        
                gl.activeTexture(gl.TEXTURE2);
                gl.bindTexture(gl.TEXTURE_2D, texture);

                drawModel(gl, program, model);
            });
        });

        gl.disableVertexAttribArray(program.normalAttribute);
        gl.disableVertexAttribArray(program.textureCoordAttribute);

        gl.disable(gl.POLYGON_OFFSET_FILL);
        gl.disable(gl.BLEND);
    }

    Display.prototype.draw = function(drawBuffer, camera){
        var gl = this.gl;

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        gl.viewport(0, 0, this.size[0], this.size[1]);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Draw to the depth buffer
        drawDepth.call(this, gl, drawBuffer, camera);

        // Draw for each light
        drawLights.call(this, gl, drawBuffer, camera);

        // Draw fully bright elements
        drawStages.call(this, gl, drawBuffer, camera);

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
        this.size[2] = width >> 1;
        this.size[3] = height >> 1;

        this.gl.viewport(0, 0, width, height);
    }

    function drawShadowMap(gl, program, models, transform, texture, faceType, light){
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);
        gl.depthMask(true);

        gl.uniformMatrix4fv(program.modelMatrixUniform, false, transform.invMatrix);

        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, faceType, texture, 0);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        models.forEach(function(model, cIndex){
            drawModel(gl, program, model);
        });

        gl.finish();

        // Temp code to draw the canvas to the screen.
        var width = 512;
        var height = 512;
        var canvas = null;
        var divId = light.name + "_div";
        var x = 0, y = 0;
        if(faceType == gl.TEXTURE_CUBE_MAP_NEGATIVE_Z){
            var div = $("<div></div>");
            div.attr("id", divId);
            $("body").append(div);

            var title = $("<div></div>");
            title.text(light.name);
            div.append(title);

            canvas = $("<canvas></canvas>");
            canvas.attr("width", width << 2);
            canvas.attr("height", height * 3);
            div.append(canvas);

            x = width;
            y = height;
        }else{
            canvas = $("#" + divId + " > canvas");

            switch(faceType){
                case gl.TEXTURE_CUBE_MAP_NEGATIVE_X:
                    x = 0;
                    y = height;
                    break;

                case gl.TEXTURE_CUBE_MAP_POSITIVE_Z:
                    x = width * 3;
                    y = height;
                    break;

                case gl.TEXTURE_CUBE_MAP_POSITIVE_X:
                    x = width * 2;
                    y = height;
                    break;
                
                case gl.TEXTURE_CUBE_MAP_POSITIVE_Y:
                    x = width;
                    y = height * 2;
                    break;

                case gl.TEXTURE_CUBE_MAP_NEGATIVE_Y:
                    x = width;
                    y = 0;
                    break;
            }
        }

        var canRead = (gl.checkFramebufferStatus(gl.FRAMEBUFFER) == gl.FRAMEBUFFER_COMPLETE);
        var data = new Uint8Array(width * height * 4);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, data);
        var imgData = new ImageData(new Uint8ClampedArray(data), width, height);

        var context = canvas[0].getContext("2d");
        context.putImageData(imgData, x, y);
    }

    function generatePointShadowTexture(gl, width, height){
        var faceTypes = [gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, gl.TEXTURE_CUBE_MAP_NEGATIVE_X, gl.TEXTURE_CUBE_MAP_POSITIVE_Z, gl.TEXTURE_CUBE_MAP_POSITIVE_X, gl.TEXTURE_CUBE_MAP_POSITIVE_Y, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y];

        var texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        faceTypes.forEach(function(faceType){
            const level = 0;
            const internalFormat = gl.DEPTH_COMPONENT24;
            const border = 0;
            const format = gl.DEPTH_COMPONENT;
            const type = gl.UNSIGNED_INT;
            const data = null;
            gl.texImage2D(faceType, level, internalFormat,
                            width, height, border,
                            format, type, data);
            
            // set the filtering so we don't need mips
            
            //gl.texParameteri(gl.faceType, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            //gl.texParameteri(gl.faceType, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        });

        return texture;
    }
    
    Display.prototype.generateStaticShadowMap = function(light){
        var gl = this.gl;

        var frameBuffer = this.shadowBuffer;
        gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer.buffer);
        gl.viewport(0, 0, frameBuffer.width, frameBuffer.height);

        var projectionMatrix = new Matrix4();
        var transform = new Transform(Vector3.zero, Quaternion.zero, Vector3.one);
        var lightPostion = light.transform.position;
        transform.translate(-lightPostion[0], -lightPostion[1], -lightPostion[2])

        var radius = Math.max(light.radius[0], light.radius[1], light.radius[2]);
        var halfPI = Math.PI / 2.0;

        var program = this.shaders.depth;
        gl.useProgram(program);

        gl.enableVertexAttribArray(program.positionAttribute);

        var texture = generatePointShadowTexture(gl, frameBuffer.width, frameBuffer.height);
        light.staticShadowMap = texture;

        // Create the perspective matrix
        {
            let aspectRatio = 1.0;
            let near = lightNear;
            let top = near * Math.tan(Math.PI / 4.0);
            let bottom = -top;
            let right = top * aspectRatio;
            let left = -right;

            Camera.createFrustrum(left, right, bottom, top, near, radius, projectionMatrix);
            gl.uniformMatrix4fv(program.viewMatrixUniform, false, projectionMatrix);
        }

        // Setup which models to draw
        var models = [];
        light.areas.forEach(function(area){
            area.brushes.forEach(function(brush){
                if(brush.material != null && brush.material.shadows){
                    models.push(brush);
                }
            });
        });

        // Draw each face of the cube map

        // Forward
        drawShadowMap.call(this, gl, program, models, transform, texture, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, light);

        // Left
        transform.rotate(halfPI, 0, 1.0, 0);
        drawShadowMap.call(this, gl, program, models, transform, texture, gl.TEXTURE_CUBE_MAP_NEGATIVE_X, light);

        // Back
        transform.rotate(halfPI, 0, 1.0, 0);
        drawShadowMap.call(this, gl, program, models, transform, texture, gl.TEXTURE_CUBE_MAP_POSITIVE_Z, light);

        // Right
        transform.rotate(halfPI, 0, 1.0, 0);
        drawShadowMap.call(this, gl, program, models, transform, texture, gl.TEXTURE_CUBE_MAP_POSITIVE_X, light);

        // Up
        transform.rotate(halfPI, 0, 1.0, 0);
        transform.rotate(halfPI, 1.0, 0, 0);
        drawShadowMap.call(this, gl, program, models, transform, texture, gl.TEXTURE_CUBE_MAP_POSITIVE_Y, light);
        
        // Down
        transform.rotate(halfPI, -1.0, 0, 0);
        transform.rotate(halfPI, -1.0, 0, 0);
        drawShadowMap.call(this, gl, program, models, transform, texture, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, light);
    }
}