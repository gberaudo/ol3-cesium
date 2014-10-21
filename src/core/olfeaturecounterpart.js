goog.provide('olcs.core.OlFeatureCounterpart');



/**
 * Context for feature conversion.
 * @constructor
 * @param {!ol.Feature} feature
 * @param {!Cesium.BillboardCollection} billboardCollection
 * @param {!Cesium.LabelCollection} labelCollection
 * @api
 */
olcs.core.OlFeatureCounterpart = function(feature, billboardCollection,
    labelCollection) {

  /** @type {!ol.Feature} */
  this.feature = feature;

  /** @type {!Cesium.PrimitiveCollection} */
  this.primitives = new Cesium.PrimitiveCollection();

  this.billboardCollection = billboardCollection;

  this.labelCollection = labelCollection;

  this.billboards = /** @type {Array.<Cesium.Billboard>} */ ([]);

  this.labels = /** @type {Array.<Cesium.Label>} */ ([]);
};



