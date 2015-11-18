#!/bin/bash

paths=''
params=''
globals=''
used=`grep -Rn --exclude CesiumStartup.js 'Cesium\.[a-zA-Z0-9\.]' examples/ src/ | sed 's/.*\(Cesium\.[a-zA-Z0-9\.]*\).*/\1/' | sort | uniq`

for jsfull in `ls cesium/Source/Core/*.js cesium/Source/Scene/*.js cesium/Source/DataSources/*.js`; do
  jsname=`basename $jsfull | sed 's/.js//g'`
  jsdir="`dirname $jsfull | sed 'sYcesium/SourceYCesiumY'`/$jsname"

  if [[ $used == *"$jsname"* ]]
  then
    paths="$paths, '$jsdir'"
    params="$params, $jsname" 
    globals="$globals, $jsname: $jsname" 
  fi
done

paths="${paths:2:${#paths}}"
params="${params:2:${#params}}"
globals="${globals:2:${#globals}}"

cat > examples/CesiumStartup.js <<EOF
var s = document.location.pathname.split('/');
var example = s[s.length - 1].split('.')[0];

require({
    baseUrl: '.',
    paths: {
        domReady: '../cesium/ThirdParty/requirejs-2.1.20/domReady',
        Cesium: '../cesium/Source'
    }
}, [ $paths ],
   function($params) {
      window.Cesium = {$globals};
      window.setTimeout(function() {
        var script = document.createElement('script');
        script.setAttribute('type', 'text/javascript');
        script.setAttribute('src', document.location.origin + '/examples/' + example + '.js');
        document.getElementsByTagName('body')[0].appendChild(script);
      }, 50);
  }
);
EOF
