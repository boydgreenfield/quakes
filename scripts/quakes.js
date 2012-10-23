function drawGlobe(id, windowDim, paddingDim, countriesJSON, earthQuakesJSON, useJSONP,
                    resumeId, keyId, quakeTextId, quakeLinkId, sampleQuakeId, loadTimeId, keyTextId, keyTextArray,
                    arcWidth, startColor, endColor, highlightColor) {
    var feature;
    var quakes;
    var stopRotating = false;
    var loaded = false;

    // Define origin and get ready to roll
    var origin = [-71.03, 25.37],
//        origin = [-71.03, 42.37],
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
        resume.attr("class", "resume-stopped");
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

    // First draw the key
    var key = d3.select(keyId).append("svg:svg")
        .attr("width", 400)
        .attr("height", 75);

    var keyData = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    var colorScale = d3.scale.linear()
        .domain([0, 10])
        .range([startColor, endColor]);

    function richterColors(d) {
        return d3.rgb(colorScale(d)).darker(0.0).toString();
    }

    function richterSize(d) {
        // Note this doesn't take into account the exponential difference
        // between a 4.0 and 5.0, which has 10X greater shaking amplitude
        // and ~31.9X greater total energy
        return (8.0 * Math.sqrt(d / Math.PI));
    }

    function richterOpacity(d) {
        return (1 - (1 - d * 0.1) / 2);
    }

    var keyText = d3.select(keyTextId);

    key.selectAll("key")
        .data(keyData)
        .enter()
        .append("circle")
        .attr("cx", function(d, i) {
            return 35 * i + 55;
        })
        .attr("cy", function(d, i) {
            return 30;
        })
        .attr("fill", richterColors)
        .attr("opacity", richterOpacity)
        .attr("r", richterSize)
        .on("mouseover", function() {
            element = d3.select(this);
            element
                .attr("stroke", highlightColor)
                .attr("stroke-width", 2);
            textIndex = element.data()[0];
            keyText
                .text(keyTextArray[textIndex]);
        })
        .on("mouseout", function() {
            element = d3.select(this);
            element
                .attr("stroke", "none");
            keyText
                .text(keyTextArray[0]);
        });

    key.selectAll("key")
        .data(keyData)
        .enter()
        .append("text")
        .text(function(d) {
            return d.toString();
        })
        .attr("x", function(d, i) {
            return 35 * i + 55 - 4;
        })
        .attr("y", function(d, i) {
            return 60;
        });


    // Now get the quake text
    var quakeText = d3.select(quakeTextId);
    var quakeLink = d3.select(quakeLinkId);
    var sampleQuake = d3.select(sampleQuakeId);
    var loadTime = d3.select(loadTimeId);
    var quakeSelected = false;

    // Now draw the globe
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
        .attr("fill-opacity", 0.0) // Override these with css for globe-outline
        .attr("stroke", "#000000") // Override these with css for globe-outline
        .attr("r", (windowDim+4)/2) // Add a 2 pixel buffer
        .attr("cx", ((windowDim+paddingDim)/2))
        .attr("cy", ((windowDim+paddingDim)/2));


    // Load the GEOJSON data for the countries
    d3.json(countriesJSON, function(collection) {
      feature = svg.selectAll("path")
          .data(collection.features)
        .enter()
          // .insert("svg:path", "quakes")
          .append("svg:path")
          .attr("class", "country")
          .attr("d", clip);
                
      function processQuakes(collection) {
              quakes = svg.selectAll("quakes")
                    .data(collection.features)
                    .enter()
                    // .insert('svg:circle', 'path')
                    .append("svg:circle")
                    .on("mouseover", function(d) {
                        // First unhighlight the rest of quakes
                        quakes.attr("stroke", "none");
                        element = d3.select(this);
                        element
                            .attr("stroke", highlightColor)
                            .attr("stroke-width", 2);
                        var quakeDate = new Date(d.properties.time * 1000);
                        quakeText
                            .attr("href", d.properties.url)
                            .attr("class", "true-quake-text")
                            .text(d.properties.mag.toString() + "-magnitude earthquake " +
                                    d.properties.place + " at " + quakeDate.toString());
                        quakeLink
                            .attr('href', d.properties.url)
                            .text("  (Link)  ");

                        var demoQuake = quakeSVG.selectAll("circle");

                        demoQuake
                          .attr("stroke", highlightColor)
                          .attr("r", richterSize(d.properties.mag))
                          .attr("opacity", richterOpacity(d.properties.mag))
                          .attr("fill", richterColors(d.properties.mag));

                    })
                    .attr("class", "quake")
                    .attr("fill", function(d) {
                        return richterColors(d.properties.mag);
                    })
                    .attr("cx", function(d) {
                        return projection(d.geometry.coordinates)[0];
                    })
                    .attr("cy", function(d) {
                        return projection(d.geometry.coordinates)[1];
                    })
                    .attr("r", function(d) {
                        return richterSize(d.properties.mag);
                    });
             loaded = true;
             refresh();
          }
      
        
      if (useJSONP) {
          function eqfeed_callback(collection) {
                processQuakes(collection);
                console.log("Successfully downloaded USGS data.");
          }
          jQuery.ajax({
              url: earthQuakesJSON,
              dataType: 'jsonp',
              data: '',
              success: eqfeed_callback
          });
      } else {
          d3.json(earthQuakesJSON, processQuakes(collection));                    
      }

      // Add the blank quake outline
      var quakeSVG = sampleQuake.append("svg")
                        .attr("width", 50)
                        .attr("height", 50);
      quakeSVG
        .selectAll("sample-quake")
        .data([0])
        .enter()
        .append("circle")
        .attr("r", 10)
        .attr("cx", 25)
        .attr("cy", 25)
        .attr("fill", "#C9C9C9")
        .attr("class", "sample-quake");

      // Finally update the data load time
      var currentDate = new Date();
      var format = d3.time.format("%A %B %e, %Y."); //  at %H:%M:%S
      // loadTime
      //   .text(format(currentDate));
    });

    // Timer before selection changes focus
    // Now rotate the globe
    function spin() {
        t0 = Date.now();
        origin = projection.origin();
        d3.timer(function() {
            var t = Date.now() - t0;

            // Don't refresh until everything is rendered... ah ha
            if (t > 500 && loaded) {
                var o = [origin[0] + (t - 500) * velocity[0], origin[1] + (t - 500) * velocity[1]];
                projection.origin(o);
                circle.origin(o);
                refresh();
            }
            return stopRotating;
        });
    }
    spin();

    // Add the "resume" rotation text
    var resume = d3.select(resumeId);

    resume
        .attr("class", "resume-playing")
        .on("click", function() {
            if (stopRotating) {
                stopRotating = false;
                resume.attr("class", "resume-playing");
                spin();
            } else {
                resume.attr("class", "resume-stopped");
                stopRotating = true;
            }
        });

    // Now finally draw the right bounding arc
    if (arcWidth !== 0) {
        var outerR = 325;
        var innerR;
        if (arcWidth < 0) {
            innerR = 0;
        } else {
            innerR = outerR - arcWidth;
        }
        var arc = d3.svg.arc()
            .startAngle(function(d) {return (Math.PI * 0.15);})
            .endAngle(function(d) {return (Math.PI * 0.85);})
            .innerRadius(function(d) {return innerR;})
            .outerRadius(function(d) {return outerR;});
            // .startAngle(function(d) { return d.x; })
             // .endAngle(function(d) { return d.x + d.dx; })
             // .innerRadius(function(d) { return Math.sqrt(d.y); })
             // .outerRadius(function(d) { return Math.sqrt(d.y + d.dy); });

        svg.selectAll("bounding-arc")
            .data([1])
            .enter()
            .insert("svg:path", "circle")
            // .append("svg:path")
            .attr("transform", ("translate(" + 325 + ", " + 325 + ")"))
            .attr("class", "bounding-arc")
            .attr("d", arc);
    }




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