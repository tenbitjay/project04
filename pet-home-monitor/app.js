(() => {
  "use strict";

  const STORAGE_KEY = "pawprint-home-monitor-v1";
  const avatarStyles = ["", "blue", "lilac", "yellow", "green"];
  const avatarBySpecies = { cat: "🐱", dog: "🐶", rabbit: "🐰", bird: "🐦" };
  const state = loadState();
  const message = document.getElementById("app-message");
  const petDialog = document.getElementById("pet-dialog");
  const cameraButton = document.getElementById("camera-toggle");
  let cameraStream = null;

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return { pets: [], meals: [], movements: [] };
      const parsed = JSON.parse(saved);
      if (!parsed || !Array.isArray(parsed.pets) || !Array.isArray(parsed.meals) || !Array.isArray(parsed.movements)) {
        throw new Error("Saved data has an unexpected format.");
      }
      return parsed;
    } catch (error) {
      document.addEventListener("DOMContentLoaded", () => {
        showMessage(`Couldn't load saved data: ${error.message}`);
      }, { once: true });
      return { pets: [], meals: [], movements: [] };
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      message.textContent = "";
      return true;
    } catch (error) {
      showMessage(`Couldn't save your changes: ${error.message}`);
      return false;
    }
  }

  function showMessage(text) {
    message.textContent = text;
  }

  function dateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function isToday(timestamp) {
    return dateKey(new Date(timestamp)) === dateKey();
  }

  function formatTime(timestamp) {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(timestamp));
  }

  function formatNumber(value) {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
  }

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function petName(id) {
    return state.pets.find(pet => pet.id === id)?.name ?? "Unknown pet";
  }

  function renderPetList() {
    const list = document.getElementById("pet-list");
    list.replaceChildren();
    if (!state.pets.length) {
      list.append(makeElement("p", "empty-pets", "Your pets will appear here once you add them."));
      return;
    }

    state.pets.forEach((pet, index) => {
      const row = makeElement("div", "pet-row");
      const avatar = makeElement("span", `pet-avatar ${avatarStyles[index % avatarStyles.length]}`, avatarBySpecies[pet.species.toLowerCase()] ?? "🐾");
      avatar.setAttribute("aria-hidden", "true");
      const text = makeElement("span", "pet-row-name");
      text.append(document.createTextNode(pet.name));
      text.append(makeElement("span", "pet-row-species", pet.species));
      row.append(avatar, text);
      list.append(row);
    });
  }

  function renderPetOptions() {
    ["feeding-pet", "movement-pet"].forEach(id => {
      const select = document.getElementById(id);
      const previous = select.value;
      select.replaceChildren();
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = state.pets.length ? "Choose a pet" : "Add a pet first";
      select.append(placeholder);
      state.pets.forEach(pet => {
        const option = document.createElement("option");
        option.value = pet.id;
        option.textContent = pet.name;
        select.append(option);
      });
      if (state.pets.some(pet => pet.id === previous)) select.value = previous;
      select.disabled = state.pets.length === 0;
    });
  }

  function todayMeals() {
    return state.meals.filter(meal => isToday(meal.timestamp));
  }

  function todayMovements() {
    return state.movements.filter(event => isToday(event.timestamp));
  }

  function renderMeals(meals) {
    const list = document.getElementById("feeding-list");
    list.replaceChildren();
    document.getElementById("meal-list-count").textContent = `${meals.length} ${meals.length === 1 ? "entry" : "entries"}`;
    if (!meals.length) {
      list.append(makeElement("p", "empty-state", "No meals logged yet today. Add an entry above to start tracking."));
      return;
    }

    [...meals].sort((a, b) => b.timestamp - a.timestamp).slice(0, 6).forEach(meal => {
      const row = makeElement("div", "entry-row");
      row.append(makeElement("span", "entry-food-icon", "◉"));
      const main = makeElement("div", "entry-main");
      main.append(makeElement("p", "entry-title", `${petName(meal.petId)} · ${meal.food}`));
      main.append(makeElement("p", "entry-detail", `${formatNumber(meal.quantity)} pieces · ${formatTime(meal.timestamp)}`));
      const calories = makeElement("span", "entry-calories", `${formatNumber(meal.calories)} kcal`);
      calories.append(makeElement("small", "", `${formatNumber(meal.caloriesPerPiece)} kcal / piece`));
      row.append(main, calories);
      list.append(row);
    });
  }

  function renderCalorieBreakdown(meals, totalCalories) {
    const breakdown = document.getElementById("calorie-breakdown");
    breakdown.replaceChildren();
    if (!state.pets.length) {
      breakdown.append(makeElement("p", "empty-breakdown", "Add your pets to see their individual totals."));
      return;
    }
    if (!meals.length) {
      breakdown.append(makeElement("p", "empty-breakdown", "Your pets' totals will show here after a meal is logged."));
      return;
    }

    state.pets.forEach((pet, index) => {
      const calories = meals.filter(meal => meal.petId === pet.id).reduce((sum, meal) => sum + meal.calories, 0);
      if (!calories) return;
      const row = makeElement("div", "breakdown-row");
      row.append(makeElement("span", "breakdown-name", pet.name));
      const track = makeElement("div", "progress-track");
      const fill = makeElement("div", "progress-fill");
      fill.style.width = `${totalCalories ? Math.max(4, calories / totalCalories * 100) : 0}%`;
      fill.style.backgroundColor = ["#88a883", "#8ba6ae", "#a493b0", "#c5a36d", "#8ca996"][index % 5];
      track.append(fill);
      row.append(track, makeElement("span", "breakdown-value", `${formatNumber(calories)}`));
      breakdown.append(row);
    });
  }

  function renderMovements(movements) {
    const list = document.getElementById("movement-list");
    list.replaceChildren();
    document.getElementById("movement-list-count").textContent = `${movements.length} ${movements.length === 1 ? "note" : "notes"}`;
    if (!movements.length) {
      list.append(makeElement("p", "empty-state", "No movement notes yet today. Add what you notice around the house."));
      return;
    }
    [...movements].sort((a, b) => b.timestamp - a.timestamp).slice(0, 6).forEach(event => {
      const row = makeElement("div", "movement-row");
      row.append(makeElement("span", "movement-icon", "⌁"));
      const main = makeElement("div");
      main.append(makeElement("p", "movement-title", `${petName(event.petId)} · ${event.activity}`));
      main.append(makeElement("p", "movement-detail", `${event.location} · ${formatNumber(event.duration)} min`));
      row.append(main, makeElement("span", "movement-time", formatTime(event.timestamp)));
      list.append(row);
    });
  }

  function renderDashboard() {
    const meals = todayMeals();
    const movements = todayMovements();
    const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);
    document.getElementById("calorie-total").textContent = formatNumber(totalCalories);
    document.getElementById("pet-total").textContent = String(state.pets.length);
    document.getElementById("meal-total").textContent = String(meals.length);
    document.getElementById("movement-total").textContent = String(movements.length);
    document.getElementById("calorie-caption").textContent = meals.length ? `For ${state.pets.length ? "your pets" : "today's entries"}` : "From today's feeding entries";
    renderPetList();
    renderPetOptions();
    renderMeals(meals);
    renderCalorieBreakdown(meals, totalCalories);
    renderMovements(movements);
  }

  function openPetDialog() {
    petDialog.showModal();
  }

  document.getElementById("today-label").textContent = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(new Date());
  document.getElementById("date-pill-label").textContent = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(new Date());
  document.getElementById("open-pet-form").addEventListener("click", openPetDialog);
  document.getElementById("open-pet-form-top").addEventListener("click", openPetDialog);
  document.querySelector(".close-dialog").addEventListener("click", () => petDialog.close());

  document.getElementById("pet-form").addEventListener("submit", event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    state.pets.push({
      id: crypto.randomUUID(),
      name: data.get("name").trim(),
      species: data.get("species"),
      tag: data.get("tag").trim()
    });
    if (saveState()) {
      form.reset();
      petDialog.close();
      renderDashboard();
    }
  });

  document.getElementById("feeding-form").addEventListener("submit", event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const quantity = Number(data.get("quantity"));
    const caloriesPerPiece = Number(data.get("caloriesPerPiece"));
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(caloriesPerPiece) || caloriesPerPiece < 0) {
      showMessage("Enter a positive quantity and a non-negative calorie value.");
      return;
    }
    state.meals.push({
      id: crypto.randomUUID(),
      petId: data.get("pet"),
      food: data.get("food").trim(),
      quantity,
      caloriesPerPiece,
      calories: quantity * caloriesPerPiece,
      timestamp: Date.now()
    });
    if (saveState()) {
      form.reset();
      renderDashboard();
    }
  });

  document.getElementById("movement-form").addEventListener("submit", event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const duration = Number(data.get("duration"));
    if (!Number.isFinite(duration) || duration <= 0) {
      showMessage("Enter a movement duration greater than zero.");
      return;
    }
    state.movements.push({
      id: crypto.randomUUID(),
      petId: data.get("pet"),
      location: data.get("location").trim(),
      activity: data.get("activity").trim(),
      duration,
      timestamp: Date.now()
    });
    if (saveState()) {
      form.reset();
      renderDashboard();
    }
  });

  async function toggleCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      cameraStream = null;
      document.getElementById("camera-video").srcObject = null;
      document.getElementById("camera-video").hidden = true;
      document.getElementById("camera-placeholder").hidden = false;
      document.getElementById("camera-status").textContent = "OFFLINE";
      document.querySelector(".camera-status").classList.remove("active");
      cameraButton.textContent = "Start camera";
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      showMessage("Camera access requires a supported browser and a secure page (HTTPS or localhost).");
      return;
    }
    cameraButton.disabled = true;
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      const video = document.getElementById("camera-video");
      video.srcObject = cameraStream;
      video.hidden = false;
      document.getElementById("camera-placeholder").hidden = true;
      document.getElementById("camera-status").textContent = "LIVE PREVIEW";
      document.querySelector(".camera-status").classList.add("active");
      cameraButton.textContent = "Stop camera";
      message.textContent = "";
    } catch (error) {
      showMessage(`Couldn't start camera: ${error.message}`);
    } finally {
      cameraButton.disabled = false;
    }
  }

  cameraButton.addEventListener("click", toggleCamera);
  window.addEventListener("pagehide", () => {
    cameraStream?.getTracks().forEach(track => track.stop());
  });

  document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
      document.querySelectorAll(".nav-link").forEach(item => item.classList.remove("active"));
      link.classList.add("active");
    });
  });

  renderDashboard();
})();
