goog.module('olcs.source.StaticCluster');
goog.module.declareLegacyNamespace();


goog.require('ol.source.Vector');


exports = class extends ol.source.Vector {
/**
 * @param {olx.source.VectorOptions} options
 * @param {Array<ol.Feature>} features
 */
  constructor(options, features) {
    super(options);
    /**
     * @type {Array<ol.Feature>}
     */
    this.clusteredFeatures = features;

  }

  /**
   * @inheritDoc
   */
  loadFeatures(extent, resolution, projection) {
    this.clear(true);
    const visibleFeatures = this.clusteredFeatures.filter(f => /** @type{number} */ (f.get('resolution')) >= resolution);
    this.addFeatures(visibleFeatures);
  }
};
