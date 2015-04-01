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
    scaleControl: true,
    zoom: 13,
    center: new google.maps.LatLng(40.495, -80.079)
  };
  map = new google.maps.Map(document.getElementById(div), mapOptions);

  // initialize the canvasLayer
  var canvasLayerOptions = {
    map: map,
    //resizeHandler: resize,
    animate: false,
    updateHandler: repaintCanvasLayer,
    resolutionScale: resolutionScale
  };
  canvasLayer = new CanvasLayer(canvasLayerOptions);
  context = canvasLayer.canvas.getContext('2d');
  window.addEventListener('resize', function () {  google.maps.event.trigger(map, 'resize'); }, false);
}

var sites = [
              {
                name: "Avalon ACHD",
                latitude: 40.499767, longitude: -80.071337,
                channels:["SONICWS_MPH", "PM25B_UG_M3", "SONICWD_DEG"]
              }
            ];

function setupCanvasLayerProjection() {
  var canvasWidth = canvasLayer.canvas.width;
  var canvasHeight = canvasLayer.canvas.height;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvasWidth, canvasHeight);
  if (!sites) return;

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

  // How many pixels per mile?
  var offset1mile = mapProjection.fromLatLngToPoint(new google.maps.LatLng(site.coordinates.latitude + 0.014457067, site.coordinates.longitude));
  var unitsPerMile = projectionScale * (worldPoint.y - offset1mile.y);

  var bar_width = 5;
  var bar_scale = 0.5;
  context.font = '4px Arial';

  y_scale = site['flip_y'] ? -1 : 1;

  var pm25 = getData(site, channel, epochTime);

  if (pm25 != null) {
    context.fillStyle = 'rgba(' + site.channels[channelName].graphMetaData.color + ', 1)';
    context.fillRect(x - bar_width, y, bar_width, -bar_scale * pm25 * y_scale);
    context.strokeStyle = 'black';
    context.lineWidth = 1.0 / contextScale;
    context.strokeRect(x - bar_width, y, bar_width, -bar_scale * pm25 * y_scale);
    //context.fillStyle = 'rgba(' + site.channels[channelName].graphMetaData.color + ', 1)';
    context.fillText(pm25, x - bar_width - 0.1, y + y_scale * 2.2 + 1.5);
  }

//
//      var pm10 = find_channel(site, 'PM10');
//      if (pm10 && pm10[i] != null) {
//        context.fillStyle = 'rgba(255, 0, 0, 1)';
//        context.fillRect(x, y, bar_width, -bar_scale * pm10[i] * y_scale);
//        context.strokeStyle = 'black';
//        context.lineWidth = 1.0 / scale;
//        context.strokeRect(x, y, bar_width, -bar_scale * pm10[i] * y_scale);
//        context.fillStyle = 'rgba(200, 0, 0, 1)';
//        context.fillText(pm10[i], x + 0.5, y + y_scale * 2.2 + 1.5);
//      }
//
//      var wind_speed = find_channel_suffix(site, 'WS_MPH');
//      var wind_dir = find_channel_suffix(site, 'WD_DEG');
//      // How to interpret wind direction:
//      // Avalon, when smelly, tends to have winds from the West or Southwest
//      // Fri 13 Feb 2015, 16:00, WSW, heading 246
//      // Direction wind is coming _from_
//      //    0
//      // 270 90
//      //   180
//
//      if (displayArrows && wind_speed && wind_dir) {
//        if (wind_speed[i] > .1) {
//          var wind_dir_radians = wind_dir[i] * Math.PI / 180;
//          var dx = -Math.sin(wind_dir_radians);
//          var dy =  Math.cos(wind_dir_radians);
//          var d = 1;
//          var length = unitsPerMile * wind_speed[i] / 2;
//          context.strokeStyle = '#0000ee';
//          context.lineWidth = Math.max(2.0 / scale, d * 0.75);
//          context.beginPath();
//          context.moveTo(x, y);
//          context.lineTo(x + (length - d * 1) * dx,
//                         y + (length - d * 1) * dy);
//          context.stroke();
//
//          context.fillStyle = '#0000ee';
//          context.beginPath();
//          context.moveTo(x + length * dx,
//                         y + length * dy);
//          context.lineTo(x + (length - d * 3) * dx + d * 1.5 * dy,
//                         y + (length - d * 3) * dy - d * 1.5 * dx);
//          context.lineTo(x + (length - d * 3) * dx - d * 1.5 * dy,
//                         y + (length - d * 3) * dy + d * 1.5 * dx);
//          context.fill();
//        }
//      }
//
//      if (pm25 || pm10 || (displayArrows && wind_speed && wind_dir)) {
//        context.fillStyle = 'black';
//        context.beginPath();
//        context.arc(x, y, 1, 0, 2 * Math.PI, false);
//        context.fill();
//      }
//    }
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
    if (channel.hourly) {
      time = Math.floor((time - 1800) / 3600) * 3600 + 1800;
      //console.log('Hourly; adjusted time to ' + time);
      var ret = channel.summary[time];
      //console.log('Value is ' + ret);
      return ret;
    } else {
      time = Math.round(time);
      // Search for data
      var search_dist = 45;  // 45 seconds
      //console.log('Searching for time ' + time + ', +/- ' + search_dist);
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
    paintPM25(esdr_feeds.Speck1, 'particle_concentration', epochTime);
    paintPM25(esdr_feeds.Speck2, 'particle_concentration', epochTime);
    paintPM25(esdr_feeds.Speck3, 'particle_concentration', epochTime);
  } catch(e) {

  }
}
