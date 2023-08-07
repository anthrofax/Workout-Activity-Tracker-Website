'use strict';
let initID = 1000;

// Workout Class
class Workout {
  date = new Date();
  id = initID + '';
  constructor(coords, distance, duration) {
    this.coords = coords; //[lat, long]
    this.distance = distance; //km
    this.duration = duration; //min
    initID++;
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadance) {
    super(coords, distance, duration);
    this.cadance = cadance;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance; // min/km
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / this.duration; // km/hour
    return this.speed;
  }
}

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

///////////////////////////////////
// Application Class
class App {
  #map;
  #mapEvent;
  #workouts = [];
  #zoomValue = 13;

  constructor() {
    this._getPosition(); // Dengan menuliskan method di constructor function, Method ini akan lansung terpanggil begitu website ter-load oleh pengguna
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener(
      'click',
      this._scrollMapToWorkout.bind(this)
    );
  }

  _getPosition() {
    navigator.geolocation.getCurrentPosition(
      this._loadMap.bind(this),
      function () {
        alert('Could not get your position.');
      }
    );
  }

  _loadMap(position) {
    //Parameter position merupakan objek yang menampung data mengenai posisi kita saat browser berhasil menangkap lokasi kita (konsep nya seperti parameter event pada callback addEventListener, kita bisa bebas dalam memberi nama nya )
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];

    // Menyimpan pengaturan map di dalam sebuah variable, yaitu private field #map
    this.#map = L.map('map').setView(coords, this.#zoomValue);

    // Menampilkan MAP
    // https://tile.openstreetmap.org/{z}/{x}/{y}.png
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Menampilkan marker dari workout yang sudah disimpan sebelumnya di local storage
    this._renderSavedWorkout();

    // Tampil form saat klik map di suatu  titik sekaligus mengambil lokasi dimana user klik map nya
    this.#map.on('click', this._showForm.bind(this));
  }

  //   Menampilkan Form
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  //   Mengubah inputan yang diperlukan pada form sesuai dengan jenis workoutnya (Running/Cycling)
  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const cekInputanAngka = (...inputs) =>
      inputs.every(inpt => Number.isFinite(inpt));
    const cekAngkaPositif = (...inputs) => inputs.every(inpt => inpt > 0);

    e.preventDefault();

    // Ambil data dari isian form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // Melakukan cek validasi pada inputan form
    if (type === 'running') {
      const cadance = +inputCadence.value;

      if (
        !cekInputanAngka(distance, duration, cadance) ||
        !cekAngkaPositif(distance, duration, cadance)
      )
        return alert('Input yang anda masukkan harus berupa angka positif');

      workout = new Running([lat, lng], distance, duration, cadance);
    }

    if (type === 'cycling') {
      const elevationGain = +inputElevation.value;

      if (
        !cekInputanAngka(distance, duration, elevationGain) ||
        !cekAngkaPositif(distance, duration)
      )
        return alert('Input yang anda masukkan harus berupa angka positif');

      workout = new Cycling([lat, lng], distance, duration, elevationGain);
    }

    // Melakukan push data workout ke array
    this.#workouts.push(workout);

    // Menampilkan marker
    this._showMarker(workout);

    // Menampilkan list workout
    this._showWorkoutList(workout);

    // Mengosongkan isian form & menyembunyikan form
    this._hideForm();

    // Menyimpan data workout ke local storate
    this._storeWorkoutToLocal();
  }

  _showMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _showWorkoutList(workout) {
    let html = `<li class="workout workout--${workout.type}" data-id="${
      workout.id
    }">
    <h2 class="workout__title">${workout.description}</h2>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
      } </span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>`;

    if (workout.type === 'running') {
      html += ` <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadance}</span>
        <span class="workout__unit">spm</span>
      </div>
    </li>`;
    }

    if (workout.type === 'cycling') {
      html += `<div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.speed.toFixed(1)}</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${workout.elevationGain}</span>
      <span class="workout__unit">m</span>
    </div>
  </li> `;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  _scrollMapToWorkout(e) {
    const clickedWorkout = e.target.closest('.workout');

    if (!clickedWorkout) return;
    console.log(clickedWorkout);
    console.log(this.#workouts);

    const selectedWorkout = this.#workouts.find(
      workout => workout.id === clickedWorkout.dataset.id
    );

    this.#map.setView(selectedWorkout.coords, this.#zoomValue, {
      animation: true,
      pan: {
        duration: 1,
      },
    });
  }

  _storeWorkoutToLocal() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _renderSavedWorkout() {
    let savedWorkoutsClass;
    const savedWorkouts = JSON.parse(localStorage.getItem('workouts'));

    if (!savedWorkouts) return;

    savedWorkouts.forEach(workout => {
      if (workout.type === 'running') {
        // prettier-ignore
        savedWorkoutsClass = new Running(workout.coords, workout.distance, workout.duration, workout.cadance);
      }

      if (workout.type === 'cycling') {
        // prettier-ignore
        savedWorkoutsClass = new Cycling(workout.coords, workout.distance, workout.duration, workout.elevationGain);
      }
      this.#workouts.push(savedWorkoutsClass);
    });

    this.#workouts.forEach(workout => {
      this._showWorkoutList(workout);
      this._showMarker(workout);
    });
    console.log(this.#workouts);
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
