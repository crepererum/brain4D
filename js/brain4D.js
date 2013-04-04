/*jslint browser: true, devel: true, bitwise: true, plusplus: true, white: true */

var rotMatrix = mat4.create();
var mouseActive = false;
var transVec = vec4.create();
var wAxis = 1;

var lastX;
var lastY;

var gl;
var shaderProgram;
var vbuffer;
var vertices;

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

function genRotationMatrix(x, y, z) {
	'use strict';
	var result, tmp;

	result = mat4.create();
	mat4.rotateX(result, result, x);
	mat4.rotateY(result, result, y);
	tmp = mat4.create();
	if (wAxis === 0) {
		tmp.set([
				Math.cos(z), 0.0, 0.0, -Math.sin(z),
				0.0, 1.0, 0.0, 0.0,
				0.0, 0.0, 1.0, 0.0,
				Math.sin(z), 0.0, 0.0, Math.cos(z)
				]);
	} else if (wAxis === 1) {
		tmp.set([
				1.0, 0.0, 0.0, 0.0,
				0.0, Math.cos(z), 0.0, -Math.sin(z),
				0.0, 0.0, 1.0, 0.0,
				0.0, Math.sin(z), 0.0, Math.cos(z)
				]);
	} else {
		tmp.set([
				1.0, 0.0, 0.0, 0.0,
				0.0, 1.0, 0.0, 0.0,
				0.0, 0.0, Math.cos(z), -Math.sin(z),
				0.0, 0.0, Math.sin(z), Math.cos(z)
				]);
	}
	mat4.multiply(result, result, tmp);

	return result;
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

function init() {
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

	vbuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vbuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	vbuffer.itemSize = 4;
	vbuffer.numItems = vertices.length / 4;

	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.BLEND);
	gl.enable(gl.POINTS_SMOOTH);

	canvas.addEventListener("mousedown", function(evt){
			if (evt.which === 1) {
				lastX = evt.clientX;
				lastY = evt.clientY;
				mouseActive = true;
			} else if (evt.which === 2) {
				wAxis = (wAxis + 1) % 3;
			}
			}, false);

	canvas.addEventListener("mouseup", function(evt){
			if (evt.which === 1) {
				mouseActive = false;
			}
			}, false);

	canvas.addEventListener("mousemove", function(evt){
			if (mouseActive) {
				var dX, dY, dVec, dMatrix;

				dX = evt.clientX - lastX;
				dY = evt.clientY - lastY;
				lastX = evt.clientX;
				lastY = evt.clientY;

				if (evt.shiftKey) {
					dVec = vec4.create();
					dVec.set([2.0 * dX / gl.viewportWidth, -2.0 * dY / gl.viewportHeight, 0.0, 0.0]);
					vec4.add(transVec, transVec, dVec);
				} else if (evt.altKey || evt.ctrlKey) {
					dMatrix = mat4.create();
					dMatrix[0] += dX / gl.viewportWidth;
					dMatrix[5] -= dY / gl.viewportHeight;
					mat4.multiply(rotMatrix, dMatrix, rotMatrix);
					vec4.transformMat4(transVec, transVec, dMatrix);
				} else {
					dMatrix = genRotationMatrix(dY / 50.0, dX / 50.0, 0.0);
					mat4.multiply(rotMatrix, dMatrix, rotMatrix);
					vec4.transformMat4(transVec, transVec, dMatrix);
				}
			}
			}, false);

	canvas.addEventListener("mousewheel", function(evt){
			var dVec, dMatrix;

			evt.preventDefault();

			if (evt.shiftKey) {
				dVec = vec4.create();
				dVec.set([0.0, 0.0, 0.0, evt.wheelDelta / 1000.0]);
				vec4.add(transVec, transVec, dVec);
			} else if(evt.altKey || evt.ctrlKey) {
				dMatrix = mat4.create();
				dMatrix[15] += evt.wheelDelta / 1000.0;
				mat4.multiply(rotMatrix, dMatrix, rotMatrix);
				vec4.transformMat4(transVec, transVec, dMatrix);
			} else {
				dMatrix =  genRotationMatrix(0.0, 0.0, evt.wheelDelta / 1000.0);
				mat4.multiply(rotMatrix, dMatrix, rotMatrix);
				vec4.transformMat4(transVec, transVec, dMatrix);
			}

			return false;
			}, false);

	window.requestAnimationFrame(draw);
}

window.onload = function() {
	'use strict';

	readFile("data/breast_pca.csv", function(raw){
		var i, j, parsedData;

		parsedData = CSV.csvToArray(raw);
		vertices = [];
		for (i = 0; i < parsedData.length; ++i) {
			for (j = 0; j < 4; ++j) {
				vertices[i * 4 + j] = parseFloat(parsedData[i][j]);
			}
		}

		init();
	});
};

