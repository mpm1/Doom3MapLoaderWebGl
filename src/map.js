
// TODO: Convert to GL blend modes
const BLEND_MODES = {
    "gl_zero" : 0,
    "gl_one" : 1,
    "gl_src_alpha" : 2,
    "gl_one_minus_src_alpha" : 3,
    "gl_dst_color" : 4
}


var Transform = function(position, rotation, scale){
    this.init(position, rotation, scale);
}
{
    Transform.prototype.init = function(position, rotation, scale){
        var matrix = new Matrix4();
        var right = new Float32Array(matrix.buffer, 4 * 0, 3)
        var up = new Float32Array(matrix.buffer, 4 * 4, 3);
        var back = new Float32Array(matrix.buffer, 4 * 8, 3);
        var position = new Float32Array(matrix.buffer, 4 * 12, 3);
        var scale = new Vector3();

        Object.defineProperty(this, "position", {
            get: function(){
                return position;
            }
        })

        Object.defineProperty(this, "backward", {
            get: function(){
                return back;
            }
        });

        Object.defineProperty(this, "right", {
            get: function(){
                return right;
            }
        });

        Object.defineProperty(this, "up", {
            get: function(){
                return up;
            }
        });

        Object.defineProperty(this, "scale", {
            get: function(){
                scale[0] = Vector3.length(right);
                scale[1] = Vector3.length(up);
                scale[2] = Vector3.length(back);

                return scale;
            }
        })

        this.matrix = matrix;
    }

    Transform.prototype.rotate = function(rads, x, y, z){
        Matrix4.rotate(this.matrix, x, y, z, rads, this.matrix);
    }

    Transform.prototype.translate = function(x, y, z){
        var position = this.position;
        position[0] += x;
        position[1] += y;
        position[2] += z;
    }
}

var Camera = function(){
    this.init();
}
{
    Camera.prototype.init = function(){
        this.transform = new Transform(Vector3.zero, Quaternion.zero, Vector3.one);
        this.projectionMatrix = new Matrix4();
    }

    Camera.createFrustrum = function(left, right, bottom, top, near, far, matrix){
        var invRL = 1.0 / (right - left);
        var invTB = 1.0 / (top - bottom);
        var invNF = 1.0 / (near - far);

        matrix.fill(0);

        matrix[0] = (2.0 * near) * invRL;
        matrix[5] = (2.0 * near) * invTB;
        matrix[10] = (far + near) * invNF;
        matrix[11] = -1.0;
        matrix[12] = -near * (right + left) * invRL;
        matrix[13] = -near * (top + bottom) * invTB;
        matrix[14] = 2.0 * far * near * invNF;

        return matrix;
    }

    Camera.prototype.setPerspective = function(fovInDegrees, aspectRatio, near, far){
        var top = near * Math.tan(degreeToRadins(fovInDegrees) / 2.0);
        var bottom = -top;
        var right = top * aspectRatio;
        var left = -right;

        return Camera.createFrustrum(left, right, bottom, top, near, far, this.projectionMatrix);
    }
}

var Material = function(){
    this.init();
}
{
    function createSetStringFunction(name){
        return function(file){
            this[name] = file.next();
        }
    }

    function createSetNumberFunction(name){
        return function(file){
            this[name] = parseFloat(file.next());
        }
    }

    function createSetImageFunction(name){
        return function(file, map){
            this[name] = map.getTexture(file.next());
        }
    }

    function createMapFunction(blendFunc){
        return function(file, map){
            this.map = map.getTexture(file.next());
            setBlendFromValue.call(this, file, blendFunc);
        }
    }

    function createSetBoolFunction(name, value){
        return function(file){
            this[name] = value;
        }
    }

    function setBlendFromValue(file, firstToken){
        switch(firstToken){
            case "blend":
                this.blend.src = BLEND_MODES["gl_zero"];
                this.blend.dst = BLEND_MODES["gl_one"];
                break;

            case "add":
                this.blend.src = BLEND_MODES["gl_src_alpha"];
                this.blend.dst = BLEND_MODES["gl_one_minus_src_alpha"];
                break;

            case "add":
                this.blend.src = BLEND_MODES["gl_one"];
                this.blend.dst = BLEND_MODES["gl_one"];
                break;

            case "filter":
                this.blend.src = BLEND_MODES["gl_dst_color"];
                this.blend.dst = BLEND_MODES["gl_zero"];
                break;

            case "none":
                this.blend.src = BLEND_MODES["gl_zero"];
                this.blend.dst = BLEND_MODES["gl_zero"];
                break;

            case "filter":
                this.blend.src = BLEND_MODES["gl_dst_color"];
                this.blend.dst = BLEND_MODES["gl_zero"];
                break;

            case "bumpmap":
            case "diffusemap":
            case "specularmap":
                this.blend.custom = firstToken;
                break;

            default:
                this.blend.src = BLEND_MODES[firstToken];
                this.blend.dst = BLEND_MODES[file.next()];
        }
    }

    function setBlendFunction(file){
        var firstToken = file.next();

        setBlendFromValue.call(this, file, firstToken);
    }

    function createColorMaskFunction(mask){
        return function(file){
            this.mask = this.mask & mask;
        }
    }

    var tokenFunctions = {
        "qer_editorimage" : createSetStringFunction("editorImage"),
        "blend" : setBlendFunction,
        "map" : createSetImageFunction("map"),
        "diffusemap" : createMapFunction("diffusemap"),
        "specularmap" : createMapFunction("specularmap"),
        "bumpmap" : createMapFunction("bumpmap"),
        "maskred" : createColorMaskFunction(0x00FFFFFF),
        "maskgreen" : createColorMaskFunction(0xFF00FFFF),
        "maskblue" : createColorMaskFunction(0xFFFF00FF),
        "maskalpha" : createColorMaskFunction(0xFFFFFF00),
        "maskcolor" : createColorMaskFunction(0x000000FF),
        "alphatest" : createSetNumberFunction("alphaTest"),
        "translucent" : createSetBoolFunction("translucent", true),
        "nonsolid" : createSetBoolFunction("solid", false),
        "alphatest" : createSetBoolFunction("alphaTest", true),
        "noshadows" : createSetBoolFunction("shadows", false),
        "noselfshadow" : createSetBoolFunction("selfShadow", false)

    }

    function parseElement(file, map){
        var token;

        while((token = file.next()) != null){
            if(token == "{"){
                var child = new Material();

                if(parseElement.call(child, file, map)){
                    this.stages.push(child);
                }
            }else if(token == "}"){
                return true;
            }
            else{
                token = token.toLowerCase();
                if(tokenFunctions[token]){
                    tokenFunctions[token].call(this, file, map)
                }else{
                    Console.current.writeLine("Function " + token + " not found.");
                }
            }
        }

        return false;
    }

    Material.prototype.init = function(){
        this.stages = [];
        this.name = null;

        this.editorImage = null;
        this.blend = {
            customMode: null,
            src: BLEND_MODES["gl_zero"],
            dst: BLEND_MODES["gl_one"]
        }
        this.map = null;
        this.colorMask = 0xFFFFFFFF;
        this.alphaTest = 0.0;
        this.translucent = false;
        this.solid = true;
        this.alphaTest = false;
        this.shadows = true;
        this.selfShadows = true;
    }

    Material.prototype.parse = function(file, map){
        var token;

        // This will only obtain the first material element it finds.
        do{
            token = file.current();

            if(token == "{"){
                return parseElement.call(this, file, map);
            }else{
                this.name = token;
            }
        }while(file.next() != null);

        return false;
    }
}

var Texture = function(){
    this.imageData = null;

    this.glTexture = null;
}
{
    function generateEmptyTexture(gl){
        var texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);

        const level = 0;
        const internalFormat = gl.RGBA;
        const width = 1;
        const height = 1;
        const border = 0;
        const srcFormat = gl.RGBA;
        const srcType = gl.UNSIGNED_BYTE;
        const pixel = new Uint8Array([0, 0, 255, 255]);
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                        width, height, border, srcFormat, srcType,
                        pixel);

        texture.loaded = false;

        return texture;
    }

    Texture.prototype.load = function(tgaData){
        var tga = new TGA();
        tga.load(tgaData);

        this.imageData = tga.getImageData();
    }

    Texture.prototype.getGlTexture = function(gl){
        var texture = this.glTexture;

        if(texture == null){
            texture = generateEmptyTexture(gl);
            this.glTexture = texture;
        }

        if(!texture.loaded && this.imageData != null){
            var imageData = this.imageData;
            gl.bindTexture(gl.TEXTURE_2D, texture);

            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,  
                imageData.width, imageData.height, 0, gl.RGBA,
                gl.UNSIGNED_BYTE, new Uint8Array(imageData.data.buffer));

            if(isPositivePower2(imageData.width) && isPositivePower2(imageData.height)){
                gl.generateMipmap(gl.TEXTURE_2D);
            }else{
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            }

            texture.loaded = true;
        }

        return texture;
    }

    Texture.prototype.destroyGlTexture = function(gl){
        gl.deleteTexture(this.glTexture);
    }
}

var Actor = function(position, rotation, scale){
    init(position, rotation, scale);
}
Actor.prototype.init = function(position, rotation, scale){
    this.transform = new Transform();
    this.children = [];
}
Actor.prototype.draw = function(display){
    display.pushTransform(this.transform);

    this.children.forEach(function(child){
        child.draw(display);
    });

    display.popTransform();
}

var Area = function(){
    this.init(Vector3.zero, Quaternion.zero, Vector3.one);
}
{
    Area.prototype = Object.create(Actor.prototype);

    Area.prototype.init = function() {
        Actor.prototype.init.apply(this, arguments);

        this.name = "";
        this.brushes = [];
        this.bounds = new Float32Array(6); //TODO: plan the bounds for light clustering.
    }

    Area.prototype.parse = function(file, map){
        var minBounds = new Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
        var maxBounds = new Vector3(Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE);
        this.name = file.next().replace("\"", "");
        
        var brushCount = parseInt(file.next());
        var bounds;
        
        for(var i = 0; i < brushCount; ++i){
            file.next();

            var brush = new Brush();
            brush.parse(file, map);
            this.brushes.push(brush);

            bounds = brush.bounds;
            Vector3.min(new Vector3(bounds[0], bounds[1], bounds[2]), minBounds, minBounds);
            Vector3.max(new Vector3(bounds[3], bounds[4], bounds[5]), maxBounds, maxBounds);
        }

        bounds = this.bounds;
        bounds[0] = minBounds[0];
        bounds[1] = minBounds[1];
        bounds[2] = minBounds[2];
        bounds[3] = maxBounds[0];
        bounds[4] = maxBounds[1];
        bounds[5] = maxBounds[2];

        file.readUntil("}");
    }
}

var ReadableVertex = function(){
    this.x = 0.0;
    this.y = 0.0;
    this.z = 0.0;
    this.u = 0.0;
    this.v = 0.0;
    this.nx = 0.0;
    this.ny = 1.0;
    this.nz = 0.0;
    this.r = 0;
    this.g = 0;
    this.b = 0;
}
ReadableVertex.readOrder = ["x", "z", "y", "u", "v", "nx", "nz", "ny", "r", "g", "b"];
ReadableVertex.writeOrder = ["x", "y", "z", "u", "v", "nx", "ny", "nz", "r", "g", "b"]; // This is done since we flip x and y.
ReadableVertex.stride = ReadableVertex.readOrder.length * 4;
ReadableVertex.positionOffset = 0 * 4;
ReadableVertex.textureOffset = 3 * 4;
ReadableVertex.normalOffset = 5 * 4;
ReadableVertex.colorOffset = 8 * 4;
ReadableVertex.prototype.parse = function(file){
    var token;
    file.readUntil("(");

    for(var i = 0; i < ReadableVertex.readOrder.length; ++i){
        token = file.next();

        if(token == ")"){
            return;
        }

        this[ReadableVertex.readOrder[i]] = parseFloat(token);
    }

    file.readUntil(")");
}

var Brush = function(){
    this.init();
}
{

    Brush.prototype.init = function(){
        this.vertecies = null;
        this.indecies = null;
        this.bounds = new Float32Array(6); //TODO: plan the bounds for light clustering.
        this.material = null;
    }
    Brush.prototype.draw = function(display){
        display.draw(this.vertecies, this.polygons, this.material)
    }
    Brush.prototype.parse = function(file, map){
        var materialName = file.next().replace(/"/g, "");
        var vertCount = parseInt(file.next());
        var indexCount = parseInt(file.next());
        var minBounds = new Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
        var maxBounds = new Vector3(Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE);
        var bounds = this.bounds;
        var token;

        this.vertecies = new Float32Array(vertCount * ReadableVertex.readOrder.length);
        this.indecies = new Uint16Array(indexCount);
        this.material = map.materials[materialName];

        // Read Verticies
        for(var i = 0; i < vertCount; ++i){
            var vIndex = i * ReadableVertex.readOrder.length;
            var vertex = new ReadableVertex();
            vertex.parse(file);

            var vCheck = new Vector3(vertex.x, vertex.y, vertex.z);
            Vector3.min(vCheck, minBounds, minBounds);
            Vector3.max(vCheck, maxBounds, maxBounds);

            for(var v = 0; v < ReadableVertex.writeOrder.length; ++v){
                this.vertecies[vIndex + v] = vertex[ReadableVertex.writeOrder[v]];
            }
        }

        this.vertecies.vertCount = vertCount;
        bounds[0] = minBounds[0];
        bounds[1] = minBounds[1];
        bounds[2] = minBounds[2];
        bounds[3] = maxBounds[0];
        bounds[4] = maxBounds[1];
        bounds[5] = maxBounds[2];

        // Read indecies
        for(var i = 0; i < indexCount; ++i){
            this.indecies[i] = parseInt(file.next());
        }

        file.readUntil("}");
    }
}

function Map(mapName, pakFile){
    this.init(mapName, pakFile);
}
{

    /**
     * Loads the map into memory.
     * 
     * @param {FileLexer} materialFile 
     */
    function loadMaterials(materialFile){
        this.line = 0;
        var materialIndex = 0;
        var materialCount = 0;

        Console.current.writeLine("Loading materials...");

        while(materialFile.next() != null){
            var material = new Material();

            if(material.parse(materialFile, this)){
                this.materials[material.name] = material;
                ++materialCount;
            }else{
                Console.current.writeLine("Failed to load material " + material.name + " index " + materialIndex);
            }

            ++materialIndex;
        }

        Console.current.writeLine(materialCount + " materials loaded.");
    }

    /**
     * Loads the .map file into memory creating the needed areas and lights.
     * 
     * @param {FileLexer} mapFile 
     */
    function loadMap(mapFile){
    }


    /** Loads the .proc file into memory and creates the needed brushes and shadow volumes. */
    function loadProcFile(procFile){
        var procType = procFile.next();
        var token;

        while((token = procFile.next()) != null){
            if(token == "model") {
                procFile.next(); //Obtain the opening bracket.
                var area = new Area();
                area.parse(procFile, this);

                this.areas[area.name] = area;
            }
        }
    }

    Map.prototype.init = function(mapName, pakFile){
        this.isLoaded = false;
        this.name = mapName;
        this.pakFile = pakFile;
        this.materials = {};
        this.textures = {};
        this.areas = {};
        this.camera = new Camera();

        this.camera.setPerspective(100.0, 16.0 / 9.0, 0.1, 1000.0);
    }

    /**
     * Loads the map into memory.
     * 
     * @returns {Promise} Stating if the map was resolved or rejected.
     */
    Map.prototype.load = function(){
        if(this.isLoaded){
            return;
        }

        var map = this;
        var pak = this.pakFile;

        return new Promise(function(resolve, reject){
            pak.file("materials/" + map.name + ".mtr").async("string").then(function(text){
                loadMaterials.call(map, new FileLexer(text));
                
                pak.file("maps/" + map.name + ".map").async("string").then(function(text){
                    loadMap.call(map, new FileLexer(text));

                    // Temp code to set the starting position.
                    var position = map.camera.transform.position;
                    position[0] = -416;
                    position[1] = -100;
                    position[2] = -1288;
                    
                    pak.file("maps/" + map.name + ".proc").async("string").then(function(text){
                        loadProcFile.call(map, new FileLexer(text));
                        map.isLoaded = true;

                        resolve(map);
                    }, reject);
                }, reject);
            }, reject);
        });
    }

    Map.prototype.getTexture = function(name){
        if(this.textures[name]){
            return this.textures[name];
        }else{
            var texture = new Texture();
            var file = this.pakFile.file(name);

            if(file){
                file.async("arraybuffer").then(function(buffer){
                    texture.load(buffer);
                }, function(error){
                    Console.current.writeLine("Failed to load texture " + texture + ": " + error)
                });
            }

            this.textures[name] = texture;
            return texture;
        }
    }

    /**
     * Unloads the map from memory.
     */
    Map.prototype.unload = function(){

    }
}