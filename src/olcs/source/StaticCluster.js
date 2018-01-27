goog.module('olcs.source.StaticCluster');
goog.module.declareLegacyNamespace();


goog.require('ol.source.Vector');


exports = class extends ol.source.Vector {
/**
 * @param {olx.source.Vector} options
 * @export
 */
  constructor(options, features) {
    super(options);
    /**
     * @type {Array<ol.Feature>}
     * @export
     */
    this.clusteredFeatures = features;

  }

  /**
   * @inheritDoc
   */
  loadFeatures(extent, resolution, projection) {
    this.clear(true);
    const visibleFeatures = this.clusteredFeatures.filter(f => f.get('resolution') >= resolution);
    this.addFeatures(visibleFeatures);
  }
};
