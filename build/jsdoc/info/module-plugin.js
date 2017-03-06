var moduleMatcher = /goog\.module\('(.*)'\)/;
var requireMatcher = /(const|let|var) (.*) = goog\.require\('(.*)'\)/;

var currentModule;
var currentRequires;
var MAX_LINES_TO_SEARCH = 100; // empirical limit

exports.handlers = {
  beforeParse: function(e) {
    currentRequires = {};
    currentModule = null;
    var lines = String(e.source).split('\n');
    for (var i = 0, ii = Math.min(lines.length, MAX_LINES_TO_SEARCH); i < ii; i++) {
      var line = lines[i];
      var matchModule = line.match(moduleMatcher);
      if (matchModule) {
        currentModule = matchModule[1];
      }
      var matchRequire = line.match(requireMatcher);
      if (matchRequire) {
        currentRequires[matchRequire[2]] = matchRequire[3];
      }
    }
  },
  newDoclet: function(e) {
    var doclet = e.doclet;
    if (currentModule) { // also do for non @api methods
      // Doclets in modules are messed up due to jsdoc trying to handle
      // assignments to 'exports' or properties from 'exports'.
      doclet.module = currentModule;

      // replace extends local name by the required name
      if (doclet.augments) {
        doclet.augments = doclet.augments.map(function(augment) {
          return currentRequires[augment] ? currentRequires[augment] : augment;
        });
      }
      if (!doclet.longname) {
        // module constructor
        doclet.longname = currentModule;
        doclet.name = currentModule;
      } else if (doclet.name === doclet.longname) {
        doclet.scope = 'instance';
        // module constructor method
        if(doclet.name[0] !== '#') {
          if (doclet.kind === 'function') {
            // case ol.color.asArray
            doclet.longname = doclet.module + '.' + doclet.name;
          } else {
            // member
            // case of ol.CollectionEvent#element
            doclet.longname = doclet.module + '#' + doclet.name;
          }
        } else {
          // inherited or overriden method from base class
          // case ol.Base#toOverride, ol.Base#onlyBase
          doclet.name = doclet.name.substr(1);
          doclet.longname = doclet.module + '#' + doclet.name;
        }
        if (typeof doclet.memberof !== undefined) {
          doclet.memberof = doclet.module;
        }
      }
    }
  }
};
