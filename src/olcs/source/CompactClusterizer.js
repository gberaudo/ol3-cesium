goog.module('olcs.source.CompactClusterizer');
goog.module.declareLegacyNamespace();

goog.require('goog.asserts');

goog.require('ol');
goog.require('ol.coordinate');
goog.require('ol.extent');
goog.require('ol.geom.Point');
goog.require('ol.source.Vector');

/**
 * @param {number} a .
 * @param {number} b .
 * @param {number} t .
 * @return {number}
 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}


exports = class {
/**
 * Compute a list of clusters based on a list of resolutions.
 * A cluster position is chosen among the positions of the features it
 * aggegates.
 * Each feature of the source vector is associated the resolution at which
 * it is visible for the first time.
 * Export resolution of first appearance of the underlying features.
 * @param {Array<ol.Feature>} features
 * @param {Array.<number>} resolutionSteps
 * @param {Array.<number>} distanceRange
 * @param {number=} distance
 * @export
 */
  constructor(features, resolutionSteps, distanceRange, distance = 20) {

    /**
     * @type {Array<ol.Feature>}
     */
    this.features_ = features;
    /**
     * Specific resolutions where the clustering will be computed.
     * @type {Array.<number>}
     * @private
     */
    this.resolutionSteps_ = resolutionSteps;

    /**
     * @type {number}
     * @private
     */
    this.distance_ = distance;

    /**
     * @type {Array<number>}
     * @private
     */
    this.distanceRange_ = distanceRange;
  }


  /**
   * @return {Array<ol.Feature>}
   */
  exportClusterHierarchy() {
    return this.features_.map((f) => {
      const clone = f.clone();
      // Keep only the ids of the children features
      const children = clone.get('children') || {};
      for (const resolution in children) {
        const values = children[resolution];
        if (values.length === 0) {
          delete children[resolution];
        } else {
          children[resolution] = values.map(childFeature => childFeature.getId());
        }
      }
      const rindex = /** @type{number} */ (clone.get('resolution_index'));
      if (rindex != this.resolutionSteps_.length - 1) {
        clone.set('resolution', this.resolutionSteps_[rindex + 1]);
      } else {
        clone.set('resolution', this.resolutionSteps_[rindex] * 1.5);
      }
      clone.unset('resolution_index');
      clone.setId(f.getId());
      return clone;
    });
  }


  /**
   * @return {olcs.source.CompactClusterizer}
   */
  clusterize() {
    let featuresAtStep = this.features_; // all features

    this.resolutionSteps_.forEach(function(resolution, index) {
      // Create cluster at a given resolution using the features
      // at the previous resolution.
      featuresAtStep = this.clusterFeaturesAtStep_(featuresAtStep, index);
    }, this);

    return this;
  }


  /**
   * Create a cluster of features at a given resolution.
   * @param {Array.<ol.Feature>} previousStepFeatures cluster at previous step
   * @param {number} rindex
   * @return {Array.<ol.Feature>} cluster at this resolution
   * @private
   */
  clusterFeaturesAtStep_(previousStepFeatures, rindex) {

    const clusteringResolution = this.resolutionSteps_[rindex];
    console.log('generating cluster at', clusteringResolution);

    if (clusteringResolution === 0) {
      // Special case for resolution 0 where neighboring should be disabled
      previousStepFeatures.forEach((feature) => {
        feature.set('resolution_index', 0, true);
      });
      return previousStepFeatures;
    }

    const extent = ol.extent.createEmpty();
    let mapDistance = this.distance_ * clusteringResolution;
    if (this.distanceRange_) {
      const maxResolution = this.resolutionSteps_[this.resolutionSteps_.length - 1];
      const t =  clusteringResolution / maxResolution;
      mapDistance *= lerp(this.distanceRange_[0], this.distanceRange_[1], t);
    }
    const leafSource = new ol.source.Vector({features: previousStepFeatures});

    /** @type {Array.<ol.Feature>} */
    const featuresAtStep = [];

    /**
     * @type {Object.<string, boolean>}
     */
    const clustered = {};

    previousStepFeatures.forEach((feature) => {
      const uid = ol.getUid(feature).toString();
      if (!(uid in clustered)) {
        const geometry = feature.getGeometry();
        goog.asserts.assert(geometry instanceof ol.geom.Point);
        const coordinates = geometry.getCoordinates();

        // Find the features close to the current feature
        ol.extent.createOrUpdateFromCoordinate(coordinates, extent);
        ol.extent.buffer(extent, mapDistance, extent);
        let neighbors = leafSource.getFeaturesInExtent(extent);

        // Only keep neighbors not belonging to another cluster
        goog.asserts.assert(neighbors.length >= 1);
        neighbors = neighbors.filter((neighbor) => {
          const nuid = ol.getUid(neighbor).toString();
          if (!(nuid in clustered)) {
            // This neighbor has not been clustered yet.
            // Mark it as clustered and keep it.
            // Note that 'feature' is included in the neighbors.
            clustered[nuid] = true;
            return true;
          } else {
            // Discard already clustered neighbor
            return false;
          }
        });

        // Choose a feature out of the neighbors
        const chosenFeature = this.chooseFeature_(neighbors);

        // Create children array
        const children = [];
        neighbors.forEach((f) => {
          // Remove chosen feature from children
          if (chosenFeature !== f) {
            children.push(f);
          }
        });

        // Update the 'children' property with the children at this resolution
        const childrenObject = chosenFeature.get('children') || {};
        childrenObject[clusteringResolution] = children;
        chosenFeature.set('children', childrenObject, true);

        // Update the resolution index property
        chosenFeature.set('resolution_index', rindex, true);

        // Add the chosen feature to current step features
        featuresAtStep.push(chosenFeature);
      }
    });

    // Return the array of the chosen features for this step
    return featuresAtStep;
  }


  /**
   * @param {Array.<ol.Feature>} features Features
   * @return {ol.Feature}
   * @private
   */
  chooseFeature_(features) {
    const length = features.length;
    const centroid = [0, 0];
    features.forEach((feature) => {
      const geometry = feature.getGeometry();
      goog.asserts.assert(geometry instanceof ol.geom.Point);
      const coordinates = geometry.getCoordinates();
      ol.coordinate.add(centroid, coordinates);
    });
    ol.coordinate.scale(centroid, 1 / length);

    let closestFeature;
    const closestDistance = Infinity;
    features.forEach((feature) => {
      const geometry = feature.getGeometry();
      goog.asserts.assert(geometry instanceof ol.geom.Point);
      const coordinates = geometry.getCoordinates();
      const distance = Math.pow(coordinates[0] - centroid[0], 2) +
          Math.pow(coordinates[1] - centroid[1], 2);
      if (distance < closestDistance) {
        closestFeature = feature;
      }
    });

    return closestFeature;
  }
};
