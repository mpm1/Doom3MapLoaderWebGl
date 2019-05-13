
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
    var bufferMatrix = new Matrix4();

    function updateMatrix(matrix){
        // Move to position
        Matrix4.translationMatrix(this.position[0], this.position[1], this.position[2], bufferMatrix);

        // Rotate the matrix
        Matrix4.rotateByQuaternion(bufferMatrix, this.rotation, matrix);

        return matrix;
    }

    Transform.prototype.init = function(position, rotation, scale){
        var modelMatrix = new Matrix4();
        var rotationMatrix = new Matrix4();

        this.position = position;
        this.rotation = rotation;
        this.scale = scale;
        this.translationChanged = true;
        this.rotationChanged = true;

        Object.defineProperty(this, "matrix", {
            get: function(){
                if(this.translationChanged || this.rotationChanged){
                    updateMatrix.call(this, modelMatrix);
                    this.translationChanged = false;
                }

                return modelMatrix;
            }
        })

        Object.defineProperty(this, "rotationMatrix", {
            get: function(){
                if(this.rotationChanged){
                    Quaternion.rotationMatrix(this.rotation, rotationMatrix);
                    this.rotationChanged = false;
                }

                return rotationMatrix;
            }
        })
    }

    Transform.prototype.rotate = function(amount, x, y, z){
        this.rotationMatrix = true;
    }

    Transform.prototype.translate = function(x, y, z){
        this.translationChanged = true;

        var px = this.position[0];
        var py = this.position[1];
        var pz = this.position[2];

        this.position[0] = x;
        this.position[1] = y;
        this.position[2] = z;
        this.position[3] = 1.0;
        
        var translation = Matrix4.multiplyVector(this.rotationMatrix, this.position, this.position);

        this.position[0] += px;
        this.position[1] += py;
        this.position[2] += pz;
    }
}

var Camera = function(){
    this.init();
}
{
    Camera.prototype.init = function(){
        this.transform = new Transform(Vector3.zero, Quaternion.zero, Vector3.one);
        this.viewMatrix = new Matrix4();
    }

    Camera.prototype.setPerspective = function(fieldOfViewInRadians, aspectRatio, near, far){
        var matrix = this.viewMatrix;

        var f = 1.0 / Math.tan(fieldOfViewInRadians / 2);
        var rangeInv = 1.0 / (near - far);

        matrix[0] = f / aspectRatio;
        matrix[5] = f;
        matrix[10] = (near + far) * rangeInv;
        matrix[11] = -1;
        matrix[14] = near * far * rangeInv * 2.0;
        matrix[1] = matrix[2] = matrix[3] = matrix[4] = matrix[6] = matrix[7] = matrix[8] = matrix[9] = matrix[12] = matrix[13] = matrix[15] = 0.0;
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
        return function(file){
            //TODO: Create object
            this[name] = file.next();
        }
    }

    function createMapFunction(blendFunc){
        return function(file){
            this.map = file.next();
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

    function parseElement(file, tokenBuffer){
        var token;

        while((token = file.next()) != null){
            if(token == "{"){
                var child = new Material();

                if(parseElement.call(child, file, tokenBuffer)){
                    this.stages.push(child);
                }
            }else if(token == "}"){
                return true;
            }
            else{
                token = token.toLowerCase();
                if(tokenFunctions[token]){
                    tokenFunctions[token].call(this, file)
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

    Material.prototype.parse = function(file){
        var token;

        // This will only obtain the first material element it finds.
        do{
            token = file.current();

            if(token == "{"){
                return parseElement.call(this, file);
            }else{
                this.name = token;
            }
        }while(file.next() != null);

        return false;
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
    }

    Area.prototype.parse = function(file, map){
        this.name = file.next().replace("\"", "");
        
        var brushCount = parseInt(file.next());
        
        for(var i = 0; i < brushCount; ++i){
            file.next();

            var brush = new Brush();
            brush.parse(file, map);
            this.brushes.push(brush);
        }

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
ReadableVertex.readOrder = ["x", "y", "z", "u", "v", "nx", "ny", "nz", "r", "g", "b"];
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

    function minVector(v1, v2, vOut){
        vOut[0] = Math.min(v1[0], v2[0]);
        vOut[1] = Math.min(v1[1], v2[1]);
        vOut[2] = Math.min(v1[2], v2[2]);
    }

    function maxVector(v1, v2, vOut){
        vOut[0] = Math.max(v1[0], v2[0]);
        vOut[1] = Math.max(v1[1], v2[1]);
        vOut[2] = Math.max(v1[2], v2[2]);
    }

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
        var token;

        this.vertecies = new Float32Array(vertCount * ReadableVertex.readOrder.length);
        this.indecies = new Uint16Array(indexCount);
        this.material = map.materials[materialName];

        // Read Verticies
        for(var i = 0; i < vertCount; ++i){
            var vIndex = i * ReadableVertex.readOrder.length;
            var vertex = new ReadableVertex();
            vertex.parse(file);

            minVector(vertex, minBounds, minBounds);
            maxVector(vertex, maxBounds, maxBounds);

            for(var v = 0; v < ReadableVertex.readOrder.length; ++v){
                this.vertecies[vIndex + v] = vertex[ReadableVertex.readOrder[v]];
            }
        }
        this.vertecies.vertCount = vertCount;
        bounds[0] = minVector[0];
        bounds[1] = minVector[1];
        bounds[2] = minVector[2];
        bounds[3] = maxVector[0];
        bounds[4] = maxVector[1];
        bounds[5] = maxVector[2];

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

            if(material.parse(materialFile)){
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
        this.areas = {};
        this.camera = new Camera();

        this.camera.setPerspective(2.2, 16.0 / 9.0, 0.1, 1000.0);
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
                    
                    pak.file("maps/" + map.name + ".proc").async("string").then(function(text){
                        loadProcFile.call(map, new FileLexer(text));
                        map.isLoaded = true;

                        resolve(map);
                    }, reject);
                }, reject);
            }, reject);
        });
    }

    /**
     * Unloads the map from memory.
     */
    Map.prototype.unload = function(){

    }
}