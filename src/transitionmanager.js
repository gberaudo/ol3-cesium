goog.provide('olcs.TransitionManager');

goog.require('goog.Promise');



/**
 * @param {olcs.OLCesium} ol3d
 * @param {number} xRatio Relative position of the rotation point x.
 * @param {number} yRatio Relative position of the rotation point y.
 * @constructor
 */
olcs.TransitionManager = function(ol3d, xRatio, yRatio) {
  /**
   * @private
   */
  this.ol3d_ = ol3d;

  /**
   * @private
   * @const
   */
  this.xRatio_ = xRatio;

  /**
   * @private
   * @const
   */
  this.yRatio_ = yRatio;
};


/**
 * @private
 * @return {!Cesium.Cartesian3|undefined}
 */
olcs.TransitionManager.prototype.pickPoint_ = function() {
  var scene = this.ol3d_.getCesiumScene();
  var canvas = scene.canvas;
  var point = new Cesium.Cartesian2(
      canvas.clientWidth * this.xRatio_,
      canvas.clientHeight * this.yRatio_);
  return olcs.core.pickOnTerrainOrEllipsoid(scene, point);
};


/**
 * (0, 0) is top-left, (0.5, 1) is bottom center.
 * @param {olcs.OLCesium} ol3d
 * @param {number} xRatio
 * @param {number} yRatio
 * @return {olcs.TransitionManager}
 * @api
 */
olcs.TransitionManager.createAroundPoint = function(ol3d, xRatio, yRatio) {
  return new olcs.TransitionManager(ol3d, xRatio, yRatio);
};


/**
 * (0, 0) is top-left, (0.5, 1) is bottom center.
 * @param {olcs.OLCesium} ol3d
 * @return {olcs.TransitionManager}
 * @api
 */
olcs.TransitionManager.createAroundBottomPoint = function(ol3d) {
  return olcs.TransitionManager.createAroundPoint(ol3d, 0.5, 1);
};


/**
 * @return {goog.Promise<?>}
 * @api
 */
olcs.TransitionManager.prototype.switchTo2D = function() {
  if (!this.ol3d_.getEnabled()) {
    return goog.Promise.reject();
  }
  var scene = this.ol3d_.getCesiumScene();
  var camera = scene.camera;
  var right = camera.right;
  var rotationPoint = this.pickPoint_();
  if (!rotationPoint) {
    return goog.Promise.reject();
  }
  var angle = olcs.core.computeAngleToZenith(scene, rotationPoint);
  var transform = Cesium.Matrix4.fromTranslation(rotationPoint);
  var promise = olcs.core.rotateAroundAxis(camera, -angle, right, transform);
  return promise.then(function() {
    this.ol3d_.setEnabled(false);
  }.bind(this));
};


/**
 * @param {number} angle Angle in degrees
 * @return {goog.Promise}
 * @api
 */
olcs.TransitionManager.prototype.switchTo3D = function(angle) {
  if (this.ol3d_.getEnabled()) {
    return goog.Promise.reject();
  }

  this.ol3d_.setEnabled(true);
  var scene = this.ol3d_.getCesiumScene();
  var camera = scene.camera;
  var right = camera.right;
  var rotationPoint = this.pickPoint_();
  if (!rotationPoint) {
    return goog.Promise.reject();
  }
  var transform = Cesium.Matrix4.fromTranslation(rotationPoint);
  angle = Cesium.Math.toRadians(angle);
  return olcs.core.rotateAroundAxis(camera, -angle, right, transform);
};
