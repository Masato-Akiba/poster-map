const map = L.map("map").setView([35.781351, 139.813395], 13); // 中心は一ツ家

// 背景地図はOpenStreetMap
const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Linked Open Addresses Japan',
}).addTo(map);

function legend() {
  var control = L.control({position: 'topright'});
  control.onAdd = function () {

      var div = L.DomUtil.create('div', 'info legend')
      grades = [1, 0.75, 0.5, 0.25, 0]

      div.innerHTML += '<p>凡例</p>';

      var legendInnerContainerDiv = L.DomUtil.create('div', 'legend-inner-container', div);
      legendInnerContainerDiv.innerHTML += '<div class="legend-gradient"></div>';

      var labelsDiv = L.DomUtil.create('div', 'legend-labels', legendInnerContainerDiv);
      for (var i = 0; i < grades.length; i++) {
        labelsDiv.innerHTML += '<span>' + grades[i] * 100 + '%</span>';
      }
      return div;
  };

  return control
}

function getProgressColor(percentage) {

    // Define the color stops
    const colorStops = [
        { pct: 0.0, color: { r: 254, g: 237, b: 222 } }, // #feedde
        { pct: 0.25, color: { r: 253, g: 190, b: 133 } }, // #fdbe85
        { pct: 0.5, color: { r: 253, g: 141, b: 60 } }, // #fd8d3c
        { pct: 0.75, color: { r: 230, g: 85, b: 13 } }, // #e6550d
        { pct: 0.999, color: { r: 166, g: 54, b: 3 } }, // #a63603
        { pct: 1.0, color: { r: 150, g: 0, b: 73 } } // #a63603
    ];

    // Ensure percentage is within bounds
    percentage = Math.max(0, Math.min(1, percentage));

    // Find the two closest color stops
    let lower = colorStops[0];
    let upper = colorStops[colorStops.length - 1];

    for (let i = 1; i < colorStops.length; i++) {
        if (percentage <= colorStops[i].pct) {
            upper = colorStops[i];
            lower = colorStops[i - 1];
            break;
        }
    }

    // Calculate the interpolated color
    const rangePct = (percentage - lower.pct) / (upper.pct - lower.pct);
    const r = Math.round(lower.color.r + rangePct * (upper.color.r - lower.color.r));
    const g = Math.round(lower.color.g + rangePct * (upper.color.g - lower.color.g));
    const b = Math.round(lower.color.b + rangePct * (upper.color.b - lower.color.b));

    // Return the color as a string
    return `rgb(${r}, ${g}, ${b})`;
}

function getGeoJsonStyle(progress) {
  return {
    color: 'black',
    fillColor: getProgressColor(progress),
    fillOpacity: 0.7,
    weight: 2,
  }
}

let areaList;
let progress;

Promise.all([getPostingList(), getPostingProgress()]).then(function(res) {
  areaList = res[0];
  progress = res[1];

  for (let [key, areaInfo] of Object.entries(areaList)) {
    console.log(areaInfo['area_name']);
    let cho_max_number = Number(areaInfo['area_cho_max_number']);

    for(let cho_index = 0; cho_index < cho_max_number; cho_index++){
    let cho_number = cho_index + 1;
    // 丁がない場合
    if(cho_max_number === 1){
            fetch(`https://uedayou.net/loa/東京都足立区${areaInfo['area_name']}.geojson`)
            .then((response) => {
              if (!response.ok) {
                throw new Error(`Failed to fetch geojson for ${areaInfo['area_name']}`);
              }
              return response.json();
            })
            .then((data) => {
              const polygon = L.geoJSON(data, {
                style: getGeoJsonStyle(progress[key]["progresses"][0]),
              });
              polygon.bindPopup(`<b>${areaInfo['area_name']}</b><br>ポスティング進捗: ${(progress[key]["progresses"][0] * 100).toFixed(1)}%<br>担当:<br>実施日:<br>備考:${progress[key]["notes"]}`);
              polygon.addTo(map);
            })
            .catch((error) => {
              console.error('Error fetching geojson:', error);
            });   
            break;
        }
        else
    // 丁が1丁目2丁目・・・とある場合
        {
            fetch(`https://uedayou.net/loa/東京都足立区${areaInfo['area_name']}${cho_number}丁目.geojson`)
            .then((response) => {
              if (!response.ok) {
                throw new Error(`Failed to fetch geojson for ${areaInfo['area_name']}${cho_number}丁目`);
              }
              return response.json();
            })
            .then((data) => {
                const polygon = L.geoJSON(data, {
                  style: getGeoJsonStyle(progress[key]["progresses"][cho_index]),
                });
                polygon.bindPopup(`<b>${areaInfo['area_name']}${cho_number}丁目</b><br>ポスティング進捗: ${(progress[key]["progresses"][cho_index] * 100).toFixed(1)}%<br>担当:<br>実施日:<br>備考:${progress[key]["notes"]}`);
                polygon.addTo(map);
            })
            .catch((error) => {
              console.error('Error fetching geojson:', error);
            }); 
        }
    }
  }
  progressBox((progress['total']*100).toFixed(2), 'topright').addTo(map)
  legend().addTo(map);
}).catch((error) => {
  console.error('Error in fetching data:', error);
});
