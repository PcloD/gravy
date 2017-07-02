
/** @constructor 
* Interface to the dat.GUI UI.
*/
var GUI = function(visible = true) 
{
	// Create dat gui
	this.gui = new dat.GUI();
	this.gui.domElement.id = 'gui';
	var gui = this.gui;
	this.visible = visible;
	
	this.createSceneSettings();
	this.createMaterialSettings();
	this.createRendererSettings();
	if (!visible)
		this.gui.__proto__.constructor.toggleHide();
}

function updateDisplay(gui) 
{
    for (var i in gui.__controllers) {
        gui.__controllers[i].updateDisplay();
    }
    for (var f in gui.__folders) {
        updateDisplay(gui.__folders[f]);
    }
}

/**
* Call to explicitly force the GUI to synchronize with the
* current parameter values, if they have been changed programmatically.
*/
GUI.prototype.sync = function()
{
	updateDisplay(this.gui);
}

GUI.prototype.toggleHide = function()
{
	this.visible = !this.visible;
}

function hexToRgb(hex) 
{
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

GUI.prototype.createRendererSettings = function()
{
	this.rendererFolder = this.gui.addFolder('Renderer');
	this.pathtracerSettings = {};
	var pathtracer = snelly.getRenderer();
	var camera = snelly.getCamera();

	// @todo: add a basic AO and normals mode as well, useful for scene debugging.
	var renderModes = ['pt', 'ao', 'normals', 'firsthit'];
	this.rendererFolder.add(pathtracer, 'renderMode', renderModes).onChange( function(renderMode) { pathtracer.renderMode = renderMode; pathtracer.reset(); });
	this.rendererFolder.add(pathtracer, 'maxBounces', 1, 10).onChange( function(value) { pathtracer.maxBounces = Math.floor(value); pathtracer.reset(); });
	this.rendererFolder.add(pathtracer, 'maxMarchSteps', 1, 1024).onChange( function(value) { pathtracer.maxMarchSteps = Math.floor(value); pathtracer.reset(); } );
	this.rendererFolder.add(pathtracer, 'radianceClamp', -2.0, 6.0).onChange( function(value) { pathtracer.reset(true); } );
	this.rendererFolder.add(pathtracer, 'exposure', 0.0, 50.0);
	this.rendererFolder.add(camera, 'fov', 5.0, 120.0).onChange( function(value) { pathtracer.reset(true); } );
	this.rendererFolder.add(camera, 'aperture',      1.0e-6*snelly.maxScale, 1.0e-3*snelly.maxScale).onChange( function(value) { pathtracer.reset(true); } );
	this.rendererFolder.add(camera, 'focalDistance', 1.0e-6*snelly.maxScale, 0.1*snelly.maxScale).onChange( function(value) { pathtracer.reset(true); } );

	this.rendererFolder.add(pathtracer, 'gamma', 0.0, 3.0);
	this.rendererFolder.add(pathtracer, 'whitepoint', 0.0, 2.0);
	this.rendererFolder.add(pathtracer, 'shadowStrength', 0.0, 1.0).onChange( function(value) { pathtracer.reset(true); } );
	this.rendererFolder.add(pathtracer, 'maxStepsIsMiss').onChange( function(value) { pathtracer.reset(true); } );
	this.rendererFolder.add(pathtracer, 'envMapVisible').onChange( function(value) { pathtracer.reset(true); } );
	this.rendererFolder.add(pathtracer, 'envMapRotation', 0.0, 360.0).onChange( function(value) { pathtracer.reset(true); } );
	this.rendererFolder.add(pathtracer, 'AA').onChange( function(value) { pathtracer.reset(true); } );

	var skyPowerItem = this.rendererFolder.add(pathtracer, 'skyPower', 0.0, 10.0);
	skyPowerItem.onChange( function(value) 
	{ 
		snelly.camera.enabled = false;
		var no_recompile = true;
		pathtracer.reset(no_recompile);
	} );
	skyPowerItem.onFinishChange( function(value) { snelly.camera.enabled = true; } );

	// init gui for spectrum
	spectrumObj = snelly.getLoadedSpectrum();
	spectrumObj.initGui(this.rendererFolder);

	this.gui.remember(this.pathtracerSettings);
	this.rendererFolder.close();
}

GUI.prototype.createSceneSettings = function()
{
	var sceneObj = snelly.getScene();
	if (typeof sceneObj.initGui !== "undefined") 
	{
		this.sceneFolder = this.gui.addFolder('Scene');
		sceneObj.initGui(this);
		this.sceneFolder.open();
		this.gui.remember(this.sceneSettings);
	}
}

/** 
 * Add a dat.GUI UI slider to control a float parameter.
 * The scene parameters need to be organized into an Object as
 * key-value pairs, for supply to this function.
 * @param {Object} parameters - the parameters object for the scene, with a key-value pair (where value is number) for the float parameter name
 * @param {Object} param - the slider range for this parameter, in the form `{name: 'foo', min: 0.0, max: 100.0, step: 1.0, recompile: true}` (step is optional, recompile is optional [default is false])
 * @param {Object} folder - optionally, pass the dat.GUI folder to add the parameter to (defaults to the main scene folder)
 * @returns {Object} the created dat.GUI slider item
 * @example
 *		Scene.prototype.initGui = function(gui)            
 *		{
 *			gui.addSlider(this.parameters, c);
 *			gui.addSlider(this.parameters, {name: 'foo2', min: 0.0, max: 1.0});
 *			gui.addSlider(this.parameters, {name: 'bar', min: 0.0, max: 3.0, recompile: true});
 *		}
 */
GUI.prototype.addSlider = function(parameters, param, folder=undefined)
{
	let _f = this.sceneFolder;
	if (typeof folder !== 'undefined') _f = folder;
	var name = param.name;
	var min  = param.min;
	var max  = param.max;
	var step = param.step;
	var recompile = param.recompile;
	var no_recompile = true;
	if (!(recompile==null || recompile==undefined)) no_recompile = !recompile;
	var item;
	if (step==null || step==undefined) { item = _f.add(parameters, name, min, max, step); }
	else                               { item = _f.add(parameters, name, min, max);       }
	item.onChange( function(value) { snelly.reset(no_recompile); snelly.camera.enabled = false; } );
	item.onFinishChange( function(value) { snelly.camera.enabled = true; } );
	return item;
}

/** 
 * Add a dat.GUI UI color picker to control a 3-element array parameter (where the RGB color channels are mapped into [0,1] float range)
 * @param {Object} parameters - the parameters object for the scene, with a key-value pair (where value is a 3-element array) for the color parameter name
 * @param {Object} name - the color parameter name
 * @param {Object} folder - optionally, pass a scale factor to apply to the RGB color components to calculate the result (defaults to 1.0)
 * @param {Object} folder - optionally, pass the dat.GUI folder to add the parameter to (defaults to the main scene folder)
 * @returns {Object} the created dat.GUI color picker item
*/
GUI.prototype.addColor = function(parameters, name, scale=1.0, folder=undefined)
{
	let _f = this.sceneFolder;
	if (typeof folder !== 'undefined') _f = folder;
	_f[name] = [parameters[name][0]*255.0, parameters[name][1]*255.0, parameters[name][2]*255.0];
	var item = _f.addColor(_f, name);
	item.onChange( function(color) {
								if (typeof color==='string' || color instanceof String)
								{
									var C = hexToRgb(color);
									parameters[name][0] = scale * C.r / 255.0;
									parameters[name][1] = scale * C.g / 255.0;
									parameters[name][2] = scale * C.b / 255.0;
								}
								else
								{
									parameters[name][0] = scale * color[0] / 255.0;
									parameters[name][1] = scale * color[1] / 255.0;
									parameters[name][2] = scale * color[2] / 255.0;
								}
								snelly.reset(true);
							} );
	return item;
}

// (deprecated)
GUI.prototype.addParameter = function(parameters, param)
{
	this.addSlider(parameters, param);
}

/**
* Access to internal dat.GUI object
* @returns {dat.GUI}
*/
GUI.prototype.getGUI = function()
{
	return this.gui;
}

GUI.prototype.getSceneFolder = function()
{
	return this.sceneFolder;
}

GUI.prototype.createMaterialSettings = function()
{
	var GUI = this;

	var sceneObj = snelly.getScene();
	var shader = sceneObj.shader();

	// Metal settings
	if (shader.indexOf("SDF_METAL(") !== -1)
	{
		this.metalFolder = this.gui.addFolder('Metal material');
		var metalObj = snelly.getLoadedMetal();
		var metalName = metalObj.getName();
		metals = snelly.getMetals();
		var metalNames = Object.keys(metals);
		this.metalMaterialSettings = {};
		this.metalMaterialSettings["metal"] = metalName;
		var metalItem = this.metalFolder.add(this.metalMaterialSettings, 'metal', metalNames);
		metalItem.onChange( function(materialName) {
							var materialObj = snelly.getLoadedMetal(); // remove gui for current material
							materialObj.eraseGui(GUI.metalFolder);
					 		snelly.loadMetal(materialName); // load new material
					 		materialObj = snelly.getLoadedMetal(); // init gui for new material
					 		materialObj.initGui(GUI.metalFolder);
				 	} );
		metalObj.initGui(this.metalFolder);
		this.metalFolder.close();
	}

	// Dielectric settings
	if (shader.indexOf("SDF_DIELECTRIC(") !== -1)
	{
		this.dielectricFolder = this.gui.addFolder('Dielectric material');
		var dielectricObj = snelly.getLoadedDielectric();
		var dielectricName = dielectricObj.getName();
		dielectrics = snelly.getDielectrics();
		var dielectricNames = Object.keys(dielectrics);
		this.dielMaterialSettings = {};
		this.dielMaterialSettings["dielectric"] = dielectricName;
		var dielItem = this.dielectricFolder.add(this.dielMaterialSettings, 'dielectric', dielectricNames);
		dielItem.onChange( function(materialName) {
							var materialObj = snelly.getLoadedDielectric(); // remove gui for current material
							materialObj.eraseGui(GUI.dielectricFolder);
					 		snelly.loadDielectric(materialName); // load new material
					 		materialObj = snelly.getLoadedDielectric(); // init gui for new material
					 		materialObj.initGui(GUI.dielectricFolder);
					 	} );
		dielectricObj.initGui(this.dielectricFolder);
		this.dielectricFolder.close();
	}

	// Surface settings
	if (shader.indexOf("SDF_SURFACE(") !== -1)
	{
		this.surfaceFolder = this.gui.addFolder('Surface material');
		var surfaceObj = snelly.getSurface();
		this.surfaceFolder.diffuse = [surfaceObj.diffuseAlbedo[0]*255.0, surfaceObj.diffuseAlbedo[1]*255.0, surfaceObj.diffuseAlbedo[2]*255.0];
		var diffItem = this.surfaceFolder.addColor(this.surfaceFolder, 'diffuse');
		diffItem.onChange( function(albedo) {
								if (typeof albedo==='string' || albedo instanceof String)
								{
									var color = hexToRgb(albedo);
									surfaceObj.diffuseAlbedo[0] = color.r / 255.0;
									surfaceObj.diffuseAlbedo[1] = color.g / 255.0;
									surfaceObj.diffuseAlbedo[2] = color.b / 255.0;
								}
								else
								{
									surfaceObj.diffuseAlbedo[0] = albedo[0] / 255.0;
									surfaceObj.diffuseAlbedo[1] = albedo[1] / 255.0;
									surfaceObj.diffuseAlbedo[2] = albedo[2] / 255.0;
								}
								snelly.reset(true);
							} );

		this.surfaceFolder.specular = [surfaceObj.specAlbedo[0]*255.0, surfaceObj.specAlbedo[1]*255.0, surfaceObj.specAlbedo[2]*255.0];
		var specItem = this.surfaceFolder.addColor(this.surfaceFolder, 'specular');
		specItem.onChange( function(albedo) {
								if (typeof albedo==='string' || albedo instanceof String)
								{
									var color = hexToRgb(albedo);
									surfaceObj.specAlbedo[0] = color.r / 255.0;
									surfaceObj.specAlbedo[1] = color.g / 255.0;
									surfaceObj.specAlbedo[2] = color.b / 255.0;
								}
								else
								{
									surfaceObj.specAlbedo[0] = albedo[0] / 255.0;
									surfaceObj.specAlbedo[1] = albedo[1] / 255.0;
									surfaceObj.specAlbedo[2] = albedo[2] / 255.0;
								}
								snelly.reset(true);
							} );

		this.roughnessItem = this.surfaceFolder.add(surfaceObj, 'roughness', 0.0, 0.1);
		this.roughnessItem.onChange( function(value) { surfaceObj.roughness = value; snelly.camera.enabled = false; snelly.reset(true); } );
		this.roughnessItem.onFinishChange( function(value) { snelly.camera.enabled = true; } );

		this.iorItem = this.surfaceFolder.add(surfaceObj, 'ior', 1.0, 3.0);
		this.iorItem.onChange( function(value) { surfaceObj.ior = value; snelly.camera.enabled = false; snelly.reset(true); } );
		this.iorItem.onFinishChange( function(value) { snelly.camera.enabled = true; } );

		this.surfaceFolder.close();
	}

	this.gui.remember(this.materialSettings);
}




