/*!
 * Searchable Map Template with Google Fusion Tables
 * http://derekeder.com/searchable_map_template/
 *
 * Copyright 2012, Derek Eder
 * Licensed under the MIT license.
 * https://github.com/derekeder/FusionTable-Map-Template/wiki/License
 *
 * Date: 12/10/2012
 *
 */

// Enable the visual refresh
google.maps.visualRefresh = true;

var MapsLib = MapsLib || {};
var MapsLib = {

  //Setup section - put your Fusion Table details here
  //Using the v1 Fusion Tables API. See https://developers.google.com/fusiontables/docs/v1/migration_guide for more info

  //the encrypted Table ID of your Fusion Table (found under File => About)
  //NOTE: numeric IDs will be depricated soon
  //fusionTableId:      "1iK_5ekxipPJyxyLreYX1YewUU4WE9PnZBT6jXzQ",
  fusionTableId:      "1vUjhUbwrPWEX-PaBHDWK0QorZMYBPK9CAEG4lh0",

  //*New Fusion Tables Requirement* API key. found at https://code.google.com/apis/console/
  //*Important* this key is for demonstration purposes. please register your own.
  googleApiKey:       "AIzaSyDOGOewmVoa8Y7Okz_Nc1zNI36UzbOC0wY",

  //name of the location column in your Fusion Table.
  //NOTE: if your location column name has spaces in it, surround it with single quotes
  //example: locationColumn:     "'my location'",
  locationColumn:     "latlong",
  //locationColumn:     "Geocode",

  map_centroid:       new google.maps.LatLng(39.50, -98.35), //center that your map defaults to
  locationScope:      "",      //geographical area appended to all address searches
  recordName:         "result",       //for showing number of results
  recordNamePlural:   "results",

  searchRadius:       805,            //in meters ~ 1/2 mile
  defaultZoom:        3,             //zoom level when map is loaded (bigger is more zoomed in)
  addrMarkerImage:    'images/blue-pushpin.png',
  currentPinpoint:    null,

  initialize: function() {
    $( "#result_count" ).html("");

    geocoder = new google.maps.Geocoder();
    var myOptions = {
      zoom: MapsLib.defaultZoom,
      center: MapsLib.map_centroid,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    map = new google.maps.Map($("#map_canvas")[0],myOptions);

    // maintains map centerpoint for responsive design
    google.maps.event.addDomListener(map, 'idle', function() {
        MapsLib.calculateCenter();
    });

    google.maps.event.addDomListener(window, 'resize', function() {
        map.setCenter(MapsLib.map_centroid);
    });
    
    MapsLib.infoWindow = new google.maps.InfoWindow();
    MapsLib.searchrecords = null;

    //reset filters
    $("#search_address").val(MapsLib.convertToPlainString($.address.parameter('address')));
    var loadRadius = MapsLib.convertToPlainString($.address.parameter('radius'));
    if (loadRadius != "") $("#search_radius").val(loadRadius);
    else $("#search_radius").val(MapsLib.searchRadius);
    $(":checkbox").prop("checked", "checked");
    $("#result_box").hide();
    
    //-----custom initializers-------

  

  

    
    
    //-----end of custom initializers-------

    //run the default search
    MapsLib.doSearch();
  },

  doSearch: function(location) {
    MapsLib.clearSearch();
    var address = $("#search_address").val();
    MapsLib.searchRadius = $("#search_radius").val();

    var whereClause = MapsLib.locationColumn + " not equal to ''";

    //-----custom filters-------

    //-------end of custom filters--------

    if (address != "") {
      if (address.toLowerCase().indexOf(MapsLib.locationScope) == -1)
        address = address + " " + MapsLib.locationScope;

      geocoder.geocode( { 'address': address}, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
          MapsLib.currentPinpoint = results[0].geometry.location;

          $.address.parameter('address', encodeURIComponent(address));
          $.address.parameter('radius', encodeURIComponent(MapsLib.searchRadius));
          map.setCenter(MapsLib.currentPinpoint);
          map.setZoom(10);

          MapsLib.addrMarker = new google.maps.Marker({
            position: MapsLib.currentPinpoint,
            map: map,
            icon: MapsLib.addrMarkerImage,
            animation: google.maps.Animation.DROP,
            title:address
          });

          whereClause += " AND ST_INTERSECTS(" + MapsLib.locationColumn + ", CIRCLE(LATLNG" + MapsLib.currentPinpoint.toString() + "," + MapsLib.searchRadius + "))";

          MapsLib.drawSearchRadiusCircle(MapsLib.currentPinpoint);
          MapsLib.submitSearch(whereClause, map, MapsLib.currentPinpoint);
        }
        else {
          alert("We could not find your address: " + status);
        }
      });
    }
    else { //search without geocoding callback
      MapsLib.submitSearch(whereClause, map);
    }
  },

  submitSearch: function(whereClause, map, location) {
    //get using all filters
    //NOTE: styleId and templateId are recently added attributes to load custom marker styles and info windows
    //you can find your Ids inside the link generated by the 'Publish' option in Fusion Tables
    //for more details, see https://developers.google.com/fusiontables/docs/v1/using#WorkingStyles

    MapsLib.searchrecords = new google.maps.FusionTablesLayer({
      query: {
        from:   MapsLib.fusionTableId,
        select: MapsLib.locationColumn,
        where:  whereClause
      },
      styleId: 2,
      templateId: 2,
      suppressInfoWindows: true
    });
    //MapsLib.mytest= MapsLib.searchrecords[1].row['Facility_Type'].value;
    MapsLib.searchrecords.setMap(map);
    MapsLib.getCount(whereClause);
    MapsLib.getList(whereClause);
    google.maps.event.addListener(MapsLib.searchrecords, 'click', function(e) {
          MapsLib.windowControl(e, MapsLib.infoWindow, map);
        });
    //google.maps.event.addListener(MapsLib.searchrecords, 'click', openWindow(e));// function(e) {
    //         // Change the content of the InfoWindow
    //       e.infoWindowHtml = "<b>Facility Type: </b>" + e.row['Facility_Type'].value + "<br>";
    //       if (e.row['Rail_URL'].value != '' ) {
    //         e.infoWindowHtml += "<b>Servicing Railroad: </b>" + e.row['Rail_URL'].value + "<br>";
    //       }
    //       e.infoWindowHtml += "<b>Address: </b>" + e.row['Address1'].value + "<br>";
    //       if (e.row['Address2'].value != '' ) {
    //         e.infoWindowHtml += e.row['Address2'].value + "<br>";
    //       }
    //       e.infoWindowHtml += "<b>City: </b>" + e.row['City'].value + "<br>";
    //       e.infoWindowHtml += "<b>State or Province: </b>" + e.row['State_Province'].value + "<br>";
    //       e.infoWindowHtml += "<b>Postal Code: </b>" + e.row['Postal_Code'].value + "<br>";
    //       e.infoWindowHtml += "<b>Country: </b>" + e.row['Country'].value + "<br>";
    //       e.infoWindowHtml += "<b>Telephone: </b>" + e.row['Telephone'].value + "<br>";
    //       if (e.row['Email'].value != '' ) {
    //         e.infoWindowHtml += "<b>Email: </b>" + e.row['Email'].value + "<br>";
    //       }
    //       if (e.row['Web_URL'].value != '' ) {
    //         e.infoWindowHtml += "<b>Website: </b>" + e.row['Web_URL'].value + "<br>";
    //       }

    // });
    
  },

  // Open the info window at the clicked location
  windowControl: function(e, infoWindow, map) {
      //e.infoWindowHtml = "<b>Facility Type: </b>" + e.row['Geocode'].value + "<br>";
      infoWindow.setOptions({
      content: e.infoWindowHtml,
      position: e.latLng,
      pixelOffset: e.pixelOffset
       });
      infoWindow.open(map);
  },

  openWindow: function(e) {
            // Change the content of the InfoWindow
          e.infoWindowHtml = "<b>Facility Type: </b>" + e.row['Facility_Type'].value + "<br>";
          if (e.row['Rail_URL'].value != '' ) {
            e.infoWindowHtml += "<b>Servicing Railroad: </b>" + e.row['Rail_URL'].value + "<br>";
          }
          e.infoWindowHtml += "<b>Address: </b>" + e.row['Address1'].value + "<br>";
          if (e.row['Address2'].value != '' ) {
            e.infoWindowHtml += e.row['Address2'].value + "<br>";
          }
          e.infoWindowHtml += "<b>City: </b>" + e.row['City'].value + "<br>";
          e.infoWindowHtml += "<b>State or Province: </b>" + e.row['State_Province'].value + "<br>";
          e.infoWindowHtml += "<b>Postal Code: </b>" + e.row['Postal_Code'].value + "<br>";
          e.infoWindowHtml += "<b>Country: </b>" + e.row['Country'].value + "<br>";
          e.infoWindowHtml += "<b>Telephone: </b>" + e.row['Telephone'].value + "<br>";
          if (e.row['Email'].value != '' ) {
            e.infoWindowHtml += "<b>Email: </b>" + e.row['Email'].value + "<br>";
          }
          if (e.row['Web_URL'].value != '' ) {
            e.infoWindowHtml += "<b>Website: </b>" + e.row['Web_URL'].value + "<br>";
          }

  },

  clearSearch: function() {
    if (MapsLib.searchrecords != null)
      MapsLib.searchrecords.setMap(null);
    if (MapsLib.addrMarker != null)
      MapsLib.addrMarker.setMap(null);
    if (MapsLib.searchRadiusCircle != null)
      MapsLib.searchRadiusCircle.setMap(null);
  },

  findMe: function() {
    // Try W3C Geolocation (Preferred)
    var foundLocation;

    if(navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        foundLocation = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
        MapsLib.addrFromLatLng(foundLocation);
      }, null);
    }
    else {
      alert("Sorry, we could not find your location.");
    }
  },

  addrFromLatLng: function(latLngPoint) {
    geocoder.geocode({'latLng': latLngPoint}, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        if (results[1]) {
          $('#search_address').val(results[1].formatted_address);
          $('.hint').focus();
          MapsLib.doSearch();
        }
      } else {
        alert("Geocoder failed due to: " + status);
      }
    });
  },

  drawSearchRadiusCircle: function(point) {
      var circleOptions = {
        strokeColor: "#4b58a6",
        strokeOpacity: 0.3,
        strokeWeight: 1,
        fillColor: "#4b58a6",
        fillOpacity: 0.05,
        map: map,
        center: point,
        clickable: false,
        zIndex: -1,
        radius: parseInt(MapsLib.searchRadius)
      };
      MapsLib.searchRadiusCircle = new google.maps.Circle(circleOptions);
  },

  query: function(selectColumns, whereClause, callback) {
    var queryStr = [];
    queryStr.push("SELECT " + selectColumns);
    queryStr.push(" FROM " + MapsLib.fusionTableId);
    queryStr.push(" WHERE " + whereClause);

    var sql = encodeURIComponent(queryStr.join(" "));
    $.ajax({url: "https://www.googleapis.com/fusiontables/v1/query?sql="+sql+"&callback="+callback+"&key="+MapsLib.googleApiKey, dataType: "jsonp"});
  },

  handleError: function(json) {
    if (json["error"] != undefined) {
      var error = json["error"]["errors"]
      console.log("Error in Fusion Table call!");
      for (var row in error) {
        console.log(" Domain: " + error[row]["domain"]);
        console.log(" Reason: " + error[row]["reason"]);
        console.log(" Message: " + error[row]["message"]);
      }
    }
  },

  getCount: function(whereClause) {
    var selectColumns = "Count()";
    MapsLib.query(selectColumns, whereClause,"MapsLib.displaySearchCount");
  },

  displaySearchCount: function(json) {
    MapsLib.handleError(json);
    var numRows = 0;
    if (json["rows"] != null)
      numRows = json["rows"][0];

    var name = MapsLib.recordNamePlural;
    if (numRows == 1)
    name = MapsLib.recordName;
    $( "#result_box" ).fadeOut(function() {
        $( "#result_count" ).html(MapsLib.addCommas(numRows) + " " + name + " found");
      });
    $( "#result_box" ).fadeIn();
  },

  getList: function(whereClause) {
  var selectColumns = "Facility_Type, Facility_Name, City, State_Province, Country";
  MapsLib.query(selectColumns, whereClause, "MapsLib.displayList");
},

displayList: function(json) {
  MapsLib.handleError(json);
  var data = json["rows"];
  var template = "";

  var results = $("#results_list");
  results.hide().empty(); //hide the existing list and empty it out first

  if (data == null) {
    //clear results list
    results.append("<li><span class='lead'>No results found</span></li>");
  }
  else {
    template = "<table class='table table-bordered table-hover table-condensed'>";
    template = template.concat("<thead><tr><th>Type</th><th>Name</th><th>City</th><th>State</th><th>Country</th><th>ROWID</th></tr></thead>");
    template = template.concat("<tbody>");
    for (var row in data) {
       template = template.concat("<tr><td>" + data[row][0] + "</td><td>" + data[row][1] + "</td><td>" + data[row][2] + "</td><td>" + data[row][3] + "</td><td>" + data[row][4] + "</td></tr>");
       // results.append("<td>" + data[row][1] + "</td>");
       // results.append("<td>" + data[row][2] + "</td>");
       // results.append("<td>" + data[row][3] + "</td>");
       // results.append("/tr>");

    }
    template = template.concat("</tbody></table>");
    results.append(template);
  }
  results.fadeIn();
},

  addCommas: function(nStr) {
    nStr += '';
    x = nStr.split('.');
    x1 = x[0];
    x2 = x.length > 1 ? '.' + x[1] : '';
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
      x1 = x1.replace(rgx, '$1' + ',' + '$2');
    }
    return x1 + x2;
  },

  // maintains map centerpoint for responsive design
  calculateCenter: function() {
    center = map.getCenter();
  },

  //converts a slug or query string in to readable text
  convertToPlainString: function(text) {
    if (text == undefined) return '';
  	return decodeURIComponent(text);
  }
  
  //-----custom functions-------
  // NOTE: if you add custom functions, make sure to append each one with a comma, except for the last one.
  // This also applies to the convertToPlainString function above
  
  // Open the info window at the clicked location
  // openWindow: function(e, infoWindow, map) {
  //      infoWindow.setOptions({
  //         content: e.infoWindowHtml,
  //         position: e.latLng,
  //         pixelOffset: e.pixelOffset
  //       });
  //       infoWindow.open(map);
  // }


  //-----end of custom functions-------
}
