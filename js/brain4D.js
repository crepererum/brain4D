/* jshint browser:true, camelcase:true, curly:true, eqeqeq:true, forin:true, latedef:true, newcap:true, noarg:true, noempty:true, nonew:true, quotmark:double, strict:true, trailing:true, undef:true, unused:true */
/* global CSV, mat4, Modernizr, vec4 */
var mode = 2;
var wAxis = 2;
var mouseActive = false;
var pinchActive = false;

var rotMatrix, screenVec, transVec, pointSize;

var lastX, lastY;
var touchPDeltaX, touchPDeltaY;

var canvas;
var borderSize = 0.5;

var gl, shaderProgram, vbuffer;

var config;

function sgn(x) {
    "use strict";

    if (x > 0) {
        return 1;
    } else if (x < 0) {
        return -1;
    } else {
        return 0;
    }
}

function removeElement(element) {
    "use strict";

    if (element) {
        element.parentNode.removeChild(element);
    }
}

function getShader(gl, id) {
    "use strict";
    var k, shader, shaderScript, str;

    shaderScript = document.getElementById(id);
    str = "";
    k = shaderScript.firstChild;

    while (k) {
        if (k.nodeType === 3) {
            str += k.textContent;
        }
        k = k.nextSibling;
    }

    if (shaderScript.type === "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type === "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader));
    }

    return shader;
}

function genProjectionMatrix(width, height) {
    "use strict";
    var factor1, factor2, result;

    result = mat4.create();
    factor1 = width / Math.min(width, height);
    factor2 = height / Math.min(width, height);
    mat4.ortho(
            result,
            -(1.0 + borderSize) * factor1, (1.0 + borderSize) * factor1,
            -(1.0 + borderSize) * factor2, (1.0 + borderSize) * factor2,
            -100, 100);

    return result;
}

function genRotationMatrix(x, y, z, w) {
    "use strict";
    var result, tmp;

    result = mat4.create();
    mat4.rotateX(result, result, x);
    mat4.rotateY(result, result, y);
    mat4.rotateZ(result, result, z);
    tmp = mat4.create();
    if (wAxis === 0) {
        tmp.set([
                Math.cos(w), 0.0, 0.0, -Math.sin(w),
                0.0, 1.0, 0.0, 0.0,
                0.0, 0.0, 1.0, 0.0,
                Math.sin(w), 0.0, 0.0, Math.cos(w)
                ]);
    } else if (wAxis === 1) {
        tmp.set([
                1.0, 0.0, 0.0, 0.0,
                0.0, Math.cos(w), 0.0, -Math.sin(w),
                0.0, 0.0, 1.0, 0.0,
                0.0, Math.sin(w), 0.0, Math.cos(w)
                ]);
    } else {
        tmp.set([
                1.0, 0.0, 0.0, 0.0,
                0.0, 1.0, 0.0, 0.0,
                0.0, 0.0, Math.cos(w), -Math.sin(w),
                0.0, 0.0, Math.sin(w), Math.cos(w)
                ]);
    }
    mat4.multiply(result, result, tmp);

    return result;
}

function reset() {
    "use strict";

    rotMatrix = mat4.create();
    transVec = vec4.create();
}

function updateViewportSize() {
    "use strict";
    var devicePixelRatio = window.devicePixelRatio || 1,
        width = canvas.clientWidth,
        height = canvas.clientHeight;

    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;
    gl.devicePixelRatio = devicePixelRatio;

    screenVec = vec2.create();
    screenVec[0] = canvas.width;
    screenVec[1] = canvas.height;

    pointSize = 20.0 * devicePixelRatio;
}

function draw() {
    "use strict";

    if ((canvas.clientWidth !== gl.viewportWidth) || (canvas.clientHeight !== gl.viewportHeight)) {
        updateViewportSize();
    }

    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, vbuffer);
    gl.vertexAttribPointer(shaderProgram.vPosAttr, vbuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.uniformMatrix4fv(shaderProgram.rotMatrixUnif, false, rotMatrix);
    gl.uniform4fv(shaderProgram.transVecUnif, transVec);
    gl.uniformMatrix4fv(shaderProgram.projMatrixUnif, false, genProjectionMatrix(gl.viewportWidth, gl.viewportHeight));
    gl.uniform2fv(shaderProgram.screenSizeUnif, screenVec);
    gl.uniform1f(shaderProgram.pointSizeUnif, pointSize);
    gl.drawArrays(gl.POINTS, 0, vbuffer.numItems);

    window.requestAnimationFrame(draw);
}

function readFile(path, callback) {
    "use strict";

    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            var resp = xhr.responseText;
            callback(resp);
        }
    };
    xhr.open("GET", path, true);
    xhr.send();
}

function setActive(x, namespace) {
    "use strict";
    var i, j, old, next;

    old = document.getElementsByClassName("active");
    for (i = 0; i < old.length; ++i) {
        for (j = 0; j < old[i].classList.length; ++j) {
            if (old[i].classList[j].indexOf(namespace) === 0) {
                old[i].classList.remove("active");
                break;
            }
        }
    }

    next = document.getElementsByClassName(namespace + x);
    for (i = 0; i < next.length; ++i) {
        next[i].classList.add("active");
    }
}

function setMode(x) {
    "use strict";
    var cursor = "";

    switch (x) {
        case 1:
            cursor = "move";
            break;
        case 2:
            cursor = "col-resize";
            break;
        case 3:
            cursor = "crosshair";
            break;
    }
    canvas.style.cursor = cursor;

    setActive(x, "mode");
    mode = x;
}

function addButtonListener(element, listener) {
    "use strict";

    element.addEventListener("mousedown", function(evt){
        evt.preventDefault();
        listener(evt.target);
        return false;
    }, false);
}

function setBufferData(vertices) {
    "use strict";

    if (vbuffer) {
        gl.deleteBuffer(vbuffer);
    }

    vbuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    vbuffer.itemSize = 4;
    vbuffer.numItems = vertices.length / 4;
}

function initGl(vertices) {
    "use strict";
    var fragmentShader, vertexShader;

    gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    updateViewportSize();
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    fragmentShader = getShader(gl, "shader-fs");
    vertexShader = getShader(gl, "shader-vs");
    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        throw new Error("Could not initialise shaders");
    }
    gl.useProgram(shaderProgram);
    shaderProgram.vPosAttr = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vPosAttr);
    shaderProgram.rotMatrixUnif = gl.getUniformLocation(shaderProgram, "rotMatrix");
    shaderProgram.transVecUnif = gl.getUniformLocation(shaderProgram, "transVec");
    shaderProgram.projMatrixUnif = gl.getUniformLocation(shaderProgram, "projMatrix");
    shaderProgram.screenSizeUnif = gl.getUniformLocation(shaderProgram, "screenSize");
    shaderProgram.pointSizeUnif = gl.getUniformLocation(shaderProgram, "pointSize");

    setBufferData(vertices);
}

function parseCsv(raw) {
    "use strict";
    var i, j, min, max, parsedData, x, obj, ok, vertices;

    parsedData = CSV.csvToArray(raw);
    vertices = [];
    min = [Infinity, Infinity, Infinity, Infinity];
    max = [-Infinity, -Infinity, -Infinity, -Infinity];
    for (i = 0; i < parsedData.length; ++i) {
        obj = [];
        ok = true;
        for (j = 0; j < 4; ++j) {
            x = parseFloat(parsedData[i][j]);
            if (isNaN(x)) {
                ok = false;
                break;
            }

            obj[j] = x;
        }

        if (ok) {
            for (j = 0; j < 4; ++j) {
                min[j] = Math.min(min[j], obj[j]);
                max[j] = Math.max(max[j], obj[j]);
                vertices.push(obj[j]);
            }
        }
    }

    for (i = 0; i < vertices.length / 4; ++i) {
        for (j = 0; j < 4; ++j) {
            x = vertices[i * 4 + j];
            vertices[i * 4 + j] = 2.0 * (x - min[j]) / (max[j] - min[j]) - 1.0;
        }
    }

    return vertices;
}

function buttonListenerAxis(target) {
    "use strict";

    setActive(target.axisId, "axis");
    wAxis = target.axisId;
}

function buttonListenerMode(target) {
    "use strict";

    setMode(target.modeId);
}

function eventListenerDown(eventMode, clientX, clientY) {
    "use strict";

    switch (eventMode) {
        case 1:
            lastX = clientX;
            lastY = clientY;
            mouseActive = true;
            pinchActive = false;
            break;
        case 2:
            wAxis = (wAxis + 1) % 3;
            setActive(wAxis, "axis");
            break;
        case 3:
            pinchActive = true;
            break;
    }
}

function eventListenerUp() {
    "use strict";

    mouseActive = false;
    pinchActive = false;
}

function eventListenerMove(clientX, clientY) {
    "use strict";

    if (mouseActive) {
        var dX, dY, dVec, dMatrix, normPosX, normPosY;

        dX = clientX - lastX;
        dY = clientY - lastY;
        lastX = clientX;
        lastY = clientY;
        normPosX = 2.0 * (clientX - canvas.clientWidth / 2.0 - canvas.clientLeft) / canvas.clientWidth;
        normPosY = 2.0 * (clientY - canvas.clientHeight / 2.0 - canvas.clientTop) / canvas.clientHeight;

        switch (mode) {
            case 1:
                dVec = vec4.create();
                dVec.set([
                    2.0 * (1.0 + borderSize) * dX / Math.min(canvas.clientWidth, canvas.clientHeight),
                    -2.0 * (1.0 + borderSize) * dY / Math.min(canvas.clientWidth, canvas.clientHeight),
                    0.0,
                    0.0]);
                vec4.add(transVec, transVec, dVec);
                break;

            case 2:
                dMatrix = genRotationMatrix(
                        dY / Math.min(canvas.clientWidth, canvas.clientHeight) * 4.0 * Math.PI,
                        dX / Math.min(canvas.clientWidth, canvas.clientHeight) * 4.0 * Math.PI,
                        0.0,
                        0.0);
                mat4.multiply(rotMatrix, dMatrix, rotMatrix);
                vec4.transformMat4(transVec, transVec, dMatrix);
                break;

            case 3:
                dMatrix = mat4.create();
                dMatrix[0] = (normPosX + 2.0 * dX / gl.viewportWidth * gl.devicePixelRatio) / normPosX;
                dMatrix[5] = (normPosY + 2.0 * dY / gl.viewportHeight * gl.devicePixelRatio) / normPosY;
                mat4.multiply(rotMatrix, dMatrix, rotMatrix);
                vec4.transformMat4(transVec, transVec, dMatrix);
                break;
        }
    }
}

function eventListenerScroll(deltaX, deltaY) {
    "use strict";
    var dVec, dMatrix;

    switch (mode) {
        case 1:
            dVec = vec4.create();
            dVec.set([
                    0.0,
                    0.0,
                    deltaY / 10.0,
                    deltaX / 10.0]);
            vec4.add(transVec, transVec, dVec);
            break;

        case 2:
            dMatrix =  genRotationMatrix(
                    0.0,
                    0.0,
                    deltaY * 2.0 * Math.PI / 40.0,
                    deltaX * 2.0 * Math.PI / 40.0);
            mat4.multiply(rotMatrix, dMatrix, rotMatrix);
            vec4.transformMat4(transVec, transVec, dMatrix);
            break;

        case 3:
            dMatrix = mat4.create();
            dMatrix[10] += deltaY / 8.0;
            dMatrix[15] += deltaX / 8.0;
            mat4.multiply(rotMatrix, dMatrix, rotMatrix);
            vec4.transformMat4(transVec, transVec, dMatrix);
            break;
    }

    return false;
}

function reloadData() {
    "use strict";
    var set = window.location.hash.substr(1) || Object.keys(config.datasets)[0];

    readFile("data/" + set + ".csv", function(raw){
        var vertices = parseCsv(raw);
        reset();
        setBufferData(vertices);

        document.getElementById("datasets").value = set;
        document.getElementById("prepared_description").innerHTML = config.datasets[set].description;
    });
}

function setup() {
    "use strict";
    var reMode, reAxis, elementList, match, i, j;

    canvas = document.getElementById("glcanvas");

    reset();
    setActive(wAxis, "axis");
    setMode(mode);

    addButtonListener(document.getElementById("resetButton"), reset);

    elementList = document.getElementsByClassName("button");
    reAxis = new RegExp("^axis(\\d+)$");
    reMode = new RegExp("^mode(\\d+)$");
    for (i = 0; i < elementList.length; ++i) {
        for (j = 0; j < elementList[i].classList.length; ++j) {
            match = reAxis.exec(elementList[i].classList[j]);
            if (match) {
                elementList[i].axisId = parseInt(match[1], 10);
                addButtonListener(elementList[i], buttonListenerAxis);
            }

            match = reMode.exec(elementList[i].classList[j]);
            if (match) {
                elementList[i].modeId = parseInt(match[1], 10);
                addButtonListener(elementList[i], buttonListenerMode);
            }
        }
    }

    document.getElementById("dropzone").addEventListener("dragover", function(evt){
        evt.stopPropagation();
        evt.preventDefault();
        evt.dataTransfer.dropEffect = "copy";
    }, false);

    document.getElementById("dropzone").addEventListener("drop", function(evt){
        var file, re, reader;

        evt.stopPropagation();
        evt.preventDefault();

        file = evt.dataTransfer.files[0];
        re = new RegExp("\\.csv$");
        if (re.exec(file.name)) {
            reader = new FileReader();
            reader.onload = function(evt) {
                var vertices = parseCsv(evt.target.result);
                reset();
                setBufferData(vertices);

                document.getElementById("prepared_description").innerHTML = "";
            };
            reader.readAsText(file);
        }
    }, false);

    document.addEventListener("keyup", function(evt){
        evt.preventDefault();
        switch (evt.keyCode) {
            // 1
            case 49:
                setMode(1);
                break;

            // 2
            case 50:
                setMode(2);
                break;

            // 3
            case 51:
                setMode(3);
                break;

            // R
            case 82:
            case 114:
                reset();
                break;
        }
    }, false);

    initGl([]);
    window.requestAnimationFrame(draw);

    canvas.addEventListener("mousedown", function(evt){
        evt.preventDefault();
        eventListenerDown(evt.which, evt.clientX, evt.clientY);
        return false;
    }, false);
    canvas.addEventListener("touchstart", function(evt){
        var mode = 1;

        if (evt.touches.length === 2) {
            touchPDeltaX = evt.touches[0].clientX - evt.touches[1].clientX;
            touchPDeltaY = evt.touches[0].clientY - evt.touches[1].clientY;
            mode = 3;
        } else if (evt.touches.length === 3) {
            mode = 2;
        }

        evt.preventDefault();
        eventListenerDown(mode, evt.changedTouches[0].clientX, evt.changedTouches[0].clientY);

    });

    canvas.addEventListener("mouseup", function(evt){
        evt.preventDefault();
        eventListenerUp();
        return false;
    }, false);
    canvas.addEventListener("touchend", function(){
        eventListenerDown();
    });

    canvas.addEventListener("mousemove", function(evt){
        eventListenerMove(evt.clientX, evt.clientY);
    }, false);
    canvas.addEventListener("touchmove", function(evt){
        var tmpX, tmpY;

        if (evt.touches.length === 2) {
            tmpX = evt.touches[0].clientX - evt.touches[1].clientX;
            tmpY = evt.touches[0].clientY - evt.touches[1].clientY;

            eventListenerScroll((tmpX - touchPDeltaX) / 40.0, (tmpY - touchPDeltaY) / 40.0);

            touchPDeltaX = tmpX;
            touchPDeltaY = tmpY;
        }

        if (!pinchActive) {
            eventListenerMove(evt.changedTouches[0].clientX, evt.changedTouches[0].clientY);
        }
    });

    canvas.addEventListener("mousewheel", function(evt){
        evt.preventDefault();
        eventListenerScroll(sgn(evt.wheelDeltaY), sgn(evt.wheelDeltaX));
    }, false);
    canvas.addEventListener("wheel", function(evt){
        evt.preventDefault();
        eventListenerScroll(sgn(evt.deltaY), sgn(evt.deltaX));
    }, false);

    document.getElementById("datasets").onchange = function() {
        var list, next;

        list = document.getElementById("datasets");
        next = list.options[list.selectedIndex].value;

        if (next !== window.location.hash) {
            window.location.hash = next;
        }
    };

    window.onhashchange = reloadData;
    reloadData();
}

window.onerror = function(msg, url, line) {
    "use strict";
    var aRepo, divError, divWrapper, h2Error, pBug, pMsg, pInfo;

    if (document.getElementsByClassName("error").length === 0) {
        divError = document.createElement("div");
        divWrapper = document.createElement("div");
        h2Error = document.createElement("h2");
        pMsg = document.createElement("p");
        pInfo = document.createElement("p");
        pBug = document.createElement("p");
        aRepo = document.createElement("a");

        h2Error.appendChild(document.createTextNode("Error"));
        pMsg.appendChild(document.createTextNode(msg));
        pInfo.appendChild(document.createTextNode("(" + url + ":" + line + ")"));
        pBug.appendChild(document.createTextNode("If you think this is a bug, please report it here: "));
        aRepo.appendChild(document.createTextNode("https://github.com/crepererum/brain4D"));

        aRepo.href = "https://github.com/crepererum/brain4D";
        aRepo.target = "_blank";

        divError.classList.add("errorMessage");
        divError.classList.add("message");

        pBug.appendChild(aRepo);

        divWrapper.appendChild(h2Error);
        divWrapper.appendChild(pMsg);
        divWrapper.appendChild(pInfo);
        divWrapper.appendChild(pBug);

        divError.appendChild(divWrapper);

        document.body.appendChild(divError);
    }
};

window.onload = function() {
    "use strict";

    if (Modernizr.csscalc && Modernizr.opacity && Modernizr.webgl && Modernizr.raf) {
        removeElement(document.getElementById("browserMessage"));

        if (Modernizr.draganddrop) {
            document.getElementById("dropzone").style.display = "block";
        }

        readFile("config.json", function(data) {
            var i, list, option, set, setIds;
            config = JSON.parse(data);

            list = document.getElementById("datasets");
            setIds = Object.keys(config.datasets);
            for (i = 0; i < setIds.length; ++i) {
                set = setIds[i];

                option = document.createElement("option");
                option.appendChild(document.createTextNode(config.datasets[set].title));
                option.value = set;

                list.appendChild(option);
            }

            setup();
            removeElement(document.getElementById("loadMessage"));
        });
    }
};

