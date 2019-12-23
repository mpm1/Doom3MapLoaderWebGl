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
        var right = new Float32Array(matrix.buffer, 4 * 0, 3);
        var up = new Float32Array(matrix.buffer, 4 * 4, 3);
        var back = new Float32Array(matrix.buffer, 4 * 8, 3);
        var position = new Float32Array(matrix.buffer, 4 * 12, 3);
        var scale = new Vector3();

        var invMatrix = new Matrix4();
        var invRight = new Float32Array(invMatrix.buffer, 4 * 0, 3)
        var invUp = new Float32Array(invMatrix.buffer, 4 * 4, 3);
        var invBack = new Float32Array(invMatrix.buffer, 4 * 8, 3);

        var normalMatrix = new Matrix4();

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
                Matrix4.transpose(matrix, normalMatrix);
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
            },
            "normalMatrix": {
                writeable: false,
                get: function(){
                    validateInverseMatrix.call(this);

                    return normalMatrix;
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

    // Uses a vector to decide the direction of a camera.
    Transform.prototype.lookAtVector = function(eyeVec, forwardVec, upVec){
        var forward = this.backward;
        var right = this.right;
        var up = this.up;
        var position = this.position;

        forward[0] = forwardVec[0];
        forward[1] = forwardVec[1];
        forward[2] = forwardVec[2];
        Vector3.normalized(forward, forward);

        Vector3.cross(forward, upVec, right);
        Vector3.normalized(right, right);

        Vector3.cross(right, forward, up);

        forward[0] = -forward[0];
        forward[1] = -forward[1];
        forward[2] = -forward[2];

        var outMatrix = this.matrix;
        outMatrix[3] = 0.0;
        outMatrix[7] = 0.0;
        outMatrix[11] = 0.0;
        outMatrix[15] = 1.0;

        position[0] = 0;
        position[1] = 0;
        position[2] = 0;

        this.translate(-eyeVec[0], -eyeVec[1], -eyeVec[2]);
        this.stale = true;
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
        this.bounds = new Float32Array(9);
        this.scissor = new Float32Array(4);
        this.staticShadowMap = null;

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

    Light.prototype.boundsIntersects = function(bounds){
        var check = this.bounds;        

        return !(bounds[0] > check[3] ||
                bounds[1] > check[4] ||
                bounds[2] > check[5] ||
                bounds[3] < check[0] ||
                bounds[4] < check[1] ||
                bounds[5] < check[2]);
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

    function normalizeViewCoordinates(inCoord){
        inCoord[0] = inCoord[0] / inCoord[3];
        inCoord[1] = inCoord[1] / inCoord[3];
    }

    let scissorUpBack = new Vector3();
    let scissorRightBack = new Vector3();
    let scissorUpFront = new Vector3();
    let scissorRightFront = new Vector3();
    let scissorCenter = new Vector3();
    /**
     * Calculates the scissor window for specific bounds based on the light and the current camera.
     */
    Light.prototype.getScissorWindow = function(camera, outBuffer){
        var r = Math.max(this.radius[0], this.radius[1], this.radius[2]);
        var center = this.transform.position;
        var maxZ = -camera.near;
        var minZ = -camera.far;
        var mvMatrix = camera.transform.invMatrix;
        var pMatrix = camera.projectionMatrix;

        // Calculate the light sides
        scissorCenter[0] = center[0];
        scissorCenter[1] = center[1];
        scissorCenter[2] = center[2];
        scissorCenter[3] = 1.0;
        Matrix4.multiplyVector(mvMatrix, scissorCenter, scissorCenter);

        if(scissorCenter[2] - r > maxZ){
            // The light is outside of our near plane.
            return null;
        }

        // Make sure the center is in front of the camera
        if(scissorCenter[2] > maxZ){
           scissorCenter[2] = maxZ;
        }

        // Calculate up and right for the front and back planes.
        scissorUpFront[0] = scissorCenter[0];
        scissorUpFront[1] = scissorCenter[1] + r;
        scissorUpFront[2] = Math.min(scissorCenter[2] + r, maxZ);
        scissorUpFront[3] = 1.0;

        scissorRightFront[0] = scissorCenter[0] + r;
        scissorRightFront[1] = scissorCenter[1];
        scissorRightFront[2] = Math.min(scissorCenter[2] + r, maxZ);
        scissorRightFront[3] = 1.0;

        scissorUpBack[0] = scissorCenter[0];
        scissorUpBack[1] = scissorCenter[1] + r;
        scissorUpBack[2] = Math.max(scissorCenter[2] - r, minZ);
        scissorUpBack[3] = 1.0;

        scissorRightBack[0] = scissorCenter[0] + r;
        scissorRightBack[1] = scissorCenter[1];
        scissorRightBack[2] = Math.max(scissorCenter[2] - r, minZ);
        scissorRightBack[3] = 1.0;

        // Project the points
        Matrix4.multiplyVector(pMatrix, scissorUpFront, scissorUpFront);
        Matrix4.multiplyVector(pMatrix, scissorRightFront, scissorRightFront);
        Matrix4.multiplyVector(pMatrix, scissorUpBack, scissorUpBack);
        Matrix4.multiplyVector(pMatrix, scissorRightBack, scissorRightBack);

        normalizeViewCoordinates(scissorUpFront);
        normalizeViewCoordinates(scissorRightFront);
        normalizeViewCoordinates(scissorUpBack);
        normalizeViewCoordinates(scissorRightBack);

        // Set the screen coordiates
        outBuffer[0] = Math.min(scissorUpFront[0] - (scissorRightFront[0] - scissorUpFront[0]), 
                        scissorUpBack[0] - (scissorRightBack[0] - scissorUpBack[0]));
        outBuffer[1] = Math.min(scissorRightFront[1] - (scissorUpFront[1] - scissorRightFront[1]), 
                        scissorRightBack[1] - (scissorUpBack[1] - scissorRightBack[1]));
        outBuffer[2] = Math.max(scissorRightFront[0], scissorRightBack[0]);
        outBuffer[3] = Math.max(scissorUpFront[1], scissorUpBack[2]);

        // Check to see if the light is even visible
        if (outBuffer[0] > 1 || outBuffer[1] > 1 || 
            outBuffer[2] < -1 || outBuffer[3] < -1) {
            return null
        }else{
            outBuffer[2] -= outBuffer[0];
            outBuffer[3] -= outBuffer[1];

            outBuffer[0] = clamp(outBuffer[0], -1, 1);
            outBuffer[1] = clamp(outBuffer[1], -1, 1);
            //outBuffer[2] = Math.min(outBuffer[2], 2.0) * 0.5;
            //outBuffer[3] = Math.min(outBuffer[3], 2.0) * 0.5;
        }

        // Set to 0, 1 space screen coordinates
        //outBuffer[0] = (outBuffer[0] + 1.0) * 0.5;
        //outBuffer[1] = (outBuffer[1] + 1.0) * 0.5;

        return outBuffer;
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

    Brush.prototype.intersects = function(bounds){
        var check = this.bounds;        

        return (Math.abs(bounds[0] - check[0]) * 2.0 < (bounds[3] - bounds[0] + check[3] - check[0])) &&
            (Math.abs(bounds[1] - check[1]) * 2.0 < (bounds[4] - bounds[1] + check[4] - check[1])) &&
            (Math.abs(bounds[2] - check[2]) * 2.0 < (bounds[5] - bounds[2] + check[5] - check[2]));
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
        this.material = Material.getMaterial(materialName);
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

function GameMap(mapName, pakFile){
    this.init(mapName, pakFile);
}
{

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

    GameMap.prototype.init = function(mapName, pakFile){
        this.isLoaded = false;
        this.name = mapName;
        this.pakFile = pakFile;
        this.areas = {};
        this.portals = [];
        this.camera = new Camera();
        this.bspTree = null;
        this.drawBuffer = {
            opaqueModels: [],
            transparentModels: [],
            fullBrightModels: [],
            lights: new Map(),
            areas: new Map()
        }

        this.camera.setPerspective(80.0, 16.0 / 9.0, 1.0, 2000.0);
    }

    /**
     * Loads the map into memory.
     * 
     * @returns {Promise} Stating if the map was resolved or rejected.
     */
    GameMap.prototype.load = function(){
        if(this.isLoaded){
            return;
        }

        var map = this;
        var pak = this.pakFile;

        return new Promise(function(resolve, reject){
            pak.file("maps/" + map.name + ".map").async("string").then(function(text){
                var entities = loadMap.call(map, new FileLexer(text));
                
                pak.file("maps/" + map.name + ".proc").async("string").then(function(text){
                    loadProcFile.call(map, new FileLexer(text));
                    map.isLoaded = true;

                    transformEntities.call(map, entities);

                    resolve(map);
                }, reject);
            }, reject);
        });
    }

    GameMap.prototype.getTexture = function(name){
        
    }

    /**
     * Unloads the map from memory.
     */
    GameMap.prototype.unload = function(){

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
        var left = frustrumLeft;
        var top = frustrumTop;
        var right = frustrumRight;
        var bottom = frustrumBottom

        // Data holders
        var point, absDiv, outArea;
        var points = portal.points;
        var x, y;

        for(var i = 0; i < points.length; ++i){
            point = points[i];
            Matrix4.multiplyVector(camera.transform.invMatrix, point, portalVectorBuffer);

            Vector3.max(portalVectorBuffer, portalMaxBuffer, portalMaxBuffer);
            Vector3.min(portalVectorBuffer, portalMinBuffer, portalMinBuffer);
        }

        // Check if the portal is behind the camera
        if(portalMinBuffer[2] > -camera.near){
            // This means that the entire portal bounding box is behind the camera.
            return;
        }

        if(portalMaxBuffer[2] > -camera.near){
            // Move the max buffer close to the camera if needed.
            portalMaxBuffer[2] = -camera.near;
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
        // NOTE: Due to error propigation I was getting too many false positives here. This caused blinking.
        //if(left > frustrumRight || top > frustrumBottom || right < frustrumLeft || bottom < frustrumTop){
        //    return;
        //}

        // Create the new frustrum
        //if(left < frustrumLeft){
        //    left = frustrumLeft;
        //}

        //if(top < frustrumTop){
        //    top = frustrumTop;
        //}

        //if(right > frustrumRight){
        //    right = frustrumRight;
        //}

        //if(bottom > frustrumBottom){
        //    bottom = frustrumBottom;
        //}

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

    function addAreaToDrawBuffer(area, drawBuffer, camera){
        if(!drawBuffer.areas.has(area.name)){
            drawBuffer.areas.set(area.name, area);
            var lights = area.lights;
            
            area.brushes.forEach(function(brush){
                var material = brush.material;

                if(material){
                    if(!material.solid){
                        drawBuffer.transparentModels.push(brush);
                    }else{
                        drawBuffer.opaqueModels.push(brush);
                    }

                    if(material.stages.length > 0){
                        drawBuffer.fullBrightModels.push(brush);
                    }

                    if(material.diffuseStage != null){
                        for(var lightName in lights){
                            var selectedLight = lights[lightName];

                            if(selectedLight.boundsIntersects(brush.bounds)){
                                var light;
                                
                                if(drawBuffer.lights.has(lightName)){
                                    light = drawBuffer.lights.get(lightName);
                                }else{
                                    // Add the light to the scene table.

                                    light = {
                                        light: selectedLight,
                                        scissor: selectedLight.getScissorWindow(camera, selectedLight.scissor),
                                        models: []
                                    };

                                    if(light.scissor != null){
                                        drawBuffer.lights.set(lightName, light);
                                    }
                                }

                                light.models.push(brush);
                            }
                        }
                    }
                }
            });

            return true;
        }

        return false; // we already have the area, so we did not add it to the buffer.
    }

    GameMap.prototype.calculateDrawBuffer = function(camera){
        var drawBuffer = this.drawBuffer;
        drawBuffer.opaqueModels.length = 0;
        drawBuffer.transparentModels.length = 0;
        drawBuffer.fullBrightModels.length = 0;
        drawBuffer.lights.clear();
        drawBuffer.areas.clear();

        var position = camera.transform.position;
        var area = null;
        
        if(this.bspTree){
            area = this.bspTree.findAreaByPoint(-position[0], -position[1], -position[2]);
        }else{
            for(var key in this.areas){
                area = this.areas[key];
                break;
            }
        }

        if(area != null){
            addAreaToDrawBuffer(area, drawBuffer, camera);

            readChildAreas.call(this, area, drawBuffer, camera, -1.1, -1.1, 1.1, 1.1);
        }

        // Sort the models for each light
        console.log(drawBuffer.areas.size);
        drawBuffer.lights.forEach(function(light){
            light.models.sort(function(a,b){ 
                if(a.material == b.material){
                    return 0;
                }

                return a.material.name < b.material.name ? -1 : 1;
            });
        });
    }

    GameMap.prototype.update = function(deltaTime){
        Material.updateMaterials(deltaTime);
    }
}