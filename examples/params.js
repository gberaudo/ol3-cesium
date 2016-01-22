var searchParams = {}
window.location.search.substring(1).split("&").forEach(function(item) {
  var splitted = item.split("=");
  searchParams[splitted[0]] = splitted[1];
});

function hasSearchParam(key) {
  return searchParams[key] !== undefined;
}


function getStringSearchParam(key, defValue) {
  var value = searchParams[key];
  return value !== undefined ? value : defValue;
}


function getIntSearchParam(key, defValue) {
  var value = searchParams[key];
  return value !== undefined ? parseInt(value, 10) : defValue;
}


function getBoolSearchParam(key, defValue) {
  var value = searchParams[key];
  if (value === undefined) {
    return defValue;
  }
  return value === 'true' || value === '1';
}
