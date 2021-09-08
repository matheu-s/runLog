'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workouts {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(distance, duration, coords) {
    this.distance = distance; // in KM
    this.duration = duration; // in Min
    this.coords = coords; // [lat, lng]
  }

  createDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workouts {
  type = 'running';
  constructor(distance, duration, coords, cadence) {
    super(distance, duration, coords);
    this.cadence = cadence;
    //Imediatly calculates the pace and description
    this.calcPace();
    this.createDescription();
  }

  calcPace() {
    //Pace is min/km
    this.pace = this.duration / this.distance;
  }
}

class Cycling extends Workouts {
  type = 'cycling';
  constructor(distance, duration, coords, elevation) {
    super(distance, duration, coords);
    this.elevation = elevation;
    //Imediatly calculates the speed and descript
    this.calcSpeed();
    this.createDescription();
  }
  calcSpeed() {
    //Speed is distance/duration
    let convertMinToH = this.min / 60;
    this.speed = this.distance / convertMinToH;
  }
}

// const run1 = new Running(5, 30, [37, -51], 125);
// const cyc1 = new Cycling(12, 20, [51, -9], 84);

// console.log(run1);
// console.log(cyc1);

class App {
  workouts = [];
  #map;
  #mapEvent;
  constructor() {
    //Code that is automatically executed when create a new object, so we can put the eventsListeners here
    this.#getPosition();
    form.addEventListener('submit', this.#newWorkout.bind(this));
    inputType.addEventListener('change', this.#toggleElevationField.bind(this));
    containerWorkouts.addEventListener('click', this.moveToMark.bind(this));
    this.#getLocalStorage();
  }

  #getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this.#loadMap.bind(this),
        function () {
          alert('Error to get your location');
        }
      );
    } else {
      alert('Your browser does not support this application');
    }
  }

  #loadMap(position) {
    const { latitude, longitude } = position.coords;
    const coordinates = [latitude, longitude];
    this.#map = L.map('map').setView(coordinates, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this.#showForm.bind(this));

    //we are gonna put it here, because it takes a little long to load the map, and if we call it before, will return error
    this.workouts.forEach(work => this.#renderWorkout(work));
  }

  #showForm(mapE) {
    this.#mapEvent = mapE;

    form.classList.remove('hidden');
    inputDistance.focus();
  }

  #hideForm() {
    //Clear form
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
        '';

    //we immediatly remove the form
    form.style.display = 'none';
    form.classList.add('hidden');
    //then we add it again after 1s, to tricky the transition property
    setInterval(() => (form.style.display = 'grid'));
  }

  #toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  #newWorkout(e) {
    //Helper functions to validate the inptus
    const allFinites = (...inputs) => inputs.every(inp => Number.isFinite(inp));
    const allPositives = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    //Coordinates
    let { lat, lng } = this.#mapEvent.latlng;
    const coordinatesClick = [lat, lng];

    //Using the inputs

    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    if (type === 'running') {
      const cadence = +inputCadence.value;

      if (
        !allFinites(distance, duration, cadence) ||
        !allPositives(distance, duration, cadence)
      ) {
        return alert('Fields must be positive numbers ;)');
      }
      let currWorkoutRun = new Running(
        distance,
        duration,
        coordinatesClick,
        cadence
      );

      this.workouts.push(currWorkoutRun);
      this.#renderWorkout(currWorkoutRun);
      this.#renderWorkoutList(currWorkoutRun);
    }

    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !allFinites(distance, duration, elevation) ||
        !allPositives(distance, duration)
      ) {
        return alert('Fields must be positive numbers ;)');
      }
      let currWorkoutCyc = new Cycling(
        distance,
        duration,
        coordinatesClick,
        elevation
      );

      this.workouts.push(currWorkoutCyc);
      this.#renderWorkout(currWorkoutCyc);
      this.#renderWorkoutList(currWorkoutCyc);
    }

    this.#hideForm();

    this.#setLocalStorage();
  }

  #renderWorkout(workout) {
    let currW = workout;
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 200,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  #renderWorkoutList(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <h2 class="workout__title">${workout.description}</h2>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === 'running' ? '🏃' : '🚴‍♀️'
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>`;

    if (workout.type === 'running') {
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
         </div>          
         <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence.toFixed(1)}</span>
            <span class="workout__unit">spm</span>
          </div>
       </li>
      `;
    }

    if (workout.type === 'cycling') {
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevation}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
      `;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  moveToMark(e) {
    //'e' is the event
    //search the closest clicked element with '.workout'
    const workoutEl = e.target.closest('.workout');
    console.log(workoutEl);

    if (!workoutEl) return;

    //We saved the ID into the html too, so here we are using it to get the clicked DOM and find in our workouts array
    const chosenWorkout = this.workouts.find(
      w => w.id === workoutEl.dataset.id
    );
    console.log(chosenWorkout);

    //now lets redirect to that coords, using a leafLeat method
    this.#map.setView(chosenWorkout.coords, 13, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    //each time we click, we save this log, desativate because it is not working when we reload... obj -> string, string -> obj loses its proto
    // chosenWorkout.click();
  }

  #setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.workouts));
  }

  #getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.workouts = data;
    this.workouts.forEach(work => this.#renderWorkoutList(work));
  }

  //clean the local storage
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();

////////////

//Lecture 229 - before refactoring to classes

/* geolocation browser API.. */

// //the first callback functions is in case it workds, the second if is doesnt
// if (navigator.geolocation) {
//   navigator.geolocation.getCurrentPosition(
//     function (position) {
//       const { latitude, longitude } = position.coords;
//       const coordinates = [latitude, longitude];
//       console.log(coordinates);

//       map = L.map('map').setView(coordinates, 13);

//       L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
//         attribution:
//           '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
//       }).addTo(map);

//       //It's basically a addEventListener of the Leafleat library
//       //When we click the map, we open the form
//       map.on('click', function (mapE) {
//         mapEvent = mapE;

//         form.classList.remove('hidden');
//         inputDistance.focus();
//       });
//     },
//     function () {
//       alert(
//         'Could not get your location, please allow it for this website and reload the page.'
//       );
//     }
//   );
// } else {
//   alert('Your browser does not support this application.');
// }

// //When we submit the form, create new marker
// form.addEventListener('submit', function (e) {
//   e.preventDefault();

//   let { lat, lng } = mapEvent.latlng;
//   const coordinatesClick = [lat, lng];
//   L.marker(coordinatesClick)
//     .addTo(map)
//     .bindPopup(
//       L.popup({
//         maxWidth: 200,
//         minWidth: 100,
//         autoClose: false,
//         closeOnClick: false,
//         className: 'running-popup',
//       })
//     )
//     .setPopupContent('Running')
//     .openPopup();

//   //Clear form

//   inputDistance.value =
//     inputCadence.value =
//     inputDuration.value =
//     inputElevation.value =
//       '';
// });

// /*Alternate between running and cycling, we have this special 'change' property, to change for
// Elevation when we select cycling, and for Cadence when running. */
// //Toggle() is: if it hasnt, add. If it has, remove.
// inputType.addEventListener('change', function () {
//   //Select the closes parent with this property
//   inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
//   inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
// });
