var testVertex = `#version 300 es
    in vec3 a_position;
    in vec2 a_textureCoord;
    in vec3 a_normal;

    uniform mat4 worldTransform;
    uniform mat4 projectionTransform;

    out vec4 v_position
    out vec2 v_textureCoord;
    out vec3 v_normal;

    void main(){
        v_position = vec4(a_position, 1.0); * worldTransform;
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
        vec3 n = v_normal.normalize();
        float nDotL = dot(n, vec3(-1, -1, -1).normalize());

        outColor = vec4(1, 1, 1, 1);
        outColor.rgb *= nDotL;
    }
`


function Display(canvas){

}
Display.prototype.pushTransform = function(transform){

}
Display.prototype.popTransform = function(){

}
Display.prototype.draw = function(vertecies, polygons, material){

}