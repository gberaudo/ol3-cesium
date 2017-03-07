ifeq ($(shell uname),Darwin)
	SEDI := $(shell which sed) -i ''
else
	SEDI := $(shell which sed) -i
endif
UNAME := $(shell uname)
SRC_JS_FILES := $(shell find src -type f -name '*.js')
OL_JS_FILES := $(shell find ol/src -type f -name '*.js')
EXAMPLES_JS_FILES := $(shell find examples -type f -name '*.js')
EXAMPLES_HTML_FILES := $(shell find examples -type f -name '*.html')
EXAMPLES_GEOJSON_FILES := $(shell find examples/data/ -name '*.geojson')
CESIUM_COMPILE_TARGET = minify

.PHONY: all
all: help

.PHONY: help
help:
	@echo "Usage: make <target>"
	@echo
	@echo "Main targets:"
	@echo
	@echo "- dist                    Create a "distribution" for the library (dist/olcesium.js)"
	@echo "- check                   Perform a number of checks on the code (lint, compile, etc.)"
	@echo "- lint                    Check the code with the linter"
	@echo "- serve                   Run a development web server for running the examples"
	@echo "- dist-examples           Create a "distribution" for the examples (dist/examples/)"
	@echo "- dist-apidoc             Create a "distribution" for the api docs (dist/apidoc/)"
	@echo "- clean                   Remove generated files"
	@echo "- cleanall                Remove all the build artefacts"
	@echo "- help                    Display this help message"
	@echo

.PHONY: npm-install
npm-install: .build/node_modules.timestamp

.PHONY: serve
serve: npm-install cesium/Build/Cesium/Cesium.js
	python -m SimpleHTTPServer 4000

.PHONY: dist
dist: dist/olcesium.js dist/olcesium-debug.js CHANGES.md
	cp CHANGES.md dist/

.PHONY: dist-examples
dist-examples: .build/dist-examples.timestamp

.PHONY: dist-apidoc
dist-apidoc:
	node node_modules/.bin/jsdoc -c build/jsdoc/api/conf.json -d dist/apidoc

.PHONY: lint
lint: .build/node_modules.timestamp .build/eslint.timestamp
	@build/check-no-goog.sh

.build/geojsonhint.timestamp: $(EXAMPLES_GEOJSON_FILES)
	$(foreach file,$?, echo $(file); node_modules/.bin/geojsonhint $(file);)
	touch $@

.PHONY: check
check: lint dist .build/geojsonhint.timestamp

.PHONY: clean
clean:
	rm -f dist/olcesium.js
	rm -f ol/build/ol.js
	rm -f ol/build/ol-debug.js
	rm -f ol/build/ol.css
	rm -rf cesium/Build/Cesium
	rm -rf cesium/Build/CesiumUnminified
	rm -rf dist/ol
	rm -rf dist/examples
	rm -rf dist/Cesium

.PHONY: cleanall
cleanall: clean
	rm -rf .build
	rm -rf node_modules

.build/node_modules.timestamp: package.json
	npm install
	mkdir -p $(dir $@)
	touch $@

.build/eslint.timestamp: $(SRC_JS_FILES)
	./node_modules/.bin/eslint $?
	touch $@

.build/dist-examples.timestamp: cesium/Build/Cesium/Cesium.js cesium/Build/CesiumUnminified/Cesium.js dist/olcesium.js $(EXAMPLES_JS_FILES) $(EXAMPLES_HTML_FILES)
	node build/parse-examples.js
	mkdir -p $(dir $@)
	cp -R cesium/Build/Cesium dist/
	cp -R cesium/Build/CesiumUnminified dist/
	cp -R examples dist/
	cp ol/css/ol.css dist/
	$(SEDI) 'sYDIST = falseYDIST = trueY' dist/examples/inject_ol_cesium.js
	$(SEDI) 'sY@loaderYolcesium.jsY' dist/examples/inject_ol_cesium.js
	$(SEDI) 'sY../cesium/Build/Y../Y' dist/examples/inject_ol_cesium.js
	for f in dist/examples/*.html; do $(SEDI) 'sY../ol/css/ol.cssY../ol.cssY' $$f; done
	touch $@

dist/olcesium-debug.js: build/olcesium-debug.json $(SRC_JS_FILES) Cesium.externs.js build/build.js npm-install
	mkdir -p $(dir $@)
	node build/build.js $< $@


ol/node_modules/rbush/package.json: ol/package.json
	(cd ol && npm install --production --ignore-scripts)

ol/build/ol.ext/rbush.js: ol/node_modules/rbush/package.json
	(cd ol && node tasks/build-ext.js)

.PHONY: .build/deps.js
.build/deps.js:
	python build/closure/depswriter.py \
    --root_with_prefix="src ../../src" \
    --root_with_prefix="ol ../../ol" \
    --root_with_prefix="ol/build/ol.ext ../../ol/build/ol.ext" \
    --output_file $@


# A sourcemap is prepared, the source is exected to be deployed in 'source' directory
dist/olcesium.js: $(SRC_JS_FILES) Cesium.externs.js npm-install ol/build/ol.ext/rbush.js
	mkdir -p $(dir $@)
	java \
    -server -XX:+TieredCompilation \
    -jar node_modules/google-closure-compiler/compiler.jar \
    --define=goog.SEAL_MODULE_EXPORTS=false \
    --define=goog.DEBUG=false \
    --define=ol.ENABLE_WEBGL=false \
    --externs=ol/externs/geojson.js \
    --externs=ol/externs/proj4js.js \
    --externs=ol/externs/jquery-1.9.js \
    --externs=ol/externs/tilejson.js \
    --externs=ol/externs/esrijson.js \
    --externs=ol/externs/bingmaps.js \
    --externs=ol/externs/cartodb.js \
    --externs=ol/externs/topojson.js \
    --js=ol/build/ol.ext/pbf.js \
    --js=ol/build/ol.ext/pixelworks.js \
    --js=ol/build/ol.ext/rbush.js \
    --js=ol/build/ol.ext/vectortile.js \
    --js=ol/externs/olx.js \
    --js=ol/externs/oli.js \
    --js=ol/src/**/*.js \
    --js=goog/**/*.js \
    --jscomp_error=* \
    --jscomp_off=lintChecks \
    --jscomp_off=analyzerChecks \
    --jscomp_off=extraRequire \
    --extra_annotation_name=api \
    --extra_annotation_name=observable \
    --compilation_level=ADVANCED \
    --export_local_property_definitions=true \
    --generate_exports=true \
    --language_in=ECMASCRIPT6_STRICT \
    --language_out=ECMASCRIPT5_STRICT \
    --isolation_mode=IIFE \
    --source_map_format=V3 \
    --use_types_for_optimization=true \
    --warning_level=VERBOSE \
    --create_source_map=dist/build.js.map \
    --output_manifest=dist/manifest.MF \
    --js_output_file=$@

	$(SEDI) 's!$(shell pwd)/dist!source!g' dist/olcesium.js.map
	$(SEDI) 's!$(shell pwd)!source!g' dist/olcesium.js.map
#	echo '//# sourceMappingURL=olcesium.js.map' >> dist/olcesium.js
#	-ln -s .. dist/source

cesium/node_modules/.bin/gulp: cesium/package.json
	cd cesium && npm install

# Only generated when cesium/Build/Cesium/Cesium.js does not exist
# or CHANGES.md changed
ifndef NO_CESIUM
cesium/Build/Cesium/Cesium.js: cesium/CHANGES.md cesium/node_modules/.bin/gulp
	(cd cesium && node_modules/.bin/gulp $(CESIUM_COMPILE_TARGET))
else
cesium/Build/Cesium/Cesium.js:
	mkdir -p cesium/Build/Cesium/
endif

# Only generated when cesium/Build/CesiumUnminified/Cesium.js does not exist
# or CHANGES.md changed
ifndef NO_CESIUM
cesium/Build/CesiumUnminified/Cesium.js: cesium/CHANGES.md cesium/node_modules/.bin/gulp
	(cd cesium && node_modules/.bin/gulp combine)
else
cesium/Build/CesiumUnminified/Cesium.js:
	mkdir -p cesium/Build/CesiumUnminified/
endif
