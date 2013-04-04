function getShader(gl, id) {
	var shaderScript = document.getElementById(id);
	var str = "";
	var k = shaderScript.firstChild;
	while (k) {
		if (k.nodeType == 3) {
			str += k.textContent;
		}
		k = k.nextSibling;
	}

	var shader;
	if (shaderScript.type == "x-shader/x-fragment") {
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	} else if (shaderScript.type == "x-shader/x-vertex") {
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
	var result = mat4.create();
	var factor1 = width / Math.min(width, height);
	var factor2 = height / Math.min(width, height);
	mat4.ortho(result, -1.5 * factor1, 1.5 * factor1, -1.5 * factor2, 1.5 * factor2, -100, 100);
	return result;
}

function genRotationMatrix(x, y, z) {
	var result = mat4.create();
	mat4.rotateX(result, result, x);
	mat4.rotateY(result, result, y);
	var tmp = mat4.create();
	tmp.set([
			1.0, 0.0, 0.0, 0.0,
			0.0, Math.cos(z), 0.0, -Math.sin(z),
			0.0, 0.0, 1.0, 0.0,
			0.0, Math.sin(z), 0.0, Math.cos(z)
			]);
	mat4.multiply(result, result, tmp);
	return result;
}

function draw() {
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

function genRandomVertices(n) {
	var result = Array(n * 4);
	for (var i = 0; i < n; ++i) {
		result[i] = Math.random() * 2.0 - 1.0;
	}
	return result;
}

var rotMatrix = mat4.create();
var mouseActive = false;
var transVec = vec4.create();

var lastX;
var lastY;

var gl;
var shaderProgram;
var vbuffer;

function init() {
	var canvas = document.getElementById("glcanvas");
	canvas.width = canvas.clientWidth;
	canvas.height = canvas.clientHeight;
	gl = canvas.getContext("experimental-webgl");
	gl.viewportWidth = canvas.width;
	gl.viewportHeight = canvas.height;
	gl.enable(gl.VERTEX_PROGRAM_POINT_SIZE);

	var fragmentShader = getShader(gl, "shader-fs");
	var vertexShader = getShader(gl, "shader-vs");
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
	var vertices = genRandomVertices(1000);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	vbuffer.itemSize = 4;
	vbuffer.numItems = vertices.length / 4;

	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.BLEND);
	gl.enable(gl.POINTS_SMOOTH);

	canvas.addEventListener("mousedown", function(evt){
			lastX = evt.clientX;
			lastY = evt.clientY;
			mouseActive = true;
			}, false);

	canvas.addEventListener("mouseup", function(){
			mouseActive = false;
			}, false);

	canvas.addEventListener("mousemove", function(evt){
			if (mouseActive) {
				var dX = evt.clientX - lastX;
				var dY = evt.clientY - lastY;
				lastX = evt.clientX;
				lastY = evt.clientY;

				if (evt.shiftKey) {
					var dVec = vec4.create();
					dVec.set([2.0 * dX / gl.viewportWidth, -2.0 * dY / gl.viewportHeight, 0.0, 0.0]);
					vec4.add(transVec, transVec, dVec);
				} else {
					var dMatrix = genRotationMatrix(dY / 50.0, dX / 50.0, 0.0);
					mat4.multiply(rotMatrix, dMatrix, rotMatrix);
					vec4.transformMat4(transVec, transVec, dMatrix);
				}
			}
			}, false)

	canvas.addEventListener("mousewheel", function(evt){
			if (evt.shiftKey) {
				var dVec = vec4.create();
				dVec.set([0.0, 0.0, 0.0, evt.wheelDelta / 1000.0])
				vec4.add(transVec, transVec, dVec);
			} else {
				var dMatrix =  genRotationMatrix(0.0, 0.0, evt.wheelDelta / 1000.0);
				mat4.multiply(rotMatrix, dMatrix, rotMatrix);
				vec4.transformMat4(transVec, transVec, dMatrix);
			}
			return false;
			}, false);

	window.requestAnimationFrame(draw);
}

window.onload = init;

