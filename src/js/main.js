
window.addEventListener('load', (e) => {
    //var tradObj = { "yes": "Oui", "no": "No" };
    const carte = document.querySelector(".map-container");
    if (!carte) return;
    var macarte = L.map('map').setView([47.297398, -1.393941], 10);
    var attr_osm = '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>';
    L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
        attribution: [attr_osm].join(', '),
        minZoom: 6,
        maxZoom: 30,
        noWrap: true
    }).addTo(macarte);

    const coordinates = document.querySelector(".coordinates");
    const inputRadius = document.querySelector(".input-radius");
    const inputRadiusValue = document.querySelector(".input-radius-value");
    const btnFind = document.querySelector(".btn--find");
    const btnCoords = document.querySelector(".btn--coords");
    const btnGeoloc = document.querySelector(".btn--geoloc");
    const btnCenter = document.querySelector(".btn--center");
    const error = document.querySelector(".error");
    const loader = document.querySelector(".loader");

    if (!coordinates || !inputRadius || !btnFind || !btnCoords || !btnGeoloc || !btnCenter || !error || !inputRadiusValue || !loader) return;
    var theMarker = false;
    var circle = false;

    macarte.on('click', function (e) {
        if (document.body.classList.contains("is-map-clickable")) {
            let correctedLat = e.latlng.wrap().lat;
            let correctedLon = e.latlng.wrap().lng;
            placeMarker(correctedLat, correctedLon);
        }
    });

    inputRadius.addEventListener('input', () => {
        inputRadiusValue.innerText = inputRadius.value < 1000 ? inputRadius.value + " m" : Number(inputRadius.value / 1000).toFixed(2) + " km";
        if (circle) {
            circle.setRadius(inputRadius.value);
        }
    });
    inputRadiusValue.innerText = inputRadius.value < 1000 ? inputRadius.value + " m" : Number(inputRadius.value / 1000).toFixed(2) + " km";


    var toiletIcon = L.icon({
        iconUrl: 'toilet-picto.png',
        iconSize: [35, 40], // size of the icon
        iconAnchor: [17, 40], // point of the icon which will correspond to marker's location
        popupAnchor: [0, -35] // point from which the popup should open relative to the iconAnchor
    });

    var posIcon = L.icon({
        iconUrl: 'marker-picto.png',
        iconSize: [35, 40], // size of the icon
        iconAnchor: [17, 40], // point of the icon which will correspond to marker's location
    });

    var toilets = [];

    btnFind.addEventListener('click', () => {
        clearError();

        if (typeof coordinates.dataset.lat == "undefined" || typeof coordinates.dataset.lon === "undefined") {
            error.innerText = 'Cliquez sur le bouton "Me géolocaliser" ou définissez un point manuellement';
            scrollToTop();
            return;
        }

        loader.classList.add("active");

        fetch('https://www.overpass-api.de/api/interpreter?', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: "[out:json][timeout:25];(node['amenity'='toilets'](around:" + inputRadius.value + "," + coordinates.dataset.lat + "," + coordinates.dataset.lon + ");way['amenity'='toilets'](around:" + inputRadius.value + "," + coordinates.dataset.lat + "," + coordinates.dataset.lon + "););out geom;"
        }).then(x => x.json()).then(json => {
            if (typeof json.elements != 'undefined') {
                toilets.forEach((toilet) => {
                    macarte.removeLayer(toilet);
                });
                toilets = [];
                json.elements.forEach(element => {
                    /*let content = "<div>";

                    if (typeof element.tags != "undefined") {
                        for (const [key, value] of Object.entries(element.tags)) {
                            content += trad(key) + " : " + trad(value) + "<br>";
                        }
                    }
                    content += "</div>";*/
                    let toiletLat;
                    let toiletLon;
                    if (element.type == "node") {
                        toiletLat = element.lat;
                        toiletLon = element.lon;
                    } else {
                        let toiletCoords = getAverageCoordinatesFromGeometry(element.geometry);
                        toiletLat = toiletCoords.lat;
                        toiletLon = toiletCoords.lon;
                    }
                    let content = '<a target="_blank" href="https://www.google.fr/maps/dir/' + (coordinates.dataset.lat) + ',' + (coordinates.dataset.lon) + '/' + (toiletLat) + ',' + (toiletLon) + '" class="btn"><span>Go !</span></a>';
                    let toilet = L.marker([toiletLat, toiletLon], { icon: toiletIcon }).addTo(macarte).bindPopup(content);
                    toilets.push(toilet);

                });
            } else {
                error.innerText = 'Une erreur est survenue, veuillez réessayer ultérieurement';
                scrollToTop();
            }
        }).catch(() => {
            error.innerText = 'Une erreur est survenue, veuillez réessayer ultérieurement';
            scrollToTop();
        }).finally(() => {
            loader.classList.remove("active");

        });
    });

    btnGeoloc.addEventListener('click', (e) => {
        clearError();

        if (navigator.geolocation) {
            loader.classList.add("active");

            navigator.geolocation.getCurrentPosition(showPosition);
        } else {
            error.innerText = "La géolocalisation n'est pas supportée";
            scrollToTop();
        }

        function showPosition(position) {
            loader.classList.remove("active");

            placeMarker(position.coords.latitude, position.coords.longitude);

            btnFind.dispatchEvent(new Event("click"));
        }
    });

    btnCenter.addEventListener('click', (e) => {
        if (typeof coordinates.dataset.lat == "undefined" || typeof coordinates.dataset.lon === "undefined") {
            error.innerText = 'Cliquez sur le bouton "Me géolocaliser" ou définissez un point manuellement';
            scrollToTop();
            return;
        }

        macarte.flyTo([coordinates.dataset.lat, coordinates.dataset.lon], 14, {
            animate: true,
            duration: 0.5
        });
    });

    btnCoords.addEventListener("click", (e) => {
        if (!document.body.classList.contains("is-map-clickable")) {
            document.body.classList.add("is-map-clickable");
            btnCoords.querySelector("span").innerText = "Cliquez sur la carte pour définir votre position, puis cliquez à nouveau sur ce bouton pour confirmer";
        } else {
            document.body.classList.remove("is-map-clickable");
            btnCoords.querySelector("span").innerText = "Définir un point manuellement";
        }
    });

    function placeMarker(lat, lon) {
        coordinates.dataset.lat = lat;
        coordinates.dataset.lon = lon;

        macarte.flyTo([lat, lon], 13, {
            animate: true,
            duration: 0.5
        });

        coordinates.innerText = convertCoordinates(lat, true) + " " + convertCoordinates(lon, false)

        //Clear existing marker, 
        if (theMarker) {
            macarte.removeLayer(theMarker);
            macarte.removeLayer(circle);
        };

        //Add a marker to show where you clicked.
        theMarker = L.marker([lat, lon], { icon: posIcon }).addTo(macarte);
        circle = L.circle([lat, lon], { radius: inputRadius.value }).addTo(macarte);

        toilets.forEach((toilet) => {
            macarte.removeLayer(toilet);
        });
        toilets = [];
    }


    function convertCoordinates(coord, isLat) {
        let degrees = Math.trunc(coord);
        let minutes = (Math.abs(coord) - Math.abs(degrees)) * 60;
        let sign = Math.sign(degrees);
        let letter = '';
        if (sign == 1) {
            letter = isLat ? "N" : "E";
        } else {
            letter = isLat ? "S" : "W";
        }
        return letter + ("" + Math.abs(degrees)).padStart(isLat ? 2 : 3, '0') + "°" + (("" + minutes.toFixed(3)).padStart(6, '0'));
    }

    function clearError() {
        error.innerText = "";
    }

    function scrollToTop() {
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'smooth'
        });
    }

    /*function trad(word) {
        if (typeof tradObj[word.toLowerCase()] != "undefined") {
            return tradObj[word.toLowerCase()];
        } else {
            return word;
        }
    }*/

    function getAverageCoordinatesFromGeometry(geometry) {
        const toRadians = (deg) => (deg * Math.PI) / 180;
        const toDegrees = (rad) => (rad * 180) / Math.PI;

        // Somme des coordonnées en 3D (cartésiennes)
        const cartesianSum = geometry.reduce(
            (acc, point) => {
                const latRad = toRadians(point.lat);
                const lonRad = toRadians(point.lon);

                acc.x += Math.cos(latRad) * Math.cos(lonRad);
                acc.y += Math.cos(latRad) * Math.sin(lonRad);
                acc.z += Math.sin(latRad);
                return acc;
            },
            { x: 0, y: 0, z: 0 }
        );

        // Moyenne des points cartésiens
        const totalPoints = geometry.length;
        const avgX = cartesianSum.x / totalPoints;
        const avgY = cartesianSum.y / totalPoints;
        const avgZ = cartesianSum.z / totalPoints;

        // Reconvertir les coordonnées cartésiennes en latitude/longitude
        const lon = Math.atan2(avgY, avgX);
        const hyp = Math.sqrt(avgX * avgX + avgY * avgY);
        const lat = Math.atan2(avgZ, hyp);

        // Retourner la moyenne en degrés
        return {
            lat: toDegrees(lat),
            lon: toDegrees(lon)
        };
    }
})