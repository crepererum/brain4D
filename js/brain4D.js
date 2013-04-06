/*jslint browser: true, devel: true, bitwise: true, plusplus: true, white: true */
var mode = 1;
var wAxis = 1;
var mouseActive = false;

var rotMatrix, transVec;

var lastX, lastY;

var gl;
var shaderProgram;
var vbuffer;

function getShader(gl, id) {
	'use strict';
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
		console.error(gl.getShaderInfoLog(shader));
		return null;
	}

	return shader;
}

function genProjectionMatrix(width, height) {
	'use strict';
	var factor1, factor2, result;

	result = mat4.create();
	factor1 = width / Math.min(width, height);
	factor2 = height / Math.min(width, height);
	mat4.ortho(result, -1.5 * factor1, 1.5 * factor1, -1.5 * factor2, 1.5 * factor2, -100, 100);

	return result;
}

function genRotationMatrix(x, y, z, w) {
	'use strict';
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
	'use strict';

	rotMatrix = mat4.create();
	transVec = vec4.create();
}

function draw() {
	'use strict';

	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	gl.bindBuffer(gl.ARRAY_BUFFER, vbuffer);
	gl.vertexAttribPointer(shaderProgram.vPosAttr, vbuffer.itemSize, gl.FLOAT, false, 0, 0);
	gl.uniformMatrix4fv(shaderProgram.rotMatrixUnif, false, rotMatrix);
	gl.uniform4fv(shaderProgram.transVecUnif, transVec);
	gl.uniformMatrix4fv(shaderProgram.projMatrixUnif, false, genProjectionMatrix(gl.viewportWidth, gl.viewportHeight));
	gl.drawArrays(gl.POINTS, 0, vbuffer.numItems);

	window.requestAnimationFrame(draw);
}

function readFile(path, callback) {
	'use strict';

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
	'use strict';
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
	'use strict';
	var cursor = "";

	switch (x) {
		case 1:
			cursor = "move";
			break;
		case 2:
			cursor = "col-resize"
			break;
		case 3:
			cursor = "crosshair";
			break;
	}
	document.getElementById("glcanvas").style.cursor = cursor;

	setActive(x, "mode");
	mode = x;
}

function addButtonListener(element, listener) {
	'use strict';

	element.addEventListener("mousedown", function(evt){
		evt.preventDefault();
		listener(evt.target);
		return false;
	}, false);
}

function setBufferData(vertices) {
	if (vbuffer) {
		gl.deleteBuffer(vbuffer);
	}

	vbuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vbuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	vbuffer.itemSize = 4;
	vbuffer.numItems = vertices.length / 4;
}

function init(vertices) {
	'use strict';
	var canvas, fragmentShader, vertexShader;

	canvas = document.getElementById("glcanvas");
	canvas.width = canvas.clientWidth;
	canvas.height = canvas.clientHeight;
	gl = canvas.getContext("experimental-webgl");
	gl.viewportWidth = canvas.width;
	gl.viewportHeight = canvas.height;
	gl.enable(gl.VERTEX_PROGRAM_POINT_SIZE);

	fragmentShader = getShader(gl, "shader-fs");
	vertexShader = getShader(gl, "shader-vs");
	shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);
	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		console.error("Could not initialise shaders");
	}
	gl.useProgram(shaderProgram);
	shaderProgram.vPosAttr = gl.getAttribLocation(shaderProgram, "aVertexPosition");
	gl.enableVertexAttribArray(shaderProgram.vPosAttr);
	shaderProgram.rotMatrixUnif = gl.getUniformLocation(shaderProgram, "rotMatrix");
	shaderProgram.transVecUnif = gl.getUniformLocation(shaderProgram, "transVec");
	shaderProgram.projMatrixUnif = gl.getUniformLocation(shaderProgram, "projMatrix");

	setBufferData(vertices);

	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.BLEND);
	gl.enable(gl.POINTS_SMOOTH);

	document.addEventListener("keypress", function(evt){
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
			case 114:
				reset();
				break;
		}
	}, false);

	canvas.addEventListener("mousedown", function(evt){
			evt.preventDefault();
			if (evt.which === 1) {
				lastX = evt.clientX;
				lastY = evt.clientY;
				mouseActive = true;
			} else if (evt.which === 2) {
				wAxis = (wAxis + 1) % 3;
				setActive(wAxis, "axis");
			}
			return false;
			}, false);

	canvas.addEventListener("mouseup", function(evt){
			evt.preventDefault();
			if (evt.which === 1) {
				mouseActive = false;
			}
			return false;
			}, false);

	canvas.addEventListener("mousemove", function(evt){
			if (mouseActive) {
				var dX, dY, dVec, dMatrix;

				dX = evt.clientX - lastX;
				dY = evt.clientY - lastY;
				lastX = evt.clientX;
				lastY = evt.clientY;

				switch (mode) {
					case 1:
						dVec = vec4.create();
						dVec.set([2.0 * dX / gl.viewportWidth, -2.0 * dY / gl.viewportHeight, 0.0, 0.0]);
						vec4.add(transVec, transVec, dVec);
						break;

					case 2:
						dMatrix = genRotationMatrix(dY / 50.0, dX / 50.0, 0.0, 0.0);
						mat4.multiply(rotMatrix, dMatrix, rotMatrix);
						vec4.transformMat4(transVec, transVec, dMatrix);
						break;

					case 3:
						dMatrix = mat4.create();
						dMatrix[0] += dX / gl.viewportWidth;
						dMatrix[5] -= dY / gl.viewportHeight;
						mat4.multiply(rotMatrix, dMatrix, rotMatrix);
						vec4.transformMat4(transVec, transVec, dMatrix);
						break;
				}
			}
			}, false);

	canvas.addEventListener("mousewheel", function(evt){
			var dVec, dMatrix;

			evt.preventDefault();

			switch (mode) {
				case 1:
					dVec = vec4.create();
					dVec.set([0.0, 0.0, evt.wheelDeltaX / 1000.0, evt.wheelDeltaY / 1000.0]);
					vec4.add(transVec, transVec, dVec);
					break;

				case 2:
					dMatrix =  genRotationMatrix(0.0, 0.0, evt.wheelDeltaX / 1000.0, evt.wheelDeltaY / 1000.0);
					mat4.multiply(rotMatrix, dMatrix, rotMatrix);
					vec4.transformMat4(transVec, transVec, dMatrix);
					break;

				case 3:
					dMatrix = mat4.create();
					dMatrix[10] += evt.wheelDeltaX / 1000.0;
					dMatrix[15] += evt.wheelDeltaY / 1000.0;
					mat4.multiply(rotMatrix, dMatrix, rotMatrix);
					vec4.transformMat4(transVec, transVec, dMatrix);
					break;
			}

			return false;
			}, false);

	window.requestAnimationFrame(draw);
}

function parseCsv(raw) {
		var i, j, min, max, parsedData, x;

		parsedData = CSV.csvToArray(raw);
		vertices = [];
		min = [Infinity, Infinity, Infinity, Infinity];
		max = [-Infinity, -Infinity, -Infinity, -Infinity];
		for (i = 0; i < parsedData.length; ++i) {
			for (j = 0; j < 4; ++j) {
				x = parseFloat(parsedData[i][j]);
				min[j] = Math.min(min[j], x);
				max[j] = Math.max(max[j], x);
				vertices[i * 4 + j] = x;
			}
		}

		for (i = 0; i < parsedData.length; ++i) {
			for (j = 0; j < 4; ++j) {
				x = vertices[i * 4 + j];
				vertices[i * 4 + j] = 2.0 * (x - min[j]) / (max[j] - min[j]) - 1.0;
			}
		}

		return vertices;
}

window.onload = function() {
	'use strict';
	var reMode, reAxis, elementList, match, i, j;

	reset();
	addButtonListener(document.getElementById("resetButton"), reset);

	elementList = document.getElementsByClassName("button");
	reAxis = new RegExp("^axis(\\d+)$");
	reMode = new RegExp("^mode(\\d+)$");
	for (i = 0; i < elementList.length; ++i) {
		for (j = 0; j < elementList[i].classList.length; ++j) {
			match = reAxis.exec(elementList[i].classList[j]);
			if (match) {
				elementList[i].axisId = parseInt(match[1]);
				addButtonListener(elementList[i], function(target){
					setActive(target.axisId, "axis");
					wAxis = target.axisId;
				});
			}

			match = reMode.exec(elementList[i].classList[j]);
			if (match) {
				elementList[i].modeId = parseInt(match[1]);
				addButtonListener(elementList[i], function(target){
					setMode(target.modeId);
				});
			}
		}
	}

	setActive(wAxis, "axis");
	setMode(mode);

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
			};
			reader.readAsText(file);
		}
	}, false);

	readFile("data/breast_pca.csv", function(raw){
		var vertices = parseCsv(raw);
		init(vertices);
	});
};

