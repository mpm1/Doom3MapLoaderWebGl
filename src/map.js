
// Blend modes using webgl values
const BLEND_MODES = {
    "gl_zero" : 0,
    "gl_one" : 1,
    "gl_src_alpha" : 770,
    "gl_one_minus_src_alpha" : 771,
    "gl_dst_color" : 774
}


var Transform = function(position, rotation, scale){
    this.init(position, rotation, scale);
}
{
    let mat3Buffer = new Matrix3();
    let vec3Buffer = new Vector3();

    function inverseTransformationMatrix(inMatrix, outMatrix){
        mat3Buffer[0] = inMatrix[0];
        mat3Buffer[1] = inMatrix[1];
        mat3Buffer[2] = inMatrix[2];
        
        mat3Buffer[3] = inMatrix[4];
        mat3Buffer[4] = inMatrix[5];
        mat3Buffer[5] = inMatrix[6];

        mat3Buffer[6] = inMatrix[8];
        mat3Buffer[7] = inMatrix[9];
        mat3Buffer[8] = inMatrix[10];

        var det = Matrix3.det(mat3Buffer);

        // TODO: handle when the determinate != 1;

        // Transpose the rotation
        mat3Buffer[0] = inMatrix[0];
        mat3Buffer[1] = inMatrix[4];
        mat3Buffer[2] = inMatrix[8];
        
        mat3Buffer[3] = inMatrix[1];
        mat3Buffer[4] = inMatrix[5];
        mat3Buffer[5] = inMatrix[9];

        mat3Buffer[6] = inMatrix[2];
        mat3Buffer[7] = inMatrix[6];
        mat3Buffer[8] = inMatrix[10];

        // Find the new translation
        vec3Buffer[0] = inMatrix[12];
        vec3Buffer[1] = inMatrix[13];
        vec3Buffer[2] = inMatrix[14];
        vec3Buffer[3] = inMatrix[15];

        Matrix3.multiplyVector(mat3Buffer, vec3Buffer, vec3Buffer);

        // Put the matrix back together
        outMatrix[0] = mat3Buffer[0];
        outMatrix[1] = mat3Buffer[1];
        outMatrix[2] = mat3Buffer[2];
        outMatrix[3] = 0.0;

        outMatrix[4] = mat3Buffer[3];
        outMatrix[5] = mat3Buffer[4];
        outMatrix[6] = mat3Buffer[5];
        outMatrix[7] = 0.0;

        outMatrix[8] = mat3Buffer[6];
        outMatrix[9] = mat3Buffer[7];
        outMatrix[10] = mat3Buffer[8];
        outMatrix[11] = 0.0;

        outMatrix[12] = vec3Buffer[0];
        outMatrix[13] = vec3Buffer[1];
        outMatrix[14] = vec3Buffer[2];
        outMatrix[15] = vec3Buffer[3];

        return outMatrix;
    }

    Transform.prototype.init = function(position, rotation, scale){
        var matrix = new Matrix4();
        var right = new Float32Array(matrix.buffer, 4 * 0, 3)
        var up = new Float32Array(matrix.buffer, 4 * 4, 3);
        var back = new Float32Array(matrix.buffer, 4 * 8, 3);
        var position = new Float32Array(matrix.buffer, 4 * 12, 3);
        var scale = new Vector3();

        var invMatrix = new Matrix4();
        var invRight = new Float32Array(invMatrix.buffer, 4 * 0, 3)
        var invUp = new Float32Array(invMatrix.buffer, 4 * 4, 3);
        var invBack = new Float32Array(invMatrix.buffer, 4 * 8, 3);

        Object.defineProperties(this, 
        {
            "position": {
                writeable: false,
                get: function(){
                    return position;
                }
            },
            "backward": {
                writeable: false,
                get: function(){
                    return back;
                }
            },
            "right": {
                writeable: false,
                get: function(){
                    return right;
                }
            },
            "up": {
                writeable: false,
                get: function(){
                    return up;
                }
            },
            "scale": {
                writeable: false,
                get: function(){
                    scale[0] = Vector3.length(right);
                    scale[1] = Vector3.length(up);
                    scale[2] = Vector3.length(back);

                    return scale;
                }
            }
        });

        // Inverse parameters
        function validateInverseMatrix(){
            if(this.stale){
                inverseTransformationMatrix(matrix, invMatrix);
                this.stale = false;
            }
        }

        Object.defineProperties(this, {
            "invMatrix": {
                writeable: false,
                get: function(){
                    validateInverseMatrix.call(this);

                    return invMatrix;
                }
            },
            "invUp": {
                writeable: false,
                get: function(){
                    validateInverseMatrix.call(this);

                    return invUp;
                }
            },
            "invRight": {
                writeable: false,
                get: function(){
                    validateInverseMatrix.call(this);
                    
                    return invRight;
                }
            }
        });

        this.matrix = matrix;
        this.stale = true;
    }

    Transform.prototype.rotate = function(rads, x, y, z){
        this.stale = true;

        Matrix4.rotate(this.matrix, x, y, z, rads, this.matrix);
    }

    Transform.prototype.translate = function(x, y, z){
        this.stale = true;

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
        this.near = 1;
        this.far = 100;

        var mvpMatrix = new Matrix4();

        Object.defineProperty(this, "mvpMatrix", {
            get: function(){
                return Matrix4.multiplyMatrix(this.projectionMatrix, this.transform.invMatrix, mvpMatrix);
            }
        });
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

        this.near = near;
        this.far = far;

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
            this.maskRed = mask & 0xFF000000 !== 0;
            this.maskBlue = mask & 0x00FF0000 !== 0;
            this.maskGreen = mask & 0x0000FF00 !== 0;
            this.maskAlpha = mask & 0x000000FF !== 0;
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
            src: BLEND_MODES["gl_one"],
            dst: BLEND_MODES["gl_one"]
        }
        this.map = null;
        this.maskRed = true;
        this.maskGreen = true;
        this.maskBlue = true;
        this.maskAlpha = true;
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

var Light = function(){
    this.init(Vector3.zero, Quaternion.zero, Vector3.one);
}
{
    Light.prototype = Object.create(Actor.prototype);

    Light.prototype.init = function(position, rotation, scale) {
        Actor.prototype.init.call(this, position, rotation, scale);

        this.classname = "";
        this.name = "";
        this.areas = [];
        this.radius = new Vector3();
        this.color = new Vector3(1, 1, 1);
        this.shadows = true;
        this.areas = [];
        this.bounds = new Float32Array(6);
        this.scissor = new Float32Array(4);

        Object.defineProperties(this, {
            "origin": {
                set: function(value){
                    var vals = value.split(/\s+/g);
                    var position = this.transform.position;
                    this.transform.stale = true;

                    position[0] = parseFloat(vals[0]);
                    position[1] = parseFloat(vals[2]);
                    position[2] = parseFloat(vals[1]);

                    this.recalculateBounds();
                }
            },
            "light_radius": {
                set: function(value){
                    var vals = value.split(/\s+/g);
                    this.radius[0] = parseFloat(vals[0]);
                    this.radius[1] = parseFloat(vals[2]);
                    this.radius[2] = parseFloat(vals[1]);

                    this.recalculateBounds();
                }
            },
            "_color": {
                set: function(value){
                    var vals = value.split(/\s+/g);
                    for(var i = 0; i < 4 && i < vals.length; ++i){
                        this.color[i] = parseFloat(vals[i]);
                    }
                }
            },
            "noshadows": {
                set: function(value){
                    this.shadows = value != 1;
                }
            }
        });
    }

    Light.prototype.recalculateBounds = function(){
        var bounds = this.bounds;
        var center = this.transform.position;
        var radius = this.radius;

        bounds[0] = center[0] - radius[0];
        bounds[1] = center[1] - radius[1];
        bounds[2] = center[2] - radius[2];

        bounds[3] = center[0] + radius[0];
        bounds[4] = center[1] + radius[1];
        bounds[5] = center[2] + radius[2];

        return bounds;
    }

    /**
     * Updates which areas are affected by the light.
     */
    Light.prototype.updateAreas = function(map){
        var current = this.areas;

        // Find all areas the light affects
        var areas = map.bspTree.findAreasInBounds(this.bounds, []);

        // Remove any areas not in the list
        for(var i = current.length - 1; i >= 0; --i){
            if(areas.indexOf(current[i]) < 0){
                current[i].removeLight(this);
                current.splice(i, 1);
            }
        }

        // Add any new areas
        for(var i = 0; i < areas.length; ++i){
            if(current.indexOf(areas[i]) < 0){
                areas[i].addLight(this);
                current.push(areas[i]);
            }
        }
    }
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
        this.clip = [];
        this.bounds = new Float32Array(6); //TODO: plan the bounds for light clustering.
        this.portals = [];
        this.lights = {};
    }

    Area.prototype.parse = function(file, map){
        var minBounds = new Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
        var maxBounds = new Vector3(Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE);
        this.name = file.nextString();
        var brushCount = parseInt(file.next());
        var bounds;
        
        for(var i = 0; i < brushCount; ++i){
            file.next();

            var brush = new Brush();
            brush.parse(file, map);

            if(brush.materialName == "textures/common/clip"){
                this.clip.push(brush);
            }else{
                this.brushes.push(brush);
            }

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

    Area.prototype.addLight = function(light){
        this.lights[light.name] = light;
    }

    Area.prototype.removeLight = function(light){
        delete this.lights[light.name];
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
        this.materialName = null;
    }
    Brush.prototype.draw = function(display){
        display.draw(this.vertecies, this.polygons, this.material)
    }
    Brush.prototype.parse = function(file, map){
        var materialName = file.nextString();
        var vertCount = parseInt(file.next());
        var indexCount = parseInt(file.next());
        var minBounds = new Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
        var maxBounds = new Vector3(Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE);
        var bounds = this.bounds;
        var token;

        this.vertecies = new Float32Array(vertCount * ReadableVertex.readOrder.length);
        this.indecies = new Uint16Array(indexCount);
        this.material = map.materials[materialName];
        this.materialName = materialName;

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

var Portal = function(){
    this.points = [];
    this.positiveId = -1;
    this.negativeId = -1;
    this.positive = null;
    this.negative = null
}
{
    function readPoint(file){
        file.next(); // Read the first bracket.

        // This order is used since we are using the y value as height.
        var x = parseFloat(file.next());
        var z = parseFloat(file.next());
        var y = parseFloat(file.next());

        var point = new Vector3(x, y, z);

        file.next(); // read the end bracket.

        return point;
    }

    Portal.prototype.parse = function(file){
        var pointCount = parseInt(file.next());

        // Get the connecting areas
        this.positiveId = parseInt(file.next());
        this.negativeId = parseInt(file.next());

        for(var i = 0; i < pointCount; ++i){
            this.points.push(readPoint(file));
        }
    }
}

function BSPTree() {
    this.equation = new Vector3();
    this.positive = null;
    this.negative = null;
}
{
    BSPTree.prototype.parse = function(file){
        file.next(); // Opening bracket.

        this.equation[0] = parseFloat(file.next());
        this.equation[2] = parseFloat(file.next()); // Swap the z and y values.
        this.equation[1] = parseFloat(file.next());
        this.equation[3] = parseFloat(file.next());

        file.next(); // Closing bracket.

        this.positive = parseInt(file.next());
        this.negative = parseInt(file.next());
    }

    BSPTree.prototype.findAreaByPoint = function(x, y, z){
        var value = (this.equation[0] * x) + (this.equation[1] * y) + (this.equation[2] * z) + this.equation[3];
        var result = value > 0 ? this.positive : this.negative;
                
        if(result == null){
            // We are inside an object or outside of the map.
            return null;
        }else if(result.hasOwnProperty("brushes")){
            return result;
        }

        return result.findAreaByPoint(x, y, z);
    }

    function evaluateBoundsNode(node, bounds, outputList){
        if(node == null){
            return;
        }else if(node.hasOwnProperty("brushes")){
            if(outputList.indexOf(node) < 0){
                outputList.push(node);
            }
        }else{
            node.findAreasInBounds(bounds, outputList);
        }
    }

    BSPTree.prototype.findAreasInBounds = function(bounds, outputList){
        var x = this.equation[0];
        var y = this.equation[1];
        var z = this.equation[2];
        var w = this.equation[3];

        var minValue = (bounds[0] * x) + (bounds[1] * y) + (bounds[2] * z) + w;
        var maxValue = (bounds[3] * x) + (bounds[4] * y) + (bounds[5] * z) + w;

        if(maxValue >= 0){
            evaluateBoundsNode(this.positive, bounds, outputList);
        }

        if(minValue < 0){
            evaluateBoundsNode(this.negative, bounds, outputList);
        }

        return outputList;
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

    function readEntityProperty(mapFile, entity){
        var token;
        var name = null;
        var value = null;

        while((token = mapFile.next()) != null){
            if(token == '"'){
                break;
            }

            if(name === null){
                name = "" + token;
            }else {
                name += " " + token;
            }
        }

        value = mapFile.nextString();

        entity[name] = value;
    }

    /**
     * Reads a single entity from a .mapfile
     * 
     * @param {FileLexer} mapFile 
     */
    function readEntity(mapFile){
        var entity = {};
        var brackets = 1;
        var name = null;
        var token;

        while((token = mapFile.next()) != null){
            switch(token){
                case '}':
                    --brackets;
                    if(brackets <= 0){
                        return entity;
                    }
                    break;
                
                case '{':
                    ++brackets;
                    break;

                case '"':
                    if(brackets == 1){
                        readEntityProperty.call(this, mapFile, entity);
                    }
                    break;
            }
        }

        return entity;
    }

    /**
     * Loads the .map file into memory creating the needed areas and lights.
     * 
     * @param {FileLexer} mapFile 
     */
    function loadMap(mapFile){
        var entities = [];
        var token = mapFile.next();

        if(token != "Version" || mapFile.next() != "2"){
            Console.current.writeLine("Invalid map file.");
            return entities;
        }

        while((token = mapFile.next()) != null){
            if(token == '{'){
                var entity = readEntity.call(this, mapFile);

                if(entity.hasOwnProperty("classname")){
                    entities.push(entity);
                }
            }
        }

        return entities;
    }

    function readPortals(procFile){
        procFile.next(); //Obtain the opening bracket.
        var areaNum = parseInt(procFile.next());
        var portalNum = parseInt(procFile.next());

        for(var i = 0; i < portalNum; ++i){
            var portal = new Portal();
            portal.parse(procFile);

            this.portals.push(portal);
        }

        procFile.next(); // read the closing bracket.
    }

    function readBSPTree(procFile){
        procFile.next(); //Obtain the opening bracket.
        var total = parseInt(procFile.next());
        var nodeList = new Array(total);

        for(var i = 0; i < total; ++i){
            var node = new BSPTree();
            node.parse(procFile);

            nodeList[i] = node;
        }

        procFile.next(); // read the closing bracket.

        return nodeList;
    }

    /** Loads the .proc file into memory and creates the needed brushes and shadow volumes. */
    function loadProcFile(procFile){
        var procType = procFile.next();
        var nodeList = null;
        var token;

        while((token = procFile.next()) != null){
            if(token == "model") {
                procFile.next(); //Obtain the opening bracket.
                var area = new Area();
                area.parse(procFile, this);

                this.areas[area.name] = area;
            }else if(token == "interAreaPortals") {
                readPortals.call(this, procFile);
            }else if(token == "nodes") {
                nodeList = readBSPTree.call(this, procFile);
            }
        }

        // Add portals to the areas.
        for(var i = 0; i < this.portals.length; ++i){
            var portal = this.portals[i];

            var posArea = this.areas["_area" + portal.positiveId];
            var negArea = this.areas["_area" + portal.negativeId];

            portal.positive = posArea;
            posArea.portals.push(portal);

            portal.negative = negArea;
            negArea.portals.push(portal);
        }

        // Build the BSP tree.
        if(nodeList != null && nodeList.length > 0){
            this.bspTree = nodeList[0];

            for(var i = 0; i < nodeList.length; ++i){
                var node = nodeList[i];

                if(node.positive < 0){
                    node.positive = this.areas["_area" + (-1 - node.positive)];
                }else if(node.positive > 0){
                    node.positive = nodeList[node.positive];
                }else {
                    node.positive = null;
                }

                if(node.negative < 0){
                    node.negative = this.areas["_area" + (-1 - node.negative)];
                }else if(node.negative > 0){
                    node.negative = nodeList[node.negative];
                }else {
                    node.negative = null;
                }
            }
        }
    }

    /**
     * Converts the entities into usable map objects.
     * 
     * @param {Array} entities 
     */
    function transformEntities(entities){
        for(var i = 0; i < entities.length; ++i){
            var entity = entities[i];

            if(entity.classname == "light"){
                var light = new Light();

                for(var prop in entity){
                    if(entity.hasOwnProperty(prop)){
                        light[prop] = entity[prop];
                    }
                }

                light.updateAreas(this);
            }else if(entity.classname == "info_player_start"){
                var vals = entity.origin.split(/\s+/g);
                var position = this.camera.transform.position;

                position[0] = -parseFloat(vals[0]);
                position[1] = -parseFloat(vals[2]) - 80.0;
                position[2] = -parseFloat(vals[1]);
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
        this.portals = [];
        this.camera = new Camera();
        this.bspTree = null;
        this.drawBuffer = {
            opaqueModels: [],
            transparentModels: [],
            fullBrightModels: [],
            lights: {},
            areas: {}
        }

        this.camera.setPerspective(80.0, 16.0 / 9.0, 0.1, 2000.0);
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
                    var entities = loadMap.call(map, new FileLexer(text));
                    
                    pak.file("maps/" + map.name + ".proc").async("string").then(function(text){
                        loadProcFile.call(map, new FileLexer(text));
                        map.isLoaded = true;

                        transformEntities.call(map, entities);

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

    function getAreaByPoint(x, y, z){
        // TODO: place areas into oct tree.
        var areas = this.areas;
        var bounds;
        for(var key in areas){
            if(areas.hasOwnProperty(key)){
                bounds = areas[key].bounds;

                if(!(x < bounds[0] || x > bounds[3] 
                    || y < bounds[1] || y > bounds[4]
                    || z < bounds[2] || z > bounds[5])){
                        return areas[key];
                    }
            }
        }

        return null;
    }

    let portalMaxBuffer = new Vector3();
    let portalMinBuffer = new Vector3();
    let portalVectorBuffer = new Vector3();
    function getPortalArea(portal, area, drawBuffer, camera, frustrumLeft, frustrumTop, frustrumRight, frustrumBottom, outputList){
        // Set the initial bounds
        portalMaxBuffer[0] = -8e+26;
        portalMaxBuffer[1] = -8e+26;
        portalMaxBuffer[2] = -8e+26;
        portalMaxBuffer[3] = 1.0;

        portalMinBuffer[0] = 8e+26;
        portalMinBuffer[1] = 8e+26;
        portalMinBuffer[2] = 8e+26;
        portalMinBuffer[3] = 1.0;

        // portal screen bounds
        var left = 8e+26;
        var top = 8e+26;
        var right = -8e+26;
        var bottom = -8e+26;

        // Data holders
        var point, absDiv, outArea;
        var points = portal.points;
        var x, y;

        for(var i = 0; i < points.length; ++i){
            point = points[i];
            Matrix4.multiplyVector(camera.transform.invMatrix, point, portalVectorBuffer);

            portalVectorBuffer[2] = -portalVectorBuffer[2];

            Vector3.max(portalVectorBuffer, portalMaxBuffer, portalMaxBuffer);
            Vector3.min(portalVectorBuffer, portalMinBuffer, portalMinBuffer);
        }

        portalMinBuffer[2] = -portalMinBuffer[2];
        portalMaxBuffer[2] = -portalMaxBuffer[2];

        // Check if the portal is behind the camera
        if(portalMaxBuffer[2] > camera.near){
            return;
        }

        if(portalMinBuffer[2] > camera.near){
            portalMinBuffer[2] = camera.near;
        }

        // Find the screen max bounds
        Matrix4.multiplyVector(camera.projectionMatrix, portalMaxBuffer, portalVectorBuffer);
        absDiv = Math.abs(portalVectorBuffer[3]);
        x = portalVectorBuffer[0] / absDiv;
        y = portalVectorBuffer[1] / absDiv;

        if(x < left){
            left = x;
        }

        if(x > right){
            right = x;
        }

        if(y < top){
            top = y;
        }

        if(y > bottom){
            bottom = y;
        }

        // Find the screen min bounds
        Matrix4.multiplyVector(camera.projectionMatrix, portalMinBuffer, portalVectorBuffer);
        absDiv = Math.abs(portalVectorBuffer[3]);
        x = portalVectorBuffer[0] / absDiv;
        y = portalVectorBuffer[1] / absDiv;

        if(x < left){
            left = x;
        }

        if(x > right){
            right = x;
        }

        if(y < top){
            top = y;
        }

        if(y > bottom){
            bottom = y;
        }

        // Check if our portal is outside the visible area of the screen.
        if(left > frustrumRight || top > frustrumBottom || right < frustrumLeft || bottom < frustrumTop){
            return;
        }

        // Create the new frustrum
        if(left < frustrumLeft){
            left = frustrumLeft;
        }

        if(top < frustrumTop){
            top = frustrumTop;
        }

        if(right > frustrumRight){
            right = frustrumRight;
        }

        if(bottom > frustrumBottom){
            bottom = frustrumBottom;
        }

        // Go through the portal
        if(area == portal.positive){
            outArea = portal.negative;
        }else{
            outArea = portal.positive;
        }

        if(addAreaToDrawBuffer(outArea, drawBuffer, camera)){

            // Find any child areas that need to be shown.
            readChildAreas(outArea, drawBuffer, camera, left, top, right, bottom);
        }
    }

    function readChildAreas(area, drawBuffer, camera, frustrumLeft, frustrumTop, frustrumRight, frustrumBottom){
        var portals = area.portals;
        var portal;

        for(var i = 0; i < portals.length; ++i){
            portal = portals[i];

            getPortalArea(portal, area, drawBuffer, camera, frustrumLeft, frustrumTop, frustrumRight, frustrumBottom);
        }
    }

    var scissorRight = new Vector3();
    var scissorUp = new Vector3();
    function getScissorWindow(light, camera, outBuffer){
        var r = Math.max(light.radius[0], light.radius[1], light.radius[2]);
        var center = light.transform.position;
        var up = camera.transform.up;
        var right = camera.transform.right;
        var mvMatrix = camera.transform.invMatrix;
        var pMatrix = camera.projectionMatrix;

        scissorRight[0] = center[0] + (right[0] * r);  
        scissorRight[1] = center[1] + (right[1] * r); 
        scissorRight[2] = center[2] + (right[2] * r);  
        scissorRight[3] = 1.0;  
        
        scissorUp[0] = center[0] + (up[0] * r);  
        scissorUp[1] = center[1] + (up[1] * r); 
        scissorUp[2] = center[2] + (up[2] * r);  
        scissorUp[3] = 1.0; 

        // Calculate the light sides
        Matrix4.multiplyVector(mvMatrix, scissorRight, scissorRight);
        Matrix4.multiplyVector(mvMatrix, scissorUp, scissorUp);

        // Handle light behind the camera
        scissorRight[2] = Math.min(scissorRight[2], -camera.near);
        scissorUp[2] = Math.min(scissorUp[2], -camera.near);

        // Project the points
        Matrix4.multiplyVector(pMatrix, scissorRight, scissorRight);
        Matrix4.multiplyVector(pMatrix, scissorUp, scissorUp);

        // Convert to screen coordinates
        scissorRight[0] = scissorRight[0] / scissorRight[3];
        scissorRight[1] = scissorRight[1] / scissorRight[3];
        scissorUp[0] = scissorUp[0] / scissorUp[3];
        scissorUp[1] = scissorUp[1] / scissorUp[3];

        // Set the screen coordiates
        outBuffer[0] = scissorUp[0] - (scissorRight[0] - scissorUp[0]);
        outBuffer[1] = scissorRight[1] - (scissorUp[1] - scissorRight[1]);
        outBuffer[2] = scissorRight[0] - outBuffer[0];
        outBuffer[3] = scissorUp[1] - outBuffer[1];

        // Check to see if the light is even visible
        if (outBuffer[2] <= 0.0 || outBuffer[3] <= 0.0) {
            return null
        }

        // Set to 0, 1 space screen coordinates
        outBuffer[0] = (outBuffer[0] + 1.0) * 0.5;
        outBuffer[1] = (outBuffer[1] + 1.0) * 0.5;

        return outBuffer;
    }

    function addAreaToDrawBuffer(area, drawBuffer, camera){
        if(!drawBuffer.areas.hasOwnProperty(area.name)){
            drawBuffer.areas[area.name] = area;
            var lights = area.lights;
            
            area.brushes.forEach(function(brush){
                var material = brush.material;

                if(material){
                    if(material.translucent){
                        drawBuffer.transparentModels.push(brush);
                    }else{
                        drawBuffer.opaqueModels.push(brush);

                        for(var lightName in lights){
                            var light = drawBuffer.lights[lightName];

                            if(!light){
                                light = {
                                    light: lights[lightName],
                                    scissor: getScissorWindow(lights[lightName], camera, lights[lightName].scissor),
                                    models: []
                                };

                                if(light.scissor == null){
                                    break;
                                }

                                drawBuffer.lights[lightName] = light;
                            }

                            //TODO: find if the brush is affected by the light
                            light.models.push(brush);
                        }
                    }
                }
            });

            return true;
        }

        return false; // we already have the area, so we did not add it to the buffer.
    }

    Map.prototype.calculateDrawBuffer = function(camera){
        this.drawBuffer.opaqueModels.length = 0;
        this.drawBuffer.transparentModels.length = 0;
        this.drawBuffer.fullBrightModels.length = 0;
        this.drawBuffer.lights = {}; //TODO: find a better way to do this.
        this.drawBuffer.areas = {};

        var position = camera.transform.position;
        var area = this.bspTree.findAreaByPoint(-position[0], -position[1], -position[2]);

        if(area != null){
            addAreaToDrawBuffer(area, this.drawBuffer, camera);

            readChildAreas.call(this, area, this.drawBuffer, camera, -1.0, -1.0, 1.0, 1.0);
        }
    }
}