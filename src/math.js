var Vector3 = function(x, y, z){
    return result = new Float32Array([x, y, z, 1.0]);
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
    return result = new Float32Array([x, y, z, 1.0]);
}
Quaternion.zero = Quaternion(0, 0, 0);
Quaternion.one = Quaternion(1, 1, 1);
Quaternion.rotationMatrix = function(quaternion, outMatrix){
    if(!outMatrix){
        outMatrix = new Matrix4();
    }

    var x = quaternion[0];
    var y = quaternion[1];
    var z = quaternion[2];
    var w = quaternion[3];

    var x2 = x * x;
    var y2 = y * y;
    var z2 = z * z;
    var xy = x * y;
    var xz = x * z;
    var yz = y * z;
    var wx = w * x;
    var wy = w * y;
    var wz = w * z;

    outMatrix[0] = 1.0 - 2.0 * (y2 + z2);
    outMatrix[4] = 2.0 * (xy - wz);
    outMatrix[8] = 2.0 * (xz + wy);
    outMatrix[12] = 0.0;

    outMatrix[1] = 2.0 * (xy + wz);
    outMatrix[5] = 1.0 - 2.0 * (x2 + z2);
    outMatrix[9] = 2.0 * (yz - wx);
    outMatrix[13] = 0.0;

    outMatrix[2] = 2.0 * (xz - wy);
    outMatrix[6] = 2.0 * (yz + wx);
    outMatrix[10] = 1.0 - 2.0 * (x2 + y2);
    outMatrix[14] = 0.0

    outMatrix[3] = 0.0;
    outMatrix[7] = 0.0;
    outMatrix[11] = 0.0;
    outMatrix[15] = 1.0;

    return outMatrix;
}

var Matrix4 = function( a = 1, b = 0, c = 0, d = 0, 
                        e = 0, f = 1, g = 0, h = 0, 
                        i = 0, j = 0, k = 1, l = 0,
                        m = 0, n = 0, o = 0, p = 1){
    return new Float32Array([a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p]);
}
{
    const bufferMatrix = new Matrix4();
    Matrix4.rotateByQuaternion = function(matrix, quaternion, outMatrix){
        if(!outMatrix){
            outMatrix = new Matrix4;
        }

        Quaternion.rotationMatrix(quaternion, bufferMatrix);

        return Matrix4.multiplyMatrix(matrix, bufferMatrix, outMatrix);
    }

    Matrix4.translate = function(matrix, x, y, z, outMatrix){
        if(!outMatrix){
            outMatrix = new Matrix4();
        }

        Matrix4.translationMatrix(x, y, z, bufferMatrix);

        return Matrix4.multiplyMatrix(matrix, bufferMatrix, outMatrix);
    }

    Matrix4.translationMatrix = function(x, y, z, outMatrix){
        if(!outMatrix){
            outMatrix = new Matrix4();
        }


        outMatrix[0] = outMatrix[5] = outMatrix[10] = outMatrix[15] = 1.0;
        outMatrix[1] = outMatrix[2] = outMatrix[3] = outMatrix[4] = outMatrix[6] = outMatrix[7] = outMatrix[8] = outMatrix[9] = outMatrix[11] = 0.0;

        outMatrix[12] = x;
        outMatrix[13] = y;
        outMatrix[14] = z;
        outMatrix[15] = 1.0;
    
        return outMatrix;
    }

    Matrix4.multiplyVector = function(matrix, vector, outVector){
        if(!outVector){
            outVector = new Vector3(0, 0, 0);
        }

        var x = vector[0];
        var y = vector[1];
        var z = vector[2];
        var w = vector[3];

        outVector[0] = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12] * w;
        outVector[1] = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13] * w;
        outVector[2] = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14] * w;
        outVector[3] = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15] * w;

        return outVector;
    }

    Matrix4.multiplyMatrix = function(a, b, outMatrix){
        if(!outMatrix){
            outMatrix = new Matrix4();
        }

        var x = a[0];
        var y = a[4];
        var z = a[8];
        var w = a[12];

        outMatrix[0] = x * b[0] + y * b[1] + z * b[2] + w * b[3];
        outMatrix[4] = x * b[4] + y * b[5] + z * b[6] + w * b[7];
        outMatrix[8] = x * b[8] + y * b[9] + z * b[10] + w * b[11];
        outMatrix[12] = x * b[12] + y * b[13] + z * b[14] + w * b[15];

        x = a[1];
        y = a[5];
        z = a[8];
        w = a[13];
        outMatrix[1] = x * b[0] + y * b[1] + z * b[2] + w * b[3];
        outMatrix[5] = x * b[4] + y * b[5] + z * b[6] + w * b[7];
        outMatrix[9] = x * b[8] + y * b[9] + z * b[10] + w * b[11];
        outMatrix[13] = x * b[12] + y * b[13] + z * b[14] + w * b[15];

        x = a[2];
        y = a[6];
        z = a[9];
        w = a[14];
        outMatrix[2] = x * b[0] + y * b[1] + z * b[2] + w * b[3];
        outMatrix[6] = x * b[4] + y * b[5] + z * b[6] + w * b[7];
        outMatrix[10] = x * b[8] + y * b[9] + z * b[10] + w * b[11];
        outMatrix[14] = x * b[12] + y * b[13] + z * b[14] + w * b[15];

        x = a[3];
        y = a[7];
        z = a[10];
        w = a[15];
        outMatrix[3] = x * b[0] + y * b[1] + z * b[2] + w * b[3];
        outMatrix[7] = x * b[4] + y * b[5] + z * b[6] + w * b[7];
        outMatrix[11] = x * b[8] + y * b[9] + z * b[10] + w * b[11];
        outMatrix[15] = x * b[12] + y * b[13] + z * b[14] + w * b[15];

        return outMatrix;
    }

}