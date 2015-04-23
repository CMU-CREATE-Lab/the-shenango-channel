"use strict";

var smellCanvasLayer, smellCanvasContext;
var rootGDocUrl = "http://docs-proxy.cmucreatelab.org/spreadsheets/d";
var ratingColors = ["green", "#f8e540", "#da8800", "#b00404", "black-red"];
var tweleveHoursInSecs = 43200;
var smellReporterArray = [];
var commentData = [];
var commentDataByRating;
var smellReportPrependText = " out of 5 rating. "
var smellData = {
  "LA": {
    id: "16YI2PPXCWgqC0RL8LcAFlHqcnHoaVuo_5n4EHrUFmVI",
    gid: "1223544075",
    data: {
      timestamps: {}
    }
  },
  "KK": {
    id: "1rAGHhBnDUc9XtLVGRH9BewhPJt3Jg9ozwcz0sQPXUXg",
    gid: "1003642613",
    data: {
      timestamps: {}
    }
  },
  "TP": {
    id: "1v_HTV9MsYqGqGpl3qAkpzi9lnH3E_X8oJc6PyshF8Y4",
    gid: "747035212",
    data: {
      timestamps: {}
    }
  },
  "CH": {
    id: "1x6nSP8Xojtn_HsHlHTE5SfqPZrLHLTGBSnK44dgBlmE",
    gid: "913518689",
    data: {
      timestamps: {}
    }
  },
  "DW": {
    id: "1FyAUwPOquvM_Aqp4WhzuxvavXcfae92DkiPki3X2VBQ",
    gid: "550601991",
    data: {
      timestamps: {}
    }
  },
  "MB": {
    id: "",
    gid: "",
    data: {
      timestamps: {}
    }
  },
  "AT": {
    id: "",
    gid: "",
    data: {
      timestamps: {}
    }
  },
  "KG": {
    id: "",
    gid: "",
    data: {
      timestamps: {}
    }
  },
};

function initSmells() {
  // initialize the canvasLayer
  //console.log("init smells");
  var smellCanvasLayerOptions = {
    map: map,
    animate: false,
    updateHandler: repaintSmellCanvasLayer,
    resolutionScale: resolutionScale
  };
  smellCanvasLayer = new CanvasLayer(smellCanvasLayerOptions);
  smellCanvasContext = smellCanvasLayer.canvas.getContext('2d');
  smellReporterArray = Object.keys(smellData);

  for (var i = 0; i < smellReporterArray.length; i++) {
    (function(i){
      var smellReports = smellData[smellReporterArray[i]];
      if (!smellReports.id) return;
      $.ajax({
        url: rootGDocUrl + "/" + smellReports.id + "/export?format=tsv&id=" + smellReports.id + "&gid=" + smellReports.gid,
        success: function(json) {
          parseGDocCSV(smellReports, json);
        }
      });
    })(i);
  }
}

function parseGDocCSV(smellReports, csvData) {
  var csvArray = csvData.split("\n");
  var headingsArray = csvArray[0].split("\t");
  // First row is the CSV headers, which we took care of above, so start at 1.
  for (var i = 1; i < csvArray.length; i++) {
    var csvLineAsArray = csvArray[i].split("\t");
    if (!csvLineAsArray[0]) continue;
    var epochTime = (new Date((csvLineAsArray[0]).replace(/-/g, "/")).getTime()) / 1000;
    smellReports.data.timestamps[epochTime] = {
      rating: csvLineAsArray[1],
      notes: csvLineAsArray[2].trim(),
      latLng: (csvLineAsArray[csvLineAsArray.length - 1] ? csvLineAsArray[csvLineAsArray.length - 1] : headingsArray[headingsArray.length - 1])
    };
  }
}

function setupSmellCanvasLayerProjection() {
  var canvasWidth = smellCanvasLayer.canvas.width;
  var canvasHeight = smellCanvasLayer.canvas.height;
  smellCanvasContext.setTransform(1, 0, 0, 1, 0, 0);
  smellCanvasContext.clearRect(0, 0, canvasWidth, canvasHeight);

  /* We need to scale and translate the map for current view.
   * see https://developers.google.com/maps/documentation/javascript/maptypes#MapCoordinates
   */
  //mapProjection = map.getProjection();
  if (!mapProjection) return;

  /**
   * Clear transformation from last update by setting to identity matrix.
   * Could use context.resetTransform(), but most browsers don't support
   * it yet.
   */

  // scale is just 2^zoom
  // If canvasLayer is scaled (with resolutionScale), we need to scale by
  // the same amount to account for the larger canvas.
  //contextScale = Math.pow(2, map.zoom) * resolutionScale / projectionScale;
  smellCanvasContext.scale(contextScale, contextScale);

  /* If the map was not translated, the topLeft corner would be 0,0 in
   * world coordinates. Our translation is just the vector from the
   * world coordinate of the topLeft corner to 0,0.
   */
  var offset = mapProjection.fromLatLngToPoint(smellCanvasLayer.getTopLeft());
  smellCanvasContext.translate(-offset.x * projectionScale, -offset.y * projectionScale);
}

function sortingFunction(a, b) {
  if (a[0] > b[0]) {
    return 1;
  }
  if (a[0] < b[0]) {
    return -1;
  }
  return 0;
}

function addSmellReportsToGrapher() {
  commentDataByRating = {
    "1" : [],
    "2" : [],
    "3" : [],
    "4" : [],
    "5" : []
  };
  commentData = [];

  for (var i = 0; i < smellReporterArray.length; i++) {
    var smellReports = smellData[smellReporterArray[i]].data.timestamps;
    if (!smellReports) continue;
    for (var timestamp in smellReports) {
      var mean = 1;
      // TODO: Deal with comment overlaps
      //var dataPoint = findPoint(timestamp);
      //if (dataPoint) mean = 1.1
      var notes = smellReports[timestamp].rating + smellReportPrependText + smellReports[timestamp].notes;
      var dataObj = [timestamp, mean, 0, 1, ((new Date(timestamp * 1000)).toTimeString().substring(0,8)) + " - " + notes, smellReports[timestamp].latLng];
      commentDataByRating[smellReports[timestamp].rating].push(dataObj);
      commentData.push(dataObj);
    }
  }

  commentData.sort(sortingFunction);

  // Add chart
  var i = series.length;
  series[i] = {};
  series[i].id = i;
  var commentNumberAxis;
  var plots = [];
  var lastHighlightDate = null;

  for (var rating in commentDataByRating) {
    (function(rating){
      commentDataByRating[rating].sort(sortingFunction);

      var commentDatasource = function(level, offset, successCallback) {
        var json = {
           "fields" : ["time", "mean", "stddev", "count", "comment"],
           "level" : level,
           "offset" : offset,
           "sample_width" : Math.pow(2, level),
           "data" : commentDataByRating[rating],
           "type" : "value"
        };
        successCallback(JSON.stringify(json));
      };

      if ($(".annotationChart").length === 0) {
        var row = $('<tr class="annotationChart grapher_row"></tr>');
        row.append('<td id="series' + i + '" class="annotationContent"></td>');
        row.append('<td class="annotationChartTitle" style="color: black; background:white">Smell Reports</td>');
        row.append('<td id="series' + i + 'axis" class="annotationChartAxis" style="display: none"></td>');
        $('#dateAxisContainer').after(row);
        commentNumberAxis = new NumberAxis('series' + i + 'axis', "vertical");
      }

      series[i].axis = commentNumberAxis;

      var plot = new DataSeriesPlot(commentDatasource, dateAxis, series[i].axis, {});

      plot.addDataPointListener(function(pointData, event) {
        if (pointData && event && event.actionName == "highlight") {
          lastHighlightDate = pointData.date;
        } else if (event && event.actionName == "click") {
          dateAxis.setCursorPosition(null);
          if (lastHighlightDate !== pointData.date) return;
          var selectedPoint = findPoint(pointData.date);
          if (selectedPoint) {
            var latLngArray = selectedPoint[selectedPoint.length - 1].split(",");
            var latLng = new google.maps.LatLng(latLngArray[0], latLngArray[1]);
            map.panTo(latLng);
            map.setZoom(14);
          }
          var pointDataDateObj = new Date(pointData.dateString.split(".")[0]);
          var commentDate = $.datepicker.formatDate('yy-mm-dd', pointDataDateObj);
          if (commentDate != currentDate) {
            var path = cached_breathecam.datasets[commentDate];
            var currentView = timelapse.getView();
            currentDate = commentDate;
            timelapse.loadTimelapse(path, currentView, null, null, pointDataDateObj, function() {
              var closestDesiredFrame = timelapse.findExactOrClosestCaptureTime(pointData.dateString, "up");
              timelapse.seekToFrame(closestDesiredFrame);
            });
            $("#datepicker").datepicker("setDate", pointDataDateObj);
          } else {
            var closestDesiredFrame = timelapse.findExactOrClosestCaptureTime(pointData.dateString, "up");
            timelapse.seekToFrame(closestDesiredFrame);
          }
        }
      });

      var ratingColor = ratingColors[rating - 1];
      var pointFill, pointColor;
      if (ratingColor == "black-red") {
        pointFill = "black";
        pointColor = "red";
      } else {
        pointFill = ratingColor;
        pointColor = ratingColor;
      }

      plot.setStyle({
        "styles" : [
          {
             "type" : "point",
             "color" : pointFill,
             "fillColor" : pointColor,
             "radius" : 7,
             "fill" : true
          }
        ],
        "comments" : {
          "show" : true,
          "styles" : [
             {
                "type" : "point",
                "lineWidth" : 2,
                "radius" : 2,
                "fill" : true,
                "color" : pointFill,
                "fillColor" : pointFill,
                "show" : true
             }
          ]
        },
        "highlight" : {
          "lineWidth" : 2,
          "styles" : [
             {
                "type" : "point",
                "color" : pointColor,
                "fillColor" : pointFill,
                "radius" : 10,
                "fill" : true
             }
          ]
        }
      });
      plots.push(plot);
      series[i].p = plots;
    })(rating);


  }
  series[i].pc = new PlotContainer("series" + i, false, plots);
  setSizes();
}

function findPoint(searchElement) {
  var minIndex = 0;
  var maxIndex = commentData.length - 1;
  var currentIndex;
  var currentElement;
  while (minIndex <= maxIndex) {
    currentIndex = (minIndex + maxIndex) / 2 | 0;
    currentElement = commentData[currentIndex][0];
    if (currentElement < searchElement) {
      minIndex = currentIndex + 1;
    } else if (currentElement > searchElement) {
      maxIndex = currentIndex - 1;
    } else {
      return commentData[currentIndex];
    }
  }
  return null;
}

function repaintSmellCanvasLayer() {
  //console.log('draw smells');
  var captureTime = timelapse.getCurrentCaptureTime();

  if (!captureTime) return;

  setupSmellCanvasLayerProjection();

  var radius = 2;
  var epochTime = (new Date(captureTime.replace(/-/g,"/")).getTime()) / 1000;

  for (var i = 0; i < smellReporterArray.length; i++) {
    var smellReporterData = smellData[smellReporterArray[i]].data;
    if (!smellReporterData) continue;
    var times = Object.keys(smellReporterData.timestamps);
    for (var j = 0; j < times.length; j++) {
      var smellTime = parseInt(times[j]);
      if (epochTime >= smellTime && epochTime <= (smellTime + tweleveHoursInSecs)) {
        var timeDiff = Math.abs((smellTime + tweleveHoursInSecs) - (epochTime + tweleveHoursInSecs));
        var smellReport = smellReporterData.timestamps[times[j]];
        var latLngArray = smellReport.latLng.split(",");
        var latLng = new google.maps.LatLng(latLngArray[0], latLngArray[1]);
        var worldPoint = mapProjection.fromLatLngToPoint(latLng);
        var centerX = worldPoint.x * projectionScale;
        var centerY = worldPoint.y * projectionScale;
        smellCanvasContext.beginPath();
        smellCanvasContext.globalAlpha = 1 - (Math.ceil(timeDiff / tweleveHoursInSecs * 10) / 10);
        var fillColor = ratingColors[smellReport.rating - 1];
        if (fillColor == "black-red") {
          fillColor = smellCanvasContext.createRadialGradient(centerX, centerY, radius, centerX, centerY, 1);
          fillColor.addColorStop(0, 'red');
          fillColor.addColorStop(1, 'black');
        }
        smellCanvasContext.fillStyle = fillColor;
        smellCanvasContext.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
        smellCanvasContext.fill();

        // Added text box next to smell circle
        var txt = smellReport.rating + smellReportPrependText + smellReport.notes;
        if (txt && smellCanvasContext.globalAlpha > 0) {
          smellCanvasContext.globalAlpha = 1;
          smellCanvasContext.fillStyle = 'white';
          smellCanvasContext.font = "1.3pt Custom-Calibri";
          smellCanvasContext.textBaseline = 'top';
          var words = txt.split(' ');
          var line = '';
          var xPos = centerX;
          var yPos = centerY;
          var extra = centerY;
          var testLine, metrics, testWidth;

          // Determine text box height
          for (var n = 0; n < words.length; n++) {
            testLine = line + words[n] + ' ';
            metrics = smellCanvasContext.measureText(testLine);
            testWidth = metrics.width;
            if (testWidth > 14 && n > 0) {
              line = words[n] + ' ';
              yPos += 1.8;
            } else {
              line = testLine;
            }
          }

          // Determine text box width
          var boxWidth = smellCanvasContext.measureText(txt).width + 0.45;
          if (boxWidth > 13.8) boxWidth = 13.8;

          // Set box width and height
          smellCanvasContext.fillRect(centerX - 0.2, centerY, boxWidth, (yPos - extra + 3.0));
          smellCanvasContext.fillStyle = 'black';

          // Draw text with word wrap
          words = txt.split(' ');
          line = '';
          yPos = centerY;
          for (var n = 0; n < words.length; n++) {
            testLine = line + words[n] + ' ';
            metrics = smellCanvasContext.measureText(testLine);
            testWidth = metrics.width;
            if (testWidth > 14 && n > 0) {
              smellCanvasContext.fillText(line, xPos, yPos);
              line = words[n] + ' ';
              yPos += 1.8;
            } else {
              line = testLine;
            }
          }
          smellCanvasContext.fillText(line, xPos, yPos);
        }
      }
    }
  }
 }
