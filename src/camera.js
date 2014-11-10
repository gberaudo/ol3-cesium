goog.provide('olcs.Camera');

goog.require('goog.events');
goog.require('ol.proj');
goog.require('olcs.core');



/**
 * This object takes care of additional 3d-specific properties of the view and
 * ensures proper synchronization with the underlying raw Cesium.Camera object.
 * @param {!Cesium.Scene} scene
 * @param {!ol.Map} map
 * @constructor
 * @api
 */
olcs.Camera = function(scene, map) {
  /**
   * @type {!Cesium.Scene}
   * @private
   */
  this.scene_ = scene;

  /**
   * @type {!Cesium.Camera}
   * @private
   */
  this.cam_ = scene.camera;

  /**
   * @type {!ol.Map}
   * @private
   */
  this.map_ = map;

  /**
   * @type {?ol.View}
   * @private
   */
  this.view_ = null;

  /**
   * @type {?goog.events.Key}
   * @private
   */
  this.viewListenKey_ = null;

  /**
   * @type {!ol.TransformFunction}
   * @private
   */
  this.toLonLat_ = ol.proj.identityTransform;

  /**
   * @type {!ol.TransformFunction}
   * @private
   */
  this.fromLonLat_ = ol.proj.identityTransform;

  /**
   * 0 -- topdown, PI/2 -- the horizon
   * @type {number}
   * @private
   */
  this.tilt_ = 0;

  /**
   * @type {number}
   * @private
   */
  this.distance_ = 0;

  /**
   * @type {?Cesium.Matrix4}
   * @private
   */
  this.lastCameraViewMatrix_ = null;

  /**
   * This is used to discard change events on view caused by updateView method.
   * @type {boolean}
   * @private
   */
  this.viewUpdateInProgress_ = false;

  this.map_.on('change:view', function(e) {
    this.setView_(this.map_.getView());
  }, this);
  this.setView_(this.map_.getView());
};


/**
 * @param {?ol.View} view New view to use.
 * @private
 */
olcs.Camera.prototype.setView_ = function(view) {
  if (!goog.isNull(this.view_)) {
    this.view_.unByKey(this.viewListenKey_);
    this.viewListenKey_ = null;
  }

  this.view_ = view;
  if (!goog.isNull(view)) {
    this.toLonLat_ = ol.proj.getTransform(view.getProjection(), 'EPSG:4326');
    this.fromLonLat_ = ol.proj.getTransform('EPSG:4326', view.getProjection());

    this.viewListenKey_ = view.on('propertychange',
                                  this.handleViewEvent_, this);
    this.readFromView();
  } else {
    this.toLonLat_ = ol.proj.identityTransform;
    this.fromLonLat_ = ol.proj.identityTransform;
  }
};


/**
 * @param {?} e
 * @private
 */
olcs.Camera.prototype.handleViewEvent_ = function(e) {
  if (!this.viewUpdateInProgress_) {
    this.readFromView();
  }
};


/**
 * @param {number} heading In radians.
 * @api
 */
olcs.Camera.prototype.setHeading = function(heading) {
  if (goog.isNull(this.view_)) {
    return;
  }

  this.view_.setRotation(heading);
};


/**
 * @return {number|undefined} Heading in radians.
 * @api
 */
olcs.Camera.prototype.getHeading = function() {
  if (goog.isNull(this.view_)) {
    return undefined;
  }
  var rotation = this.view_.getRotation();
  return goog.isDef(rotation) ? rotation : 0;
};


/**
 * @param {number} tilt In radians.
 * @api
 */
olcs.Camera.prototype.setTilt = function(tilt) {
  this.tilt_ = tilt;
  this.updateCamera_();
};


/**
 * @return {number} Tilt in radians.
 * @api
 */
olcs.Camera.prototype.getTilt = function() {
  return this.tilt_;
};


/**
 * @param {number} distance In meters.
 * @api
 */
olcs.Camera.prototype.setDistance = function(distance) {
  this.distance_ = distance;
  this.updateCamera_();
  this.updateView();
};


/**
 * @return {number} Distance in meters.
 * @api
 */
olcs.Camera.prototype.getDistance = function() {
  return this.distance_;
};


/**
 * Shortcut for ol.View.setCenter().
 * @param {!ol.Coordinate} center Same projection as the ol.View.
 * @api
 */
olcs.Camera.prototype.setCenter = function(center) {
  if (goog.isNull(this.view_)) {
    return;
  }
  this.view_.setCenter(center);
};


/**
 * Shortcut for ol.View.getCenter().
 * @return {ol.Coordinate|undefined} Same projection as the ol.View.
 * @api
 */
olcs.Camera.prototype.getCenter = function() {
  if (goog.isNull(this.view_)) {
    return undefined;
  }
  return this.view_.getCenter();
};


/**
 * Sets the position of the camera.
 * @param {!ol.Coordinate} position Same projection as the ol.View.
 * @api
 */
olcs.Camera.prototype.setPosition = function(position) {
  if (goog.isNull(this.toLonLat_)) {
    return;
  }
  var ll = this.toLonLat_(position);
  goog.asserts.assert(!goog.isNull(ll));

  var carto = new Cesium.Cartographic(goog.math.toRadians(ll[0]),
                                      goog.math.toRadians(ll[1]),
                                      this.getAltitude());

  this.cam_.position = Cesium.Ellipsoid.WGS84.cartographicToCartesian(carto);
  this.updateView();
};


/**
 * Calculates position under the camera.
 * @return {!ol.Coordinate|undefined} Same projection as the ol.View.
 * @api
 */
olcs.Camera.prototype.getPosition = function() {
  if (goog.isNull(this.fromLonLat_)) {
    return undefined;
  }
  var carto = Cesium.Ellipsoid.WGS84.cartesianToCartographic(
      this.cam_.position);

  var pos = this.fromLonLat_([goog.math.toDegrees(carto.longitude),
                              goog.math.toDegrees(carto.latitude)]);
  goog.asserts.assert(!goog.isNull(pos));
  return pos;
};


/**
 * @param {number} altitude In meters.
 * @api
 */
olcs.Camera.prototype.setAltitude = function(altitude) {
  var carto = Cesium.Ellipsoid.WGS84.cartesianToCartographic(
      this.cam_.position);
  carto.height = altitude;
  this.cam_.position = Cesium.Ellipsoid.WGS84.cartographicToCartesian(carto);

  this.updateView();
};


/**
 * @return {number} Altitude in meters.
 * @api
 */
olcs.Camera.prototype.getAltitude = function() {
  var carto = Cesium.Ellipsoid.WGS84.cartesianToCartographic(
      this.cam_.position);

  return carto.height;
};


/**
 * Rotates the camera to point at the specified target.
 * @param {!ol.Coordinate} position Same projection as the ol.View.
 * @api
 */
olcs.Camera.prototype.lookAt = function(position) {
  if (goog.isNull(this.toLonLat_)) {
    return;
  }
  var ll = this.toLonLat_(position);
  goog.asserts.assert(!goog.isNull(ll));

  var carto = Cesium.Cartographic.fromDegrees(ll[0], ll[1]);
  olcs.core.lookAt(this.cam_, carto, this.scene_.globe);

  this.updateView();
};


/**
 * Updates the state of the underlying Cesium.Camera
 * according to the current values of the properties.
 * @private
 */
olcs.Camera.prototype.updateCamera_ = function() {
  if (goog.isNull(this.view_) || goog.isNull(this.toLonLat_)) {
    return;
  }
  var center = this.view_.getCenter();
  if (!goog.isDefAndNotNull(center)) {
    return;
  }
  var ll = this.toLonLat_(center);
  goog.asserts.assert(!goog.isNull(ll));

  var carto = new Cesium.Cartographic(goog.math.toRadians(ll[0]),
                                      goog.math.toRadians(ll[1]));
  if (this.scene_.globe) {
    var height = this.scene_.globe.getHeight(carto);
    carto.height = goog.isDef(height) ? height : 0;
  }
  this.cam_.setPositionCartographic(carto);

  var rotation = this.view_.getRotation();
  this.cam_.twistLeft(goog.isDef(rotation) ? rotation : 0);
  if (this.tilt_) {
    this.cam_.lookUp(this.tilt_);
  }
  this.cam_.moveBackward(this.distance_);

  this.checkCameraChange(true);
};


/**
 * Calculates the values of the properties from the current ol.View state.
 */
olcs.Camera.prototype.readFromView = function() {
  if (goog.isNull(this.view_) || goog.isNull(this.toLonLat_)) {
    return;
  }
  var center = this.view_.getCenter();
  if (!center) {
    return;
  }

  var mapSize = this.map_.getSize();
  if (!mapSize) {
    return;
  }
  // Get the ol3 extent of the view.
  var extent = this.view_.calculateExtent(mapSize);
  if (!extent) {
    return;
  }
  this.distance_ = this.calcDistanceForResolution_(extent);

  this.updateCamera_();
};


/**
 * Calculates the values of the properties from the current Cesium.Camera state.
 * Modifies the center, resolution and rotation properties of the view.
 * @api
 */
olcs.Camera.prototype.updateView = function() {
  var scene = this.scene_;
  var ellipsoid = Cesium.Ellipsoid.WGS84;

  if (goog.isNull(this.view_) || goog.isNull(this.fromLonLat_)) {
    return;
  }

  var centerPoint = olcs.core.pickCenterPoint(scene);
  var bottomPoint = olcs.core.pickBottomPoint(scene);
  if (!centerPoint || !bottomPoint) {
    return;
  }

  this.viewUpdateInProgress_ = true;
  // target & distance
  var centerCarto = ellipsoid.cartesianToCartographic(centerPoint);
  this.view_.setCenter(this.fromLonLat_([
    goog.math.toDegrees(centerCarto.longitude),
    goog.math.toDegrees(centerCarto.latitude)]));

  // resolution
  var resolution = this.calcResolutionForDistance_(centerPoint, bottomPoint);
  this.view_.setResolution(resolution);


  var target = centerPoint;
  /*
   * Since we are positioning the target, the values of heading and tilt
   * need to be calculated _at the target_.
   */
  if (target) {
    var pos = this.cam_.position;

    // normal to the ellipsoid at the target
    var targetNormal = new Cesium.Cartesian3();
    ellipsoid.geocentricSurfaceNormal(target, targetNormal);

    // vector from the target to the camera
    var targetToCamera = new Cesium.Cartesian3();
    Cesium.Cartesian3.subtract(pos, target, targetToCamera);
    Cesium.Cartesian3.normalize(targetToCamera, targetToCamera);


    // HEADING
    var normal = new Cesium.Cartesian3(-target.y, target.x, 0);
    var heading = Cesium.Cartesian3.angleBetween(this.cam_.right, normal);
    var orientation = Cesium.Cartesian3.cross(target, this.cam_.up,
                                              new Cesium.Cartesian3()).z;

    this.view_.setRotation((orientation < 0 ? heading : -heading));

    // TILT
    var tiltAngle = Math.acos(
        Cesium.Cartesian3.dot(targetNormal, targetToCamera));
    this.tilt_ = isNaN(tiltAngle) ? 0 : tiltAngle;
  } else {
    // fallback when there is no target
    this.view_.setRotation(this.cam_.heading);
    this.tilt_ = -this.cam_.tilt + Math.PI / 2;
  }

  this.viewUpdateInProgress_ = false;
};


/**
 * Check if the underlying camera state has changed and ensure synchronization.
 * @param {boolean=} opt_dontSync Do not synchronize the view.
 */
olcs.Camera.prototype.checkCameraChange = function(opt_dontSync) {
  var viewMatrix = this.cam_.viewMatrix;
  if (!this.lastCameraViewMatrix_ ||
      !this.lastCameraViewMatrix_.equals(viewMatrix)) {
    this.lastCameraViewMatrix_ = viewMatrix.clone();
    if (opt_dontSync !== true) {
      this.updateView();
    }
  }
};


/**
 * Elevation needed to view the same height as the OpenLayers view.
 * This calculation takes the ellipsoid into account but not the terrain.
 * @param {!ol.Extent} extent The calculated map extent.
 * @return {number} The needed elevation above ellipsoid.
 * @private
 */
olcs.Camera.prototype.calcDistanceForResolution_ = function(extent) {
  ol.extent.applyTransform(extent, this.toLonLat_, extent);

  // Take the top and bottom coordinates at the center of the extent
  // and compute the straight distance in meters between them.
  var topCenter = Cesium.Cartesian3.fromDegrees(
      (extent[0] + extent[2]) / 2,
      extent[3]);
  var bottomCenter = Cesium.Cartesian3.fromDegrees(
      (extent[0] + extent[2]) / 2,
      extent[1]);
  var visibleHeightMeters = Cesium.Cartesian3.distance(bottomCenter, topCenter);

  // Take the center of the extent and scale it to the ellipsoid.
  // Then compute the distance between these two points.
  var center = new Cesium.Cartesian3();
  var ellipsoid = Cesium.Ellipsoid.WGS84;
  center = Cesium.Cartesian3.lerp(topCenter, bottomCenter, 0.5, center);
  var centerOnEllipsoid = center.clone();
  ellipsoid.scaleToGeodeticSurface(centerOnEllipsoid, centerOnEllipsoid);
  var centerToEllipsoid = Cesium.Cartesian3.distance(center, centerOnEllipsoid);

  // distance required to view the calculated length in meters
  //
  //  fovy/2
  //    |\
  //  x | \
  //    |--\
  // visibleHeightMeters/2
  var fovy = this.cam_.frustum.fovy; // vertical field of view
  var cameraToCenter = (visibleHeightMeters / 2) / Math.tan(fovy / 2);

  var requiredDistance = cameraToCenter - centerToEllipsoid;
  return requiredDistance;
};


/**
 * @param {Cesium.Cartesian3} center
 * @param {Cesium.Cartesian3} bottom
 * @return {number} The calculated resolution.
 * @private
 */
olcs.Camera.prototype.calcResolutionForDistance_ = function(center, bottom) {
  // See the reverse calculation (calcDistanceForResolution_) for details
  var ellipsoid = Cesium.Ellipsoid.WGS84;

  var bottomCarto = ellipsoid.cartesianToCartographic(bottom);
  var centerCarto = ellipsoid.cartesianToCartographic(center);
  var extent = [
    Cesium.Math.toDegrees(bottomCarto.longitude),
    Cesium.Math.toDegrees(bottomCarto.latitude),
    Cesium.Math.toDegrees(centerCarto.longitude),
    Cesium.Math.toDegrees(centerCarto.latitude)
  ];
  ol.extent.applyTransform(extent, this.fromLonLat_, extent);

  var mapSize = this.map_.getSize();
  var yResolution = 2 * ol.extent.getHeight(extent) / mapSize[1];

  return yResolution;
};
