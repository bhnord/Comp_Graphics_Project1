let alpha = 0;
let gl;



//get files





function main() {




	// Retrieve <canvas> element
	let canvas = document.getElementById('webgl');

	// Get the rendering context for WebGL
	gl = WebGLUtils.setupWebGL(canvas);
	if (!gl) {
		console.log('Failed to get the rendering context for WebGL');
		return;
	}

	// Initialize shaders
	program = initShaders(gl, "vshader", "fshader");
	gl.useProgram(program);

	//Set up the viewport
	//how we wan to map to the canvas
	let vp_width = canvas.width;
	let vp_height = canvas.height
	gl.viewport(0, 0, vp_width, vp_height);


	//set up points buffer to be used later when file uplaod
	let points = [];
	let refresh_points = [];
	let vBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);


	//set up vPosition attribute array (linked with vBuffer)
	let vPosition = gl.getAttribLocation(program, "vPosition");
	gl.enableVertexAttribArray(vPosition);
	gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);


	//set up colors buffer to be used later when file upload
	let colors = [];
	let cBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);

	//set up vColor attribute array (linked wiht cBuffer)
	let vColor = gl.getAttribLocation(program, "vColor");
	gl.enableVertexAttribArray(vColor);
	gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);




	let projMatrix = ortho(-1, 1, -1, 1, -1, 1);
	let projMatrixLoc = gl.getUniformLocation(program, "projMatrix");


	//ortho boundries
	let [left, right, bottom, top] = [-1, 1, -1, 1];
	let aspect = 1;

	//ortho offset
	let x = 0;
	let y = 0;
	let ortho_scale = 0;

	let view_width = 1;
	let view_height = 1;

	//on file upload (change in selected file) run below
	const fileInput = document.getElementById("svg-file");
	fileInput.onchange = () => {
		const selectedFile = fileInput.files[0];
		console.log(selectedFile);
		const reader = new FileReader();

		//reset x and y offset of ortho 
		x = 0;
		y = 0;
		ortho_scale = 0;

		reader.onload = () => {

			//parse through xml file
			let parser = new DOMParser();
			let doc = parser.parseFromString(reader.result, "image/svg+xml");

			const errorNode = doc.querySelector("parsererror");
			if (errorNode) {
				console.log("error while parsing");
			} else {
				console.log(doc.documentElement.nodeName);
			}



			let svg_view = doc.querySelectorAll("svg")[0].viewBox.baseVal;

			view_width = svg_view.width;
			view_height = svg_view.height;

			vp_width = canvas.width;
			vp_height = canvas.height;

			//scale the apsect ratio of the viewport
			aspect = view_width / view_height
			console.log(aspect);
			if (aspect > 1.0) {
				vp_height /= aspect;
			} else {
				vp_width *= aspect;
			}
			gl.viewport(0, 0, vp_width, vp_height)

			//fill in ortho boundries
			left = svg_view.x;
			right = left + view_width;
			top = svg_view.y;
			bottom = top + view_height;

			console.log(svg_view);
			console.log("left, %f, right, %f, bottom, %f, top, %f", left, right, bottom, top);


			//set up the projection matrix
			projMatrix = ortho(left, right, bottom, top, -1.0, 1.0);
			gl.uniformMatrix4fv(projMatrixLoc, false, flatten(projMatrix));


			const new_points = [];
			const new_colors = [];

			//select all drawing lines in xml file 
			lines = doc.documentElement.querySelectorAll("line");

			//loop through each line and extract x and y points to plot as well as color
			for (const line of lines) {
				//get xy
				let z = 0;
				let x1 = line.x1.baseVal.value;
				let x2 = line.x2.baseVal.value;
				let y1 = line.y1.baseVal.value;
				let y2 = line.y2.baseVal.value;

				//line start and end points
				let point1 = vec4(x1, y1, z, 1.0);
				let point2 = vec4(x2, y2, z, 1.0);

				//push points onto buffer
				new_points.push(point1);
				new_points.push(point2);

				//gets hex string for color
				let stroke = line.getAttribute("stroke");

				//convert hex string to number 0 <= x <= 1
				let r = Number("0x" + stroke.substring(1, 3)) / 255;
				let g = Number("0x" + stroke.substring(3, 5)) / 255;
				let b = Number("0x" + stroke.substring(5, 7)) / 255;

				//convert to vec4 and add to color buffer twice (one for each point)
				let color = vec4(r, g, b, 1.0);

				new_colors.push(color);
				new_colors.push(color);
			}


			//bind points 
			points = new_points;
			refresh_points = points;
			gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);


			//bind colors
			colors = new_colors;
			refresh_colors = colors;
			gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

			gl.clearColor(1.0, 1.0, 1.0, 1.0);
			gl.clear(gl.COLOR_BUFFER_BIT);
			//refresh drawing 
			gl.drawArrays(gl.LINES, 0, points.length);
		};



		reader.readAsText(selectedFile);


	};











	window.onkeypress = function (event) {
		let key = event.key;
		switch (key) {
			case 'r':
				//reset points in buffer
				gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
				gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

				//reset colors in buffer
				gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
				gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

				//reset ortho offset
				x = 0;
				y = 0;
				ortho_scale = 0;
				//reset ortho
				projMatrix = ortho(left + x, right + x, bottom + y, top + y, -1.0, 1.0);
				gl.uniformMatrix4fv(projMatrixLoc, false, flatten(projMatrix));

				gl.clearColor(1.0, 1.0, 1.0, 1.0);
				gl.clear(gl.COLOR_BUFFER_BIT);

				gl.drawArrays(gl.LINES, 0, points.length);
				break;
		}




	};

	// window.onclick = function (event) {
	// 	gl.clear(gl.COLOR_BUFFER_BIT);
	// 	console.log("cleared");
	// }


	//note that 0,0 is top left corner on canvas element


	let place_dot = false;
	canvas.onmousedown = (event) => {
		console.log(event.button);

		//calcuate factor to scale projected x and y on canvas to ortho scale
		let width_scale = (right - left) / canvas.width;
		let height_scale = (bottom - top) / canvas.height;


		//convert the aspect ratio backwards and apply to view_height or view_widthscale
		if (aspect > 1) {
			height_scale *= aspect;
		} else {
			width_scale /= aspect;
		}


		//TODO IMPLEMENT LINE DRAWING
		if (event.button == 2) {
			//right click handling (add line)


		}


		else if (event.button == 0) {
			//left click (pan) handling
			let last_mouse_x = event.clientX;
			let last_mouse_y = event.clientY;

			window.onmousemove = (event) => {
				let ch_x = event.clientX - last_mouse_x;
				let ch_y = event.clientY - last_mouse_y

				last_mouse_x = event.clientX;
				last_mouse_y = event.clientY;


				//calcuate factor to scale projected x and y on canvas to ortho scale
				let width_scale = (right - left) / canvas.width;
				let height_scale = (bottom - top) / canvas.height;


				//convert the aspect ratio backwards and apply to view_height or view_widthscale
				if (aspect > 1) {
					height_scale *= aspect;
				} else {
					width_scale /= aspect;
				}

				//we are moving the ortho box not the image so we subtract from x and y to make it appear to drag
				//scale x+y changes to original sizing
				x -= ch_x * width_scale * (ortho_scale + 1);
				y -= ch_y * height_scale * (ortho_scale + 1);

				projMatrix = ortho(left + x, right + x + (view_width * ortho_scale), bottom + y + (view_height * ortho_scale), top + y, -1.0, 1.0);
				gl.uniformMatrix4fv(projMatrixLoc, false, flatten(projMatrix));

				gl.clearColor(1.0, 1.0, 1.0, 1.0);
				gl.clear(gl.COLOR_BUFFER_BIT);

				gl.drawArrays(gl.LINES, 0, points.length);
			}
		}
	};


	canvas.onwheel = (event) => {
		let mouse_x = event.clientX;
		let mouse_y = event.clientY;
		console.log(mouse_x + mouse_y);
		console.log(ortho_scale);


		//calcuate factor to scale projected x and y on canvas to ortho scale
		let width_scale = (right - left) / canvas.width;
		let height_scale = (bottom - top) / canvas.height;


		//convert the aspect ratio backwards and apply to view_height or view_widthscale
		if (aspect > 1) {
			height_scale *= aspect;
		} else {
			width_scale /= aspect;
		}

		if (event.deltaY < 0) {
			//scroll in
			if (ortho_scale > -0.85) {
				ortho_scale -= 0.1;
				x += (event.clientX - (canvas.width - vp_width)) * 0.1 * width_scale;
				y += (event.clientY - (canvas.height - vp_height)) * 0.1 * height_scale;
			}
		} else {
			//scroll out
			if (ortho_scale < 9.5) {
				ortho_scale += 0.1;
				x -= (event.clientX - (canvas.width - vp_width)) * 0.1 * width_scale;
				y -= (event.clientY - (canvas.height - vp_height)) * 0.1 * height_scale;
			}
		}





		console.log("x: %f, y: %f", x, y);
		//console.log("left: %f, right: %f, bottom: %f, top: %f",left +x, right + x+ (view_width* ortho_scale), bottom +y+ (view_height * ortho_scale), top + y)
		projMatrix = ortho(left + x, right + x + (view_width * ortho_scale), bottom + y + (view_height * ortho_scale), top + y, -1.0, 1.0);
		gl.uniformMatrix4fv(projMatrixLoc, false, flatten(projMatrix));

		gl.clearColor(1.0, 1.0, 1.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT);

		gl.drawArrays(gl.LINES, 0, points.length);
		//}

		console.log(event.deltaY);
		console.log(event.deltaX);

	}

	window.onmouseup = () => {
		window.onmousemove = () => { };
	};

}



