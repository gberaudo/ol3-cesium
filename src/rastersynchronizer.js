goog.provide('olcs.RasterSynchronizer');

goog.require('ol.layer.Tile');
goog.require('olcs.AbstractSynchronizer');
goog.require('olcs.core');



/**
 * This object takes care of one-directional synchronization of
 * ol3 raster layers to the given Cesium globe.
 * @param {!ol.Map} map
 * @param {!Cesium.Scene} scene
 * @param {olcsx.RasterSynchronizerOptions=} opt_options
 * @constructor
 * @extends {olcs.AbstractSynchronizer.<Cesium.ImageryLayer>}
 * @api
 */
olcs.RasterSynchronizer = function(map, scene, opt_options) {
  goog.base(this, map, scene);

  opt_options = goog.isDef(opt_options) ? opt_options : {
    layerToCesiumImagery: undefined};

  /**
   * @type {!Cesium.ImageryLayerCollection}
   * @private
   */
  this.cesiumLayers_ = scene.imageryLayers;

  /**
   * @type {!Cesium.ImageryLayerCollection}
   * @private
   */
  this.ourLayers_ = new Cesium.ImageryLayerCollection();

  /**
   * @type {
   *   function(!ol.layer.Layer, ?ol.proj.Projection): ?Cesium.ImageryLayer
   * }
   * @private
   */
  this.layerToCesiumImagery_ = olcs.core.tileLayerToImageryLayer;
  if (!!opt_options.layerToCesiumImagery) {
    // Closures error with goog.isDef(opt_options.layerToCesiumImagery)
    this.layerToCesiumImagery_ = opt_options.layerToCesiumImagery;
  }
};
goog.inherits(olcs.RasterSynchronizer, olcs.AbstractSynchronizer);


/**
 * @inheritDoc
 */
olcs.RasterSynchronizer.prototype.addCesiumObject = function(object) {
  this.cesiumLayers_.add(object);
  this.ourLayers_.add(object);
};


/**
 * @inheritDoc
 */
olcs.RasterSynchronizer.prototype.destroyCesiumObject = function(object) {
  object.destroy();
};


/**
 * @inheritDoc
 */
olcs.RasterSynchronizer.prototype.removeAllCesiumObjects = function(destroy) {
  for (var i = 0; i < this.ourLayers_.length; ++i) {
    this.cesiumLayers_.remove(this.ourLayers_.get(i), destroy);
  }
  this.ourLayers_.removeAll(false);
};


/**
 * @inheritDoc
 */
olcs.RasterSynchronizer.prototype.createSingleCounterpart = function(olLayer) {
  var viewProj = this.view.getProjection();

  var cesiumObject = this.layerToCesiumImagery_(olLayer, viewProj);

  if (!goog.isNull(cesiumObject)) {
    olLayer.on(
        ['change:brightness', 'change:contrast', 'change:hue',
         'change:opacity', 'change:saturation', 'change:visible'],
        function(e) {
          // the compiler does not seem to be able to infer this
          if (!goog.isNull(cesiumObject)) {
            olcs.core.updateCesiumLayerProperties(olLayer, cesiumObject);
          }
        });
    olcs.core.updateCesiumLayerProperties(olLayer, cesiumObject);

    // there is no way to modify Cesium layer extent,
    // we have to recreate when ol3 layer extent changes:
    olLayer.on('change:extent', function(e) {
      this.cesiumLayers_.remove(cesiumObject, true); // destroy
      this.ourLayers_.remove(cesiumObject, false);
      delete this.layerMap[goog.getUid(olLayer)]; // invalidate the map entry
      this.synchronize();
    }, this);

    olLayer.on('change', function(e) {
      // when the source changes, re-add the layer to force update
      var position = this.cesiumLayers_.indexOf(cesiumObject);
      if (position >= 0) {
        this.cesiumLayers_.remove(cesiumObject, false);
        this.cesiumLayers_.add(cesiumObject, position);
      }
    }, this);
  }

  return cesiumObject;
};
