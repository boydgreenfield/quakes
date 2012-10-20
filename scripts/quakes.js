// d3.geo.circleUpdated = function() {
//   var origin = [0, 0],
//       degrees = 90 - 1e-2,
//       radians = degrees * d3_geo_radians,
//       arc = d3.geo.greatArc().source(origin).target(d3_identity);
//
//   function circle() {
//     // TODO render a circle as a Polygon
//   }
//
//   function visible(point) {
//     return arc.distance(point) < radians;
//   }
//
//   circle.clip = function(d) {
//     if (typeof origin === "function") arc.source(origin.apply(this, arguments));
//     return clipType(d) || null;
//   };
//
//   var clipType = d3_geo_type({
//
//     FeatureCollection: function(o) {
//       var features = o.features.map(clipType).filter(d3_identity);
//       return features && (o = Object.create(o), o.features = features, o);
//     },
//
//     Feature: function(o) {
//       var geometry = clipType(o.geometry);
//       return geometry && (o = Object.create(o), o.geometry = geometry, o);
//     },
//
//     Point: function(o) {
//       return visible(o.coordinates) && o;
//     },
//
//     MultiPoint: function(o) {
//       var coordinates = o.coordinates.filter(visible);
//       return coordinates.length && {
//         type: o.type,
//         coordinates: coordinates
//       };
//     },
//
//     LineString: function(o) {
//       var coordinates = clip(o.coordinates);
//       return coordinates.length && (o = Object.create(o), o.coordinates = coordinates, o);
//     },
//
//     MultiLineString: function(o) {
//       var coordinates = o.coordinates.map(clip).filter(function(d) { return d.length; });
//       return coordinates.length && (o = Object.create(o), o.coordinates = coordinates, o);
//     },
//
//     Polygon: function(o) {
//       var coordinates = o.coordinates.map(clip);
//       return coordinates[0].length && (o = Object.create(o), o.coordinates = coordinates, o);
//     },
//
//     MultiPolygon: function(o) {
//       var coordinates = o.coordinates.map(function(d) { return d.map(clip); }).filter(function(d) { return d[0].length; });
//       return coordinates.length && (o = Object.create(o), o.coordinates = coordinates, o);
//     },
//
//     GeometryCollection: function(o) {
//       var geometries = o.geometries.map(clipType).filter(d3_identity);
//       return geometries.length && (o = Object.create(o), o.geometries = geometries, o);
//     }
//
//   });
//
//   function clip(coordinates) {
//     var i = -1,
//         n = coordinates.length,
//         clipped = [],
//         p0,
//         p1,
//         p2,
//         d0,
//         d1;
//
//     while (++i < n) {
//       d1 = arc.distance(p2 = coordinates[i]);
//       if (d1 < radians) {
//         if (p1) clipped.push(d3_geo_greatArcInterpolate(p1, p2)((d0 - radians) / (d0 - d1)));
//         clipped.push(p2);
//         p0 = p1 = null;
//       } else {
//         p1 = p2;
//         if (!p0 && clipped.length) {
//           clipped.push(d3_geo_greatArcInterpolate(clipped[clipped.length - 1], p1)((radians - d0) / (d1 - d0)));
//           p0 = p1;
//         }
//       }
//       d0 = d1;
//     }
//
//     // Close the clipped polygon if necessary.
//     p0 = coordinates[0];
//     p1 = clipped[0];
//     if (p1 && p2[0] === p0[0] && p2[1] === p0[1] && !(p2[0] === p1[0] && p2[1] === p1[1])) {
//       clipped.push(p1);
//     }
//
//     return resample(clipped);
//   }
//
//   // Resample coordinates, creating great arcs between each.
//   function resample(coordinates) {
//     var i = 0,
//         n = coordinates.length,
//         j,
//         m,
//         resampled = n ? [coordinates[0]] : coordinates,
//         resamples,
//         origin = arc.source();
//
//     while (++i < n) {
//       resamples = arc.source(coordinates[i - 1])(coordinates[i]).coordinates;
//       for (j = 0, m = resamples.length; ++j < m;) resampled.push(resamples[j]);
//     }
//
//     arc.source(origin);
//     return resampled;
//   }
//
//   circle.origin = function(x) {
//     if (!arguments.length) return origin;
//     origin = x;
//     if (typeof origin !== "function") arc.source(origin);
//     return circle;
//   };
//
//   circle.angle = function(x) {
//     if (!arguments.length) return degrees;
//     radians = (degrees = +x) * d3_geo_radians;
//     return circle;
//   };
//
//   return d3.rebind(circle, arc, "precision");
// }


function drawGlobe(id, windowDim, paddingDim, countriesJSON, earthQuakesJSON) {
    var feature;
    var quakes;

    var projection = d3.geo.azimuthal()
        .scale(windowDim/2) // scale factor, defaults to 200
        .origin([-71.03,42.37])
        .mode("orthographic")
        .translate([(windowDim/2 + paddingDim/2), (windowDim/2 + paddingDim/2)]); // 25 pixel margin

    // generates a circle for clipping features before converting to paths
    // (see clip function at bottom)
    // var circle = d3.geo.greatCircle()
    //         .origin(projection.origin());

    var circle = d3.geo.circle()
            .origin(projection.origin());


    // TODO fix d3.geo.azimuthal to be consistent with scale
    var scale = {
      orthographic: windowDim/2,
      stereographic: windowDim/2,
      gnomonic: windowDim/2,
      equidistant: (windowDim/2) / Math.PI * 2,
      equalarea: (windowDim/2) / Math.SQRT2
    };

    // Generates path function() for creating svg paths
    var path = d3.geo.path()
        .projection(projection);

    var svg = d3.select(id).append("svg:svg")
        .attr("width", (windowDim + paddingDim))
        .attr("height", (windowDim + paddingDim))
        .on("mousedown", mousedown);

    // Now add a border circle
    svg.selectAll("circle")
        .data([0])
        .enter()
        .append('circle')
        .attr("fill-opacity", 0.0) // Override these with css for circle
        .attr("stroke", "#000000") // Override these with css for circle
        .attr("r", (windowDim+4)/2) // Add a 2 pixel buffer
        .attr("cx", ((windowDim+paddingDim)/2))
        .attr("cy", ((windowDim+paddingDim)/2));


    // Load the GEOJSON data for the countries
    d3.json(countriesJSON, function(collection) {
      feature = svg.selectAll("path")
          .data(collection.features)
        .enter().append("svg:path")
          .attr("class", "country")
          .attr("d", clip);

      // feature.append("svg:title")
      //     .text(function(d) { return d.properties.name; });
    });


    // Now load the earthquake data
    d3.json(earthQuakesJSON, function(collection) {
        quakes = svg.selectAll("quakes")
            .data(collection.features)
          .enter().append("svg:path")
            .attr("class", "quake")
            .attr("d", clip);
    });




    d3.select(window)
        .on("mousemove", mousemove)
        .on("mouseup", mouseup);

    // This is for the selection...
    d3.select("select").on("change", function() {
      projection.mode(this.value).scale(scale[this.value]);
      refresh(750);
    });

    var m0,
        o0;

    function mousedown() {
      m0 = [d3.event.pageX, d3.event.pageY];
      o0 = projection.origin();
      d3.event.preventDefault();
    }

    function mousemove() {
      if (m0) {
        var m1 = [d3.event.pageX, d3.event.pageY],
            o1 = [o0[0] + (m0[0] - m1[0]) / 8, o0[1] + (m1[1] - m0[1]) / 8];
        projection.origin(o1);
        circle.origin(o1);
        refresh();
      }
    }

    function mouseup() {
      if (m0) {
        mousemove();
        m0 = null;
      }
    }

    function refresh(duration) {
      //   if (duration) {
      //       console.log("LoopTrue");
      //       feature.transition().duration(duration).attr("d", clip);
      //   } else {
      //       console.log("LoopFalse");
      //       console.log(feature.attr("d"));
      //       feature.attr("d", clip);
      //   }
      //
      // console.log("Refreshing!");
      (duration ? feature.transition().duration(duration) : feature).attr("d", clip);
      (duration ? quakes.transition().duration(duration) : quakes).attr("d", clip);
    }

    // Clips the feature according to the great circle, then converts it to a both
    function clip(d) {
        // d = circle.clip({type: "LineString", coordinates: d});
        // return d ? path(d) : null;
      return path(circle.clip(d));
    }
}
