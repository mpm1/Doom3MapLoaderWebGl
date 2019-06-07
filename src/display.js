var testVertex = `#version 300 es
    in vec3 a_position;
    in vec2 a_textureCoord;
    in vec3 a_normal;

    uniform mat4 worldTransform;
    uniform mat4 projectionTransform;

    out vec4 v_transformedPosition;
    out vec4 v_position;
    out vec2 v_textureCoord;
    out vec3 v_normal;

    void main(){
        v_position = worldTransform * vec4(a_position, 1.0);
        v_textureCoord = a_textureCoord;
        v_normal = normalize(a_normal);

        v_transformedPosition = projectionTransform * v_position;
        gl_Position = v_transformedPosition;
    }
`

var testFragment = `#version 300 es
    precision mediump float;

    in vec4 v_transformedPosition;
    in vec4 v_position;
    in vec2 v_textureCoord;
    in vec3 v_normal;

    uniform sampler2D uMap;

    out vec4 outColor;

    void main(){
        vec3 n = normalize(v_normal);
        float nDotL = dot(n, normalize(vec3(-1, 1, 1)));

        outColor = texture(uMap, v_textureCoord);
        outColor.a = 1.0;
        outColor.rgb *= max(0.1, nDotL);
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
            { name: "colorUniform", glName: "uColor", type: "uniform" }
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

        if(gl.getProgramParameter(program, gl.LINK_STATUS)){
            program.name = name;

            Object.keys(variableNames).forEach(function(key){
                if(variableNames.hasOwnProperty(key)){
                    var propName = variableNames[key];

                    switch(propName.type){
                        case "attribute":
                            program[propName.name] = gl.getAttribLocation(program, propName.glName);
                            break;

                        case "uniform":
                                program[propName.name] = gl.getUniformLocation(program, propName.glName);
                                break;
                    }
                }
            });

            Console.current.writeLine("Shader loaded successfully.");

            return program;
        }

        Console.log.writeLine("Error creating shader program " + name + ": " + gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
    }

    function setShaderUniforms(gl, program, camera){
        gl.uniformMatrix4fv(program.modelMatrixUniform, false, camera.transform.matrix);
        gl.uniformMatrix4fv(program.viewMatrixUniform, false, camera.projectionMatrix);
        gl.uniform1i(program.mapUniform, 0);
    }

    Display.prototype.init = function(canvas){
        var gl = initializeGL.call(this, canvas);

        this.size = new Uint16Array([canvas.width, canvas.height]);
        this.gl = gl;

        this.shaders = { 
            "test" : createShaderProgram(gl, "test", testVertex, testFragment, [
                { name: "positionAttribute", glName: "a_position", type: "attribute" },
                { name: "textureCoordAttribute", glName: "a_textureCoord", type: "attribute" },
                { name: "normalAttribute", glName: "a_normal", type: "attribute" },

                { name: "modelMatrixUniform", glName: "worldTransform", type: "uniform" },
                { name: "viewMatrixUniform", glName: "projectionTransform", type: "uniform" },
                { name: "mapUniform", glName: "uMap", type: "uniform" }
            ]) 
        };

        this.showBounds = false;
        this.boundsRenderer = new BoundsTester(gl, createShaderProgram);

        this.resize(canvas.width, canvas.height);
    }

    Display.prototype.draw = function(lightCluster, camera){
        var gl = this.gl;
        var program = this.shaders.test;
        var boundsRenderer = this.showBounds ? this.boundsRenderer : null;

        gl.useProgram(program);
        gl.enableVertexAttribArray(program.positionAttribute);
        gl.enableVertexAttribArray(program.normalAttribute);
        gl.enableVertexAttribArray(program.textureCoordAttribute);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        setShaderUniforms(gl, program, camera);

        lightCluster.forEach(function(container, cIndex){
            //TODO: For now we are rendering every area. We will eventually group this into light clusters
            container.brushes.forEach(function(brush, bIndex){
                var vert = brush.vertecies;
                var index = brush.indecies;
                var material = brush.material;

                if(material && material.map){
                    var texture = material.map.getGlTexture(gl);

                    gl.activeTexture(gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_2D, texture);
                }

                //For now we will dynamically create the buffers
                if(!vert.glBuffer){
                    createVertexBuffer(gl, vert);
                    createIndexBuffer(gl, index);
                }

                gl.bindBuffer(gl.ARRAY_BUFFER, vert.glBuffer);
                gl.vertexAttribPointer(program.positionAttribute, 3, gl.FLOAT, false, ReadableVertex.stride, ReadableVertex.positionOffset);
                gl.vertexAttribPointer(program.textureCoordAttribute, 2, gl.FLOAT, false, ReadableVertex.stride, ReadableVertex.textureOffset);
                gl.vertexAttribPointer(program.normalAttribute, 3, gl.FLOAT, true, ReadableVertex.stride, ReadableVertex.normalOffset);

                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index.glBuffer);
                gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);
                //gl.drawElements(gl.LINES, index.length, gl.UNSIGNED_SHORT, 0);

                if(boundsRenderer != null){
                    gl.disable(gl.DEPTH_TEST);
                    boundsRenderer.draw(gl, brush.bounds, camera.transform.matrix, camera.projectionMatrix);
                    gl.useProgram(program);
                    gl.enable(gl.DEPTH_TEST);
                }
            });
        })
    }
    Display.prototype.resize = function(width, height){
        this.size[0] = width;
        this.size[1] = height;

        this.gl.viewport(0, 0, width, height);
    }
    
}