function drawGlobe(id, windowDim, paddingDim, countriesJSON, earthQuakesJSON) {
    var feature;
    var quakes;
    var stopRotating = false;

    // Define origin and get ready to roll
    var t0 = Date.now(),
//        origin = [-71.03, 42.37],
        origin = [-71.03, 25.37],
        // velocity = [0.0018, 0.0006];
        velocity = [0.0040, 0.0000];

    var projection = d3.geo.azimuthal()
        .scale(windowDim/2) // scale factor, defaults to 200
        .origin(origin)
        .mode("orthographic")
        .translate([(windowDim/2 + paddingDim/2), (windowDim/2 + paddingDim/2)]); // 25 pixel margin

    // generates a circle for clipping features before converting to paths
    var circle = d3.geo.circle()
            .origin(projection.origin());


    // TODO fix d3.geo.azimuthal to be consistent with scale
    // var scale = {
    //   orthographic: windowDim/2,
    //   stereographic: windowDim/2,
    //   gnomonic: windowDim/2,
    //   equidistant: (windowDim/2) / Math.PI * 2,
    //   equalarea: (windowDim/2) / Math.SQRT2
    // };

    // Generates path function() for creating svg paths
    var path = d3.geo.path()
        .projection(projection);

    // Define movement functions in advance of drawing SVG
    var m0,
        o0;


    function mousedown() {
      m0 = [d3.event.pageX, d3.event.pageY];
      o0 = projection.origin();
      d3.event.preventDefault();
    }

    function mousemove() {
      if (m0) {
        stopRotating = true;
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
        function updateQuake(d) {
            var coords = [];
            clipped = circle.clip(d);
            if (clipped !== null) {
                coords[0] = projection(clipped.geometry.coordinates)[0];
                coords[1] = projection(clipped.geometry.coordinates)[1];
                coords[2] = 1;
            } else {
                coords[0] = projection(d.geometry.coordinates)[0];
                coords[1] = projection(d.geometry.coordinates)[1];
                coords[2] = 0;
            }
            return coords;
        }

        if (duration) {
            feature.transition().duration(duration).attr("d", clip);
            quakes.transition().duration(duration).attr({
                "cx": function(d) {
                    return updateQuake(d)[0];
                },
                "cy": function(d) {
                    return updateQuake(d)[1];
                },
                "r": function(d) {
                    if (updateQuake(d)[2] === 1) {
                        return d.properties.mag;
                    } else {
                        return 0;
                    }
                }
            });
        } else {
            feature.attr("d", clip);
            quakes.attr({
                "cx": function(d) {
                    return updateQuake(d)[0];
                },
                "cy": function(d) {
                    return updateQuake(d)[1];
                },
                "r": function(d) {
                    if (updateQuake(d)[2] === 1) {
                        return d.properties.mag;
                    } else {
                        return 0;
                    }
                }
            });
        }
    }

    // Clips the feature according to the great circle, then converts it to a both
    function clip(d) {
      return path(circle.clip(d));
    }

    function openURL(url) {
        console.log(url);
    }



    // Now draw
    var svg = d3.select(id).append("svg:svg")
        .attr("width", (windowDim + paddingDim))
        .attr("height", (windowDim + paddingDim))
        .on("mousedown", mousedown);


    // Now add a border circle
    svg.selectAll("circle")
        .data([0])
        .enter()
        .append('circle')
        .attr("class", "globe-outline")
        .attr("fill-opacity", 0.0) // Override these with css for circle
        .attr("stroke", "#000000") // Override these with css for circle
        .attr("r", (windowDim+4)/2) // Add a 2 pixel buffer
        .attr("cx", ((windowDim+paddingDim)/2))
        .attr("cy", ((windowDim+paddingDim)/2));


    // Load the GEOJSON data for the countries
    d3.json(countriesJSON, function(collection) {
      feature = svg.selectAll("path")
          .data(collection.features)
        .enter()
          .insert("svg:path", "quakes")
          //.append("svg:path")
          .attr("class", "country")
          .attr("d", clip);
      d3.json(earthQuakesJSON, function(collection) {
              quakes = svg.selectAll("quakes")
                    .data(collection.features)
                    .enter()
                    // .insert('svg:circle', 'path')
                    .append("svg:circle")
                    .on("mouseover", function(d) {
                        openURL(d.properties.url);
                    })
                    .attr("class", "quake")
                    .attr("cx", function(d) {
                        return projection(d.geometry.coordinates)[0];
                    })
                    .attr("cy", function(d) {
                        return projection(d.geometry.coordinates)[1];
                    })
                    .attr("r", function(d) {
                        return d.properties.mag;
                    });
             refresh();
          });
    });

    // Timer before selection changes focus
    // Now rotate the globe
    d3.timer(function() {
        var t = Date.now() - t0;

        // Don't refresh until everything is rendered... ah ha
        if (t > 500) {
            var o = [origin[0] + (t - 500) * velocity[0], origin[1] + (t - 500) * velocity[1]];
            projection.origin(o);
            circle.origin(o);
            refresh();
        }
        return stopRotating;
    });


    // Then allow the window to get moved around
    d3.select(window)
        .on("mousemove", mousemove)
        .on("mouseup", mouseup);


    // This is for the selection...
    // d3.select("select").on("change", function() {
    //   projection.mode(this.value).scale(scale[this.value]);
    //   refresh(750);
    // });

}
