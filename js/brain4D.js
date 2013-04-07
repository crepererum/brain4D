/* jshint browser:true, camelcase:true, curly:true, eqeqeq:true, forin:true, latedef:true, newcap:true, noarg:true, noempty:true, nonew:true, quotmark:double, strict:true, trailing:true, undef:true, unused:true */
/* global CSV, mat4, vec4 */
var mode = 1;
var wAxis = 1;
var mouseActive = false;

var rotMatrix, transVec;

var lastX, lastY;

var gl, shaderProgram, vbuffer;

window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame;

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
	mat4.ortho(result, -1.5 * factor1, 1.5 * factor1, -1.5 * factor2, 1.5 * factor2, -100, 100);

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

function draw() {
	"use strict";

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
	document.getElementById("glcanvas").style.cursor = cursor;

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
		throw new Error("Could not initialise shaders");
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

function mouseListenerScroll(evt) {
	"use strict";
	var dVec, dMatrix, deltaX, deltaY;

	evt.preventDefault();

	deltaX = sgn(evt.deltaX || evt.wheelDeltaX) * 0.1;
	deltaY = sgn(evt.deltaY || evt.wheelDeltaY) * 0.1;

	switch (mode) {
		case 1:
			dVec = vec4.create();
			dVec.set([0.0, 0.0, deltaX, deltaY]);
			vec4.add(transVec, transVec, dVec);
			break;

		case 2:
			dMatrix =  genRotationMatrix(0.0, 0.0, deltaX, deltaY);
			mat4.multiply(rotMatrix, dMatrix, rotMatrix);
			vec4.transformMat4(transVec, transVec, dMatrix);
			break;

		case 3:
			dMatrix = mat4.create();
			dMatrix[10] += deltaX;
			dMatrix[15] += deltaY;
			mat4.multiply(rotMatrix, dMatrix, rotMatrix);
			vec4.transformMat4(transVec, transVec, dMatrix);
			break;
	}

	return false;
}

window.onerror = function(msg, url, line) {
	"use strict";
	var divError, h2Error, pMsg, pInfo;

	divError = document.createElement("div");
	h2Error = document.createElement("h2");
	pMsg = document.createElement("p");
	pInfo = document.createElement("p");

	h2Error.appendChild(document.createTextNode("Error"));
	pMsg.appendChild(document.createTextNode(msg));
	pInfo.appendChild(document.createTextNode("(" + url + ":" + line + ")"));

	divError.classList.add("error");

	divError.appendChild(h2Error);
	divError.appendChild(pMsg);
	divError.appendChild(pInfo);

	document.body.appendChild(divError);
};

window.onload = function() {
	"use strict";
	var reMode, reAxis, elementList, match, i, j;

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

	document.getElementById("glcanvas").addEventListener("mousedown", function(evt){
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

	document.getElementById("glcanvas").addEventListener("mouseup", function(evt){
		evt.preventDefault();
		if (evt.which === 1) {
			mouseActive = false;
		}
		return false;
	}, false);

	document.getElementById("glcanvas").addEventListener("mousemove", function(evt){
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

	document.getElementById("glcanvas").addEventListener("mousewheel", mouseListenerScroll, false);
	document.getElementById("glcanvas").addEventListener("wheel", mouseListenerScroll, false);

	readFile("data/breast_pca.csv", function(raw){
		var vertices = parseCsv(raw);
		reset();
		setBufferData(vertices);
	});
};

