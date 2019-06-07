var KeyControl = function(controlName, multiplier){
    this.multiplier = multiplier;
    this.controlName = controlName;
    this.isDown = false;
    this.value = 0.0; 
    this.rawValue = 0.0;
}
KeyControl.prototype.update = function (time){
    var newValue = this.isDown ? this.multiplier : 0.0;

    if(this.value != newValue){
        this.rawValue = newValue;
        this.value = lerp(this.value, newValue, 0.8);
    }
}

var MouseControl = function(controllerName, multiplier, canvas){
    this.multiplier = multiplier;
    this.controlName = controlName;
    this.lastDeltaRaw = new Float32Array([0.0, 0.0]);
    this.lastDeltaNormal = new Float32Array([0.0, 0.0]);
    this.location = [0, 0];

    function getMousePosition(mouseEvent){
        // TODO: Set the location value

        this.lastDeltaRaw.fill(0);
        this.lastDeltaNormal.fill(0);
    }

    canvas.onmouseenter = function(mouseEvent){
        getMousePosition(mouseEvent);
    }

    canvas.onmousemove = function(mouseEvent){
        var location = this.location;
        var x = location[0];
        var y = location[1];

        getMousePosition(mouseEvent);

        var raw = this.lastDeltaRaw;
        raw[0] = location[0] - x;
        raw[1] = location[1] - y;

        var magnitude = raw[0] * raw[0] + raw[1] * raw[1];

        if(magnitude > 0.0){
            var normal = this.lastDeltaNormal;
            magnitude = Math.sqrt(magnitude);

            normal[0] = raw[0] / magnitude;
            normal[1] = raw[1] / magnitude;
        }
    }
}

var ControlValue = function(){
    this.value = 0.0;
    this.rawValue = 0.0;
    this.max = 1.0;
    this.min = -1.0;
}
ControlValue.prototype.reset = function(time){
    this.value = 0.0;
    this.rawValue = 0.0;
}
ControlValue.prototype.addValue = function(value){
    this.rawValue += value.rawValue;
    this.value += value.value;
}
ControlValue.prototype.getValue = function(){
    return Math.min(Math.max(this.value, this.min), this.max);
}
ControlValue.prototype.getRawValue = function(){
    return Math.min(Math.max(this.value, this.min), this.max);
}

var Controls = function(canvas){
    this.init(canvas);
}
{
    Controls.prototype.init = function(canvas){
        // Mouse controls
        // Follow roation from https://stackoverflow.com/questions/7842408/rotating-quaternions-based-on-mouse-movement-opengl-and-java

        // Keyboard Controls
        this.controls = {
            "Horizontal" : new ControlValue(),
            "Vertical": new ControlValue(),
            "LookVertical": new ControlValue(),
            "LookHorizontal": new ControlValue()
        };

        var keys = new Array(255);
        keys[87] = new KeyControl("Vertical", 1.0),
        keys[38] = new KeyControl("Vertical", 1.0);

        keys[83] = new KeyControl("Vertical", -1.0);
        keys[40] = new KeyControl("Vertical", -1.0);

        keys[68] = new KeyControl("Horizontal", -1.0);
        keys[39] = new KeyControl("Horizontal", -1.0);

        keys[65] = new KeyControl("Horizontal", 1.0);
        keys[37] = new KeyControl("Horizontal", 1.0);
        this.keys = keys;

        window.addEventListener("keydown", event => {
            var keyControl = keys[event.keyCode];

            if(keyControl){
                keyControl.isDown = true;
            }
        });

        window.addEventListener("keyup", event => {
            var keyControl = keys[event.keyCode];

            if(keyControl){
                keyControl.isDown = false;
            }
        });
    }

    Controls.prototype.update = function(time){
        this.reset(time);

        var control;

        var controls = this.controls;

        this.keys.forEach(function(key, index){
            if(key != null){
                key.update(time);
                control = controls[key.controlName];

                if(control){
                    control.addValue(key);
                }
            }
        });
    }

    Controls.prototype.reset = function(time){
        this.controls.Horizontal.reset(time);
        this.controls.Vertical.reset(time);
    }
}