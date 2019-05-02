var Vector3 = function(x, y, z){
    return result = new Float32Array([x, y, z]);
}
Vector3.zero = Vector3(0, 0, 0);
Vector3.one = Vector3(1, 1, 1);
Vector3.forward = Vector3(0, 0, 1);
Vector3.backward = Vector3(0, 0, -1);
Vector3.left = Vector3(-1, 0, 0);
Vector3.right = Vector3(1, 0, 0);
Vector3.up = Vector3(0, 1, 0);
Vector3.down = Vector3(0, -1, 0);
Vector3.distanceSquared = function(vector1, vector2){
    var x = vector1[0] - vector2[0];
    var y = vector1[1] - vector2[1];
    var z = vector1[2] - vector2[2];

    return (x * x) + (y * y) + (z * z);
}
Vector3.distance = function(vector1, vector2){
    return Math.sqrt(Vector3.distanceSquared(vector1, vector2));
}
Vector3.lengthSquared = function(vector){
    return (vector[0] * vector[0]) + (vector[1] * vector[1]) + (vector[2] * vector[2]);
}
Vector3.length = function(vector){
    return Math.sqrt(Vector3.lengthSquared(vector));
}
Vector3.dot = function(vector1, vector2){
    return vector1[0] * vector2[0] + vector1[1] * vector2[1] + vector1[2] * vector[2];
}
Vector3.scale = function(inputVector, scale, outputVector){
    outputVector[0] = inputVector[0] * scale;
    outputVector[1] = inputVector[1] * scale;
    outputVector[2] = inputVector[2] * scale;

    return outputVector;
}
Vector3.normalized = function(inputVector, outputVector){
    var length = Vector3.length(inputVector);

    if(length == 0){
        outputVector[0] = 0.0;
        outputVector[1] = 0.0;
        outputVector[2] = 0.0;
    }else{
        Vector3.scale(inputVector, 1.0 / length, outputVector);
    }

    return outputVector;
}

var Quaternion = function(x, y, z){
    return result = new Float32Array([x, y, z]);
}
Quaternion.zero = Quaternion(0, 0, 0);
Quaternion.one = Quaternion(1, 1, 1);

var Matrix4 = function( a = 1, b = 0, c = 0, d = 0, 
                        e = 0, f = 1, g = 0, h = 0, 
                        i = 0, j = 0, k = 1, l = 0,
                        m = 0, n = 0, o = 0, p = 1){
    return new Float32Array([a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p]);
}