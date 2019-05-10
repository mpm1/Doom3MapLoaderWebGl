var testVertex = `#version 300 es
    in vec3 a_position;
    in vec2 a_textureCoord;
    in vec3 a_normal;

    uniform mat4 worldTransform;
    uniform mat4 projectionTransform;

    out vec4 v_position;
    out vec2 v_textureCoord;
    out vec3 v_normal;

    void main(){
        v_position = vec4(a_position, 1.0) * worldTransform;
        v_textureCoord = a_textureCoord;

        gl_Position = v_position * projectionTransform;
    }
`

var testFragment = `#version 300 es
    precision mediump float;

    in vec4 v_position;
    in vec2 v_textureCoord;
    in vec3 v_normal;

    out vec4 outColor;

    void main(){
        vec3 n = normalize(v_normal);
        float nDotL = dot(n, normalize(vec3(-1, -1, -1)));

        outColor = vec4(1, 1, 1, 1);
        outColor.rgb *= nDotL;
    }
`


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
        gl.clearDepth(1);

        return gl;
    }

    function createVertexBuffer(vertecies){

    }

    function createIndeciesBuffer(indecies){

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

    function createShaderProgram(gl, name, vert, frag){
        Console.current.writeLine("Loading shader " + name + "...");

        var vertexShader = createShader(gl, name + "_vert", gl.VERTEX_SHADER, vert);
        var fragmentShader = createShader(gl, name + "_frag", gl.FRAGMENT_SHADER, frag);

        var program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if(gl.getProgramParameter(program, gl.LINK_STATUS)){
            program.name = name;

            program.positionAttribute = gl.getAttribLocation(program, "a_position");
            program.textureCoordAttribute = gl.getAttribLocation(program, "a_textureCoord");
            program.normalAttribute = gl.getAttribLocation(program, "normal");

            program.modelMatrixUniform = gl.getUniformLocation(program, "worldTransform");
            program.viewMatrixUniform = gl.getUniformLocation(program, "projectionTransform");

            Console.current.writeLine("Shader loaded successfully.");

            return program;
        }

        Console.log.writeLine("Error creating shader program " + name + ": " + gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
    }

    Display.prototype.init = function(canvas){
        var gl = initializeGL.call(this, canvas);

        this.size = new Uint16Array([canvas.width, canvas.height]);
        this.gl = gl;
        this.shaders = { "test" : createShaderProgram(gl, "test", testVertex, testFragment) };

        // Temp code to create the basic shader


        this.resize(canvas.width, canvas.height);
    }
    Display.prototype.draw = function(lightCluster, camera){
        var gl = this.gl;

        gl.useProgram(shaders.test);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        lightContainers.foreach(function(container, index){
            //TODO: For now we are rendering every area. We will eventually group this into light clusters
            container.brushes.foreach(function(brush, index){
                //For now we will dynamically create the buffers
                if(!brush.vertecies.buffer){
                    
                }
            });
        })
    }
    Display.prototype.resize = function(width, height){
        this.size[0] = width;
        this.size[1] = height;

        this.gl.viewportWidth = width;
        this.gl.viewportHeight = height;
    }
    
}