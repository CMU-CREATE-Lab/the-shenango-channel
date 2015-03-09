/*******************************************************************************************
 * zoomify
 * Written by Craig Francis
 * Modified by Paul Dille (pdille@cmucreatelab.org)
 * Absolutely minimal version of GSIV to work with touch screens and very slow processors.
********************************************************************************************/

(function () {

  "use strict";

  var jsFiles = $("script");
  var pathOfCurrentScript = $(jsFiles[jsFiles.length - 1]).attr("src");
  var rootURL = pathOfCurrentScript.substr(0, pathOfCurrentScript.substring(1).indexOf('/') + 1);
  if (rootURL === "" || (rootURL.substr(0,1) !== "/" && rootURL.substr(0,1) !== "." && rootURL.substr(0,2) !== ".."))
    rootURL = "";
  else
    rootURL += "/";

  org.gigapan.zoomify = function(settings) {

    // Set a custom cursor
    $('<style type="text/css">.closedHand {cursor: url("' + rootURL + 'stylesheets/cursors/closedhand.cur"), move !important;} .openHand {cursor: url("' + rootURL + 'stylesheets/cursors/openhand.cur"), move !important;} .tiledContentHolder {cursor: url("' + rootURL + 'stylesheets/cursors/openhand.cur"), move;}</style>').appendTo($('head'));

    //--------------------------------------------------
    // Variables

    var div_ref = null,
      div_half_width = null,
      div_half_height = null,
      img_ref = null,
      img_orig_width = null,
      img_orig_height = null,
      img_zoom_width = null,
      img_zoom_height = null,
      img_start_left = null,
      img_start_top = null,
      img_current_left = null,
      img_current_top = null,
      zoom_level = 0,
      zoom_levels = [],
      zoom_level_count = [],
      click_last = 0,
      origin = null,
      html_ref = null,
      parentOffset = null;

    //--------------------------------------------------
    // IE9 Bug ... if loading an iframe which is then
    // moved in the DOM (as done in lightboxMe, line 51),
    // then IE looses the reference and decides to do
    // an early garbage collection:
    // http://stackoverflow.com/q/8389261

    if (typeof (Math) === 'undefined') {
      return false; // No need to window.reload, as IE9 will reload the page anyway.
    }

    //--------------------------------------------------
    // Zooming

    function image_zoom(change, event) {
      var mouseX = div_half_width;
      var mouseY = div_half_height;

      if (event) {
        var currentPos = event_coords(event);
        mouseX = currentPos[0];
        mouseY = currentPos[1];
      }

      //--------------------------------------------------
      // Variables

      var new_zoom,
        new_zoom_width,
        new_zoom_height,
        ratio;

      //--------------------------------------------------
      // Zoom level

      new_zoom = (zoom_level + change);

      if (new_zoom >= zoom_level_count) {
        if (new_zoom > zoom_level_count) {
          return;
        }
      }

      if (new_zoom <= 4) {
        if (new_zoom < 4) {
          return;
        }
      }

      zoom_level = new_zoom;

      //--------------------------------------------------
      // New width

      new_zoom_width = zoom_levels[new_zoom];
      new_zoom_height = (zoom_levels[new_zoom] * (img_orig_height / img_orig_width));

      img_ref.width = new_zoom_width;
      img_ref.height = new_zoom_height;

      //--------------------------------------------------
      // Update position

      if (img_current_left === null) { // Position in the middle on page load
        img_current_left = (div_half_width - (new_zoom_width / 2));
        img_current_top = (div_half_height - (new_zoom_height / 2));
      } else {
        ratio = (new_zoom_width / img_zoom_width);

        img_current_left = (mouseX - ((mouseX - img_current_left) * ratio));
        img_current_top = (mouseY - ((mouseY - img_current_top) * ratio));
      }

      img_zoom_width = new_zoom_width;
      img_zoom_height = new_zoom_height;

      img_ref.style.left = img_current_left + 'px';
      img_ref.style.top = img_current_top + 'px';
    }

    function image_zoom_in(event) {
      image_zoom(1, event);
    }

    function image_zoom_out(event) {
      image_zoom(-1, event);
    }

    function scroll_event(e) {

      //--------------------------------------------------
      // Event

      e = e || window.event;

      var wheelData = (e.detail ? e.detail * -1 : e.wheelDelta / 40);

      image_zoom((wheelData > 0 ? 1 : -1), e);

      //--------------------------------------------------
      // Prevent default

      if (e.preventDefault) {
        e.preventDefault();
      } else {
        e.returnValue = false;
      }

      return false;
    }

    //--------------------------------------------------
    // Movement

    function event_coords(e) {
      var coords = [];
      var posX, posY;
      if (!parentOffset)
        parentOffset = $(div_ref).parent().offset();

      if (e.touches && e.touches.length) {
        coords[0] = e.touches[0].clientX - parentOffset.left;
        coords[1] = e.touches[0].clientY - parentOffset.top;
      } else {
        if (e.pageX || e.pageY) {
          posX = e.pageX;
          posY = e.pageY;
        } else if (e.clientX || e.clientY) {
          posX = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
          posY = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
        }
        coords[0] = posX - parentOffset.left;
        coords[1] = posY - parentOffset.top;
      }
      return coords;
    }

    function image_move_update() {

      //--------------------------------------------------
      // Boundary check

      var max_left = (div_half_width - img_zoom_width),
        max_top = (div_half_height - img_zoom_height);

      if (img_current_left > div_half_width) {
        img_current_left = div_half_width;
      }
      if (img_current_top > div_half_height) {
        img_current_top = div_half_height;
      }
      if (img_current_left < max_left) {
        img_current_left = max_left;
      }
      if (img_current_top < max_top) {
        img_current_top = max_top;
      }

      //--------------------------------------------------
      // Move

      img_ref.style.left = img_current_left + 'px';
      img_ref.style.top = img_current_top + 'px';
    }

    function image_move_event(e) {

      //--------------------------------------------------
      // Calculations

      e = e || window.event;

      var currentPos = event_coords(e);

      img_current_left = (img_start_left + (currentPos[0] - origin[0]));
      img_current_top = (img_start_top + (currentPos[1] - origin[1]));

      image_move_update();

      //--------------------------------------------------
      // Prevent default

      if (e.preventDefault) {
        e.preventDefault();
      } else {
        e.returnValue = false;
      }

      return false;
    }

    function image_move_start(e) {

      //--------------------------------------------------
      // Event

      e = e || window.event;

      if (e.preventDefault) {
        e.preventDefault();
      } else {
        e.returnValue = false; // IE: http://stackoverflow.com/questions/1000597/
      }

      //--------------------------------------------------
      // Double tap
      if (e.type === "touchstart") {
        var now = new Date().getTime();
        if (click_last > (now - 200)) {
          image_zoom_in(e);
        } else {
          click_last = now;
        }
      }

      //--------------------------------------------------
      // Add events

      // http://www.quirksmode.org/blog/archives/2010/02/the_touch_actio.html
      // http://www.quirksmode.org/m/tests/drag.html

      if (e.type === 'touchstart') {
        img_ref.onmousedown = null;
        img_ref.ontouchmove = image_move_event;
        img_ref.ontouchend = function () {
          img_ref.ontouchmove = null;
          img_ref.ontouchend = null;
        };
      } else {
        document.onmousemove = image_move_event;
        document.onmouseup = function () {
          document.onmousemove = null;
          document.onmouseup = null;
        };

      }

      //--------------------------------------------------
      // Record starting position

      img_start_left = img_current_left;
      img_start_top = img_current_top;

      origin = event_coords(e);
    }

    //--------------------------------------------------
    // Default styles for JS enabled version

    html_ref = document.getElementsByTagName('html');
    if (html_ref[0]) {
      html_ref[0].className = html_ref[0].className + ' js-enabled';
    }

    //--------------------------------------------------
    // Run on load
    this.makeImageZoomable = function(imageId) {
      // stitched_image
      img_ref = $("#" + imageId).get(0);
      // stitched_image_wrapper
      div_ref = $("#" + imageId).parent().get(0);

      if (div_ref && img_ref) {

        //--------------------------------------------------
        // Variables

        var div_border,
          div_style,
          div_width,
          div_height,
          width,
          height;

        //--------------------------------------------------
        // Wrapper size

        try {
          div_style = getComputedStyle(div_ref, '');
          div_border = div_style.getPropertyValue('border-top-width');
        } catch (e) {
          div_border = div_ref.currentStyle.borderWidth;
        }
        div_half_width = $(div_ref).width();
        div_half_height = $(div_ref).height();

        div_half_width = Math.round(parseInt(div_half_width, 10) / 2);
        div_half_height = Math.round(parseInt(div_half_height, 10) / 2);

        //--------------------------------------------------
        // Original size

        img_orig_width = img_ref.width;
        img_orig_height = img_ref.height;

        //--------------------------------------------------
        // Set zoom level defaults

        div_width = (div_half_width);
        div_height = (div_half_height);

        width = img_orig_width * 4;
        height = img_orig_height * 4;

        zoom_levels[zoom_levels.length] = width;

        while (width > div_width || height > div_height) {
          width = (width * 0.75);
          height = (height * 0.75);
          zoom_levels[zoom_levels.length] = Math.round(width);
        }

        zoom_levels.reverse(); // Yep IE5.0 does not support unshift... but I do wonder if a single reverse() is quicker than inserting at the beginning of the array.

        //--------------------------------------------------
        // Mobile phone, over zoom

        if (parseInt(div_border, 10) === 5) { // img width on webkit will return width before CSS is applied
          zoom_levels[zoom_levels.length] = Math.round(img_orig_width * 1.75);
          zoom_levels[zoom_levels.length] = Math.round(img_orig_width * 3);
        }

        //--------------------------------------------------
        // Set default

        zoom_level_count = (zoom_levels.length - 1);
        image_zoom(4);

        //--------------------------------------------------
        // Make visible
        if ($(div_ref).css("visibility") !== "hidden") {
          img_ref.style.visibility = 'visible';
        }

        if (typeof(settings.onImageReady) === "function")
          settings.onImageReady(imageId);

        div_ref.className = div_ref.className + ' js-active';

        //--------------------------------------------------
        // Add events

        $("#zoom-in").on("click", function () {
          image_zoom_in();
        });

        $("#zoom-out").on("click", function () {
          image_zoom_out();
        });

        $(img_ref).on("dblclick", function (e) {
          image_zoom_in(e);
        });

        img_ref.onmousedown = image_move_start;
        img_ref.ontouchstart = image_move_start;

        if (div_ref.addEventListener) {
          div_ref.addEventListener('DOMMouseScroll', scroll_event, false);
          div_ref.addEventListener('mousewheel', scroll_event, false);
        } else if (div_ref.attachEvent) {
          div_ref.attachEvent('onmousewheel', scroll_event);
        }
      }
    };
  };
}());
