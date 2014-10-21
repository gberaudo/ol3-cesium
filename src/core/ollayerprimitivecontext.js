goog.provide('olcs.core.OlLayerPrimitiveContext');



/**
 * Context for feature conversion.
 * @constructor
 * @param {!ol.proj.ProjectionLike} proj
 * @api
 */
olcs.core.OlLayerPrimitiveContext = function(proj) {

  /** @type {!ol.proj.ProjectionLike} */
  this.projection = proj;

  /** @type {!Cesium.PrimitiveCollection} */
  this.primitives = new Cesium.PrimitiveCollection();

  this.billboardCollection = new Cesium.BillboardCollection();

  this.labelCollection = new Cesium.LabelCollection();
};



