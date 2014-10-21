goog.require('olcs.core.OlFeatureCounterpart');
goog.require('olcs.core.OlLayerPrimitiveContext');
goog.provide('olcs.core.OlLayerPrimitive');



/**
 * Result of the conversion of an OpenLayers layer to Cesium.
 * @constructor
 * @param {!ol.proj.ProjectionLike} layerProjection
 * @extends {Cesium.PrimitiveCollection}
 */
olcs.core.OlLayerPrimitive = function(layerProjection) {
  goog.base(this);

  this.context = new olcs.core.OlLayerPrimitiveContext(layerProjection);
  this.add(this.context.billboardCollection);
  this.add(this.context.labelCollection);
  this.add(this.context.primitives);
};
goog.inherits(olcs.core.OlLayerPrimitive, Cesium.PrimitiveCollection);


/**
 * Convert an OpenLayers feature to Cesium primitive collection.
 * @param {!ol.layer.Vector} layer
 * @param {!ol.View} view
 * @param {!ol.Feature} feature
 * @return {Cesium.Primitive}
 * @api
 */
olcs.core.OlLayerPrimitive.prototype.convert = function(layer, view, feature) {
  var proj = view.getProjection();
  var resolution = view.getResolution();

  if (!goog.isDef(resolution) || !proj) {
    return null;
  }

  var layerStyle = layer.getStyleFunction();
  var style = olcs.core.computePlainStyle(feature, layerStyle, resolution);

  if (!style) {
    // only 'render' features with a style
    return null;
  }

  this.context.projection = proj;
  var counterpart = new olcs.core.OlFeatureCounterpart(
      feature,
      this.context.billboardCollection,
      this.context.labelCollection
      );
  return olcs.core.olFeatureToCesium(feature, proj, style, counterpart);
};


