"use strict";

var map;
var canvasLayer;
var context;
var contextScale;
var resolutionScale;
var mapProjection;
var projectionScale = 2000;
var y_scale;

function initMap(div) {
  // Initialize Google Map
  resolutionScale = window.devicePixelRatio || 1;

  var mapOptions = {
    keyboardShortcuts: false,
    scaleControl: true,
    fullscreenControl: false,
    streetViewControl: false,
    zoom: 13,
    center: new google.maps.LatLng(40.500, -80.079)
  };
  map = new google.maps.Map(document.getElementById(div), mapOptions);

  // initialize the canvasLayer
  var canvasLayerOptions = {
    map: map,
    animate: false,
    updateHandler: repaintCanvasLayer,
    resolutionScale: resolutionScale
  };
  canvasLayer = new CanvasLayer(canvasLayerOptions);
  context = canvasLayer.canvas.getContext('2d');
  $("#map-legend").show();
  //window.addEventListener('resize', function () { google.maps.event.trigger(map, 'resize'); }, false);
}

function setupCanvasLayerProjection() {
  var canvasWidth = canvasLayer.canvas.width;
  var canvasHeight = canvasLayer.canvas.height;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvasWidth, canvasHeight);

  /* We need to scale and translate the map for current view.
   * see https://developers.google.com/maps/documentation/javascript/maptypes#MapCoordinates
   */
  mapProjection = map.getProjection();
  if (!mapProjection) return;

  /**
   * Clear transformation from last update by setting to identity matrix.
   * Could use context.resetTransform(), but most browsers don't support
   * it yet.
   */

  // scale is just 2^zoom
  // If canvasLayer is scaled (with resolutionScale), we need to scale by
  // the same amount to account for the larger canvas.
  contextScale = Math.pow(2, map.zoom) * resolutionScale / projectionScale;
  context.scale(contextScale, contextScale);

  /* If the map was not translated, the topLeft corner would be 0,0 in
   * world coordinates. Our translation is just the vector from the
   * world coordinate of the topLeft corder to 0,0.
   */
  var offset = mapProjection.fromLatLngToPoint(canvasLayer.getTopLeft());
  context.translate(-offset.x * projectionScale, -offset.y * projectionScale);
}

function paintPM25(site, channelName, epochTime) {
  var channel = site.channels[channelName];
  var rectLatLng = new google.maps.LatLng(site.coordinates.latitude, site.coordinates.longitude);
  var worldPoint = mapProjection.fromLatLngToPoint(rectLatLng);
  var x = worldPoint.x * projectionScale;
  var y = worldPoint.y * projectionScale;

  var bar_width = 5;
  var bar_scale = 0.5;
  context.font = '4px Arial';

  // How many pixels per mile?
  var offset1mile = mapProjection.fromLatLngToPoint(new google.maps.LatLng(site.coordinates.latitude + 0.014457067, site.coordinates.longitude));
  var unitsPerMile = 1000 * (worldPoint.y - offset1mile.y);

  y_scale = site.flip_y ? -1 : 1;

  var pm25 = getData(site, channel, epochTime);

  var siteDouble;
  if (site.feed_id == 4315) {
    siteDouble = esdr_feeds.Speck1b;
    channel = siteDouble.channels[channelName];
  } else if (site.feed_id == 4617) {
    siteDouble = esdr_feeds.Speck2b;
    channel = siteDouble.channels[channelName];
  } else if (site.feed_id == 4316) {
    siteDouble = esdr_feeds.Speck3b;
    channel = siteDouble.channels[channelName];
  }

  // If a site has 2 devices, take the average
  var numSites = 2;
  if (siteDouble) {
    var pm25_2 = getData(siteDouble, channel, epochTime);
    if (pm25_2 !== null && isFinite(pm25_2)) {
      if (pm25 === null || !isFinite(pm25)) {
        pm25 = 0;
        numSites -= 1;
      }
      pm25 = Math.round((pm25 + pm25_2) / numSites);
    }
  }

  if (pm25 !== null && isFinite(pm25)) {
    context.fillStyle = 'rgba(' + site.channels[channelName].graphMetaData.color + ', 1)';
    context.fillRect(x - bar_width, y, bar_width, -bar_scale * pm25 * y_scale);
    context.strokeStyle = 'black';
    context.lineWidth = 1.0 / contextScale;
    context.strokeRect(x - bar_width, y, bar_width, -bar_scale * pm25 * y_scale);
    context.fillText(pm25, x - bar_width - 0.1, y + y_scale * 2.2 + 1.5);
  }

  var wind_speed, wind_dir;
  if (site.channels.SONICWS_MPH) {
    wind_speed = getData(site, site.channels.SONICWS_MPH, epochTime);
    wind_dir = getData(site, site.channels.SONICWD_DEG, epochTime);
  }

  if (wind_speed && wind_dir) {
    x -= bar_width;
    if (wind_speed > 0.1) {
      var wind_dir_radians = wind_dir * Math.PI / 180;
      var dx = -Math.sin(wind_dir_radians);
      var dy =  Math.cos(wind_dir_radians);
      var d = 1;
      var length = unitsPerMile * wind_speed / 2;

      context.strokeStyle = '#0000ee';
      context.lineWidth = Math.max(2.0 / contextScale, d * 0.75);
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + (length - d * 1) * dx,
                     y + (length - d * 1) * dy);
      context.stroke();

      context.fillStyle = '#0000ee';
      context.beginPath();
      context.moveTo(x + length * dx,
                     y + length * dy);
      context.lineTo(x + (length - d * 3) * dx + d * 1.5 * dy,
                     y + (length - d * 3) * dy - d * 1.5 * dx);
      context.lineTo(x + (length - d * 3) * dx - d * 1.5 * dy,
                     y + (length - d * 3) * dy + d * 1.5 * dx);
      context.fill();

      // Black dot as base to wind vector
      context.fillStyle = 'black';
      context.beginPath();
      context.arc(x, y, 1.18, 0, 2 * Math.PI, false);
      context.fill();
    }
  }
}

function drawPlace(lat, lng) {
  var rectLatLng = new google.maps.LatLng(lat, lng);
  var worldPoint = mapProjection.fromLatLngToPoint(rectLatLng);
  var x = worldPoint.x * projectionScale;
  var y = worldPoint.y * projectionScale;

  context.fillStyle = 'red';
  context.beginPath();
  context.rect(x, y, 3, 3);
  //context.arc(x, y, 1.18, 0, 2 * Math.PI, false);
  context.fill();
}

function getData(site, channel, time) {
  //console.log('getData');

  var day = Math.floor(time / 86400);

  if (!site.requested_day[day]) {
    site.requested_day[day] = true;
    //console.log('Requesting ' + site.feed_id + ', day ' + day);
    var requestInfo = {
      feed_id : site.feed_id,
      api_key : site.api_key,
      start_time : day * 86400,
      end_time : (day + 1) * 86400,
      channels : Object.keys(site.channels).toString(),
      headers : null
    };
    requestEsdrExport(requestInfo, function(csvData) {
      parseEsdrCSV(csvData, site);
      //console.log('got that data');
      repaintCanvasLayer();
    });
  } else {
    //console.log('We have data for ' + site.feed_id + ', day ' + day);
    //console.log(channel);
    if (!channel) return null;
    if (channel.hourly) {
      time = Math.floor(time / 3600) * 3600;
      //console.log('Hourly; adjusted time to ' + time);
      var ret = channel.summary[time];
      //console.log('Value is ' + ret);
      return ret;
    } else {
      time = Math.round(time);
      // Search for data
      var search_dist = 45;  // 45 seconds
      //console.log('Searching for time ' + time + ', +/- ' + search_dist);
      //console.log(channel);
      for (var i = 0; i <= search_dist; i++) {
        if ((time + i) in channel.summary) {
          //console.log('found at time ' + (time + i));
          return channel.summary[time + i];
        }
        if ((time - i) in channel.summary) {
          //console.log('found at time ' + (time - i));
          return channel.summary[time - i];
        }
      }
      //console.log('could not find time in range');
      return null;
    }
  }
}

function repaintCanvasLayer() {
  try {
    //console.log('repaint');
    setupCanvasLayerProjection();
    // Date.parse() can only reliably parse RFC2822 or ISO 8601 dates.
    // The result is that parsing the capture time from Time Machine results in undefined.
    // Chrome (unlike FireFox or IE) is more lenient and will parse it correctly though.
    var epochTime = (new Date((timelapse.getCurrentCaptureTime()).replace(/-/g,"/")).getTime()) / 1000;

    paintPM25(esdr_feeds.ACHD_Avalon, 'PM25B_UG_M3', epochTime);
    // Draw Metalico plant
    drawPlace(40.506795, -80.105922);
  } catch(e) {
    //console.log(e);
  }
}
