myAppModule.
    controller('live_tracking_controller', function ($scope,
        userAccountsService,
        live_tracking_service) {


        $scope.onMapBoxLoad = () => {
            loadTracking();
            loadInActiveStaffLastLocation();
        }

        function loadTracking() {
            var dateNow = new Date();
            var start = new Date(dateNow.getFullYear(), dateNow.getMonth(), dateNow.getDate(), 0, 0, 0).getTime();
            live_tracking_service.
                getTracking(start).
                subscribe(recordings => {
                    loadToMap(recordings);
                })
        }

        function loadInActiveStaffLastLocation() {
            live_tracking_service.
                getStaffLastKnownLocation().
                subscribe(staff => {
                    staff.forEach(_staff => {

                        $scope.addIcon(
                            [_staff.gps.longitude, _staff.gps.latitude], 
                            "", 
                            '/images/icons/stickman.png', 
                            'Last known location.');
                        
                        $scope.addLayer({
                            'id': `${_staff.id}`,
                            'type': 'circle',
                            'source': {
                                "type": "geojson",
                                "data": {
                                    "type": "Feature",
                                    "properties": {},
                                    "geometry": {
                                        "type": "Point",
                                        "coordinates": [_staff.gps.longitude, _staff.gps.latitude]
                                    }
                                }
                            },
                            'paint': {
                                'circle-radius': 5,
                                'circle-color': 'black'
                            }
                        });
                        
                        
                        $scope.map.on('click', `${_staff.id}`, function (e) {
                            addPopup(_staff);
                        });
                        $scope.map.on('mouseenter', `${_staff.id}`, function () {
                            $scope.map.getCanvas().style.cursor = 'pointer';
                        });

                        $scope.map.on('mouseleave', `${_staff.id}`, function () {
                            $scope.map.getCanvas().style.cursor = '';
                        });
                       })
                })
        }

        function addPopup(_staff) {
            var popup = new mapboxgl.Popup({
                closeButton: true,
                closeOnClick: true
            }).
            setLngLat([_staff.gps.longitude, _staff.gps.latitude])
            .setHTML(`<strong>${_staff.name}</strong><br>
                        Group:  <br>
                        Office: ${ _staff.office}<br>
                        Designation: ${ _staff.designation}<br>
                        Location: ${ _staff.gps.latitude} latitude, ${_staff.gps.longitude} longitude<br>
                        Last Seen: <br> ${ moment(new Date(_staff.gps.time)).format('MM/DD/YYYY hh:mm:ss a')}`);

            popup.addTo($scope.map);
        }
        var recordingsDictionary = {};
        async function loadToMap(recordings) {
            recordings.forEach(recording => {
                if (recordingsDictionary[recording.id]) {
                    return;
                }
                recordingsDictionary[recording.id] = recording;
                live_tracking_service.
                    getCoordinates(recording).
                    subscribe(coordinates => {
                        // resolve(coordinates);
                        var source = $scope.map.getSource(recording.id);

                        if (source) {
                            var newCoordinates = coordinates[coordinates.length - 1];
                            updateRecording(recording, [newCoordinates]);
                        } else {
                            initializeRecording(recording);
                            updateRecording(recording, coordinates);
                            userAccountsService.getStaff(recording.staff_id).
                                then(staff => {
                                    recording.staff = staff;
                                    addToSidePanel(recording);
                                });
                            $scope.addIcon(coordinates[0], 'START', '/images/icons/jogging.png', '')
                        }
                        recording.traveled_distance = getDistanceTraveled(recording);
                        $scope.$apply();
                    })
            });
            $scope.toggleSidenav();

        }

        function getDistanceTraveled(recording) {
            var geojson = $scope.map.getSource(recording.id)._data;
            var lines = geojson.features[geojson.features.length - 1];
            var distanceTraveled = 0;

            try {
                distanceTraveled = turf.lineDistance(lines)
            } catch (error) { }

            return distanceTraveled.toFixed(2);
        }

        $scope.recordings = [];
        function addToSidePanel(recording) {
            $scope.recordings.push(recording);
        }

        function initializeRecording(recording) {
            var geojson = {
                'type': 'FeatureCollection',
                'features': []
            }

            $scope.map.addSource(recording.id, {
                'type': 'geojson',
                'data': geojson
            });

            var color = getColor();
            recording.color = color;
            $scope.addLayer({
                id: `route - ${recording.id}`,
                type: 'circle',
                source: recording.id,
                paint: {
                    'circle-radius': 5,
                    'circle-color': color
                },
                filter: ['in', '$type', 'Point']
            })

            $scope.addLayer({
                id: `lines - ${recording.id}`,
                type: 'line',
                source: recording.id,
                layout: {
                    'line-cap': 'round',
                    'line-join': 'round'
                },
                paint: {
                    'line-color': color,
                    'line-width': 2.5
                },
                filter: ['in', '$type', 'LineString']
            });


        }

        function updateRecording(recording, newCoordinates) {
            var geojson = $scope.map.getSource(recording.id)._data;

            if (geojson.features.length > 1) {
                geojson.features.pop();
            }
            newCoordinates.forEach(newCoordinate => {
                var point = {
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Point',
                        'coordinates': newCoordinate
                    },
                    'properties': {
                        'id': String(new Date().getTime())
                    }
                };

                geojson.features.push(point);
            })

            var linestring = {
                'type': 'Feature',
                'geometry': {
                    'type': 'LineString',
                    'coordinates': []
                }
            }

            if (geojson.features.length > 1) {
                linestring.geometry.coordinates = geojson.features.map(function (point) {
                    return point.geometry.coordinates;
                });

                geojson.features.push(linestring);
            }

            var source = $scope.map.getSource(recording.id);
            source.setData(geojson);
        }

        var currentColorIndex = 0;
        function getColor() {
            var colors = [
                "Aqua",
                "Black",
                "Blue",
                "BlueViolet",
                "Brown",
                "BurlyWood",
                "CadetBlue",
                "Chartreuse",
                "Chocolate",
                "Coral",
                "CornflowerBlue",
                "Crimson",
                "Cyan",
                "DarkBlue",
                "DarkCyan",
                "DarkGoldenRod",
                "DarkGreen",
                "DarkKhaki",
                "DarkMagenta",
                "DarkOliveGreen",
                "DarkOrange",
                "DarkOrchid",
                "DarkRed",
                "DarkSalmon",
                "DarkSlateBlue",
                "DarkSlateGray",
                "DarkSlateGrey",
                "DarkTurquoise",
                "DarkViolet",
                "DeepPink",
                "DeepSkyBlue",
                "DimGray",
                "DimGrey",
                "DodgerBlue",
                "FireBrick",
                "ForestGreen",
                "Fuchsia",
                "Gold",
                "GoldenRod",
                "Gray",
                "Grey",
                "Green",
                "GreenYellow",
                "HotPink",
                "IndianRed",
                "Indigo",
                "Khaki",
                "LawnGreen",
                "LemonChiffon",
                "LightBlue",
                "LightCoral",
                "LightGreen",
                "LightPink",
                "LightSalmon",
                "LightSeaGreen",
                "LightSkyBlue",
                "LightSlateGray",
                "LightSlateGrey",
                "LightSteelBlue",
                "Lime",
                "LimeGreen",
                "Magenta",
                "Maroon",
                "MediumAquaMarine",
                "MediumBlue",
                "MediumOrchid",
                "MediumPurple",
                "MediumSeaGreen",
                "MediumSlateBlue",
                "MediumSpringGreen",
                "MediumTurquoise",
                "MediumVioletRed",
                "MidnightBlue",
                "Navy",
                "Olive",
                "OliveDrab",
                "Orange",
                "OrangeRed",
                "Orchid",
                "PaleGoldenRod",
                "PaleGreen",
                "PaleTurquoise",
                "PaleVioletRed",
                "PapayaWhip",
                "PeachPuff",
                "Peru",
                "Pink",
                "Plum",
                "PowderBlue",
                "Purple",
                "RebeccaPurple",
                "Red",
                "RosyBrown",
                "RoyalBlue",
                "SaddleBrown",
                "Salmon",
                "SandyBrown",
                "SeaGreen",
                "SeaShell",
                "Sienna",
                "Silver",
                "SkyBlue",
                "SlateBlue",
                "SlateGray",
                "SlateGrey",
                "Snow",
                "SpringGreen",
                "SteelBlue",
                "Tan",
                "Teal",
                "Thistle",
                "Tomato",
                "Turquoise",
                "Violet",
                "Wheat",
                "White",
                "WhiteSmoke",
                "Yellow",
                "YellowGreen"
            ];
            var color = colors[currentColorIndex];
            currentColorIndex += 1;
            return color;
        }
    }).
    service('live_tracking_service', function () {
        var collection = db.collection('ecan_app_recordings');
        this.getCoordinates = (recording) => {
            return new rxjs.Observable(subscriber => {
                collection.doc(recording.id).collection('Points').onSnapshot(snapshot => {
                    var coordinates = [];
                    snapshot.docs.forEach(document => {
                        var points = document.data();
                        if (points) {
                            points.points.forEach(point => {
                                coordinates.push([point.longitude, point.latitude]);
                            })
                        }
                    })
                    subscriber.next(coordinates);
                })
            })
        }

        this.getTracking = (startingTimeInMS) => {
            return new rxjs.Observable(subscriber => {
                collection.
                    where('time', '>=', startingTimeInMS).
                    orderBy('time', 'asc').
                    onSnapshot(snapshot => {
                        var recordings = snapshot.docs.map(document => {
                            var recording = document.data();
                            recording.id = document.id;
                            return recording;
                        })
                        subscriber.next(recordings);
                    })

            })
        }

        this.getStaffLastKnownLocation = () => {
            return new rxjs.Observable(subscriber => {
                db.
                    collection('staffs').
                    onSnapshot(snapshot => {
                        var staff = snapshot.docs.map(documents => {
                            var _staff = documents.data();
                            return _staff;
                        }).
                            filter(_staff => _staff.gps != null);

                        subscriber.next(staff);
                    })
            })
        }
    })
