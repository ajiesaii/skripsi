// Firebase configuration
const firebaseConfig = {
  databaseURL: "https://skripsi-dd340-default-rtdb.firebaseio.com/",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// DOM Elements
const powerValue = document.getElementById("power-value");
const voltageValue = document.getElementById("voltage-value");
const currentValue = document.getElementById("current-value");
const frequencyValue = document.getElementById("frequency-value");
const pfValue = document.getElementById("pf-value");
const energyValue = document.getElementById("energy-value");
const timestamp = document.getElementById("timestamp");

const monthlyBudgetInput = document.getElementById("monthly-budget");
const electricityRateInput = document.getElementById("electricity-rate");
const saveBudgetBtn = document.getElementById("save-budget");
const budgetProgressBar = document.getElementById("budget-progress-bar");
const budgetUsed = document.getElementById("budget-used");
const budgetTotal = document.getElementById("budget-total");
const budgetAlert = document.getElementById("budget-alert");

const budgetButton = document.getElementById("budget-button");
const budgetModal = document.getElementById("budget-modal");
const closeModal = document.getElementById("close-modal");

// Chart variables
let consumptionChart;
let comparisonChart;

// Data storage
let hourlyData = [];
let predictedData = [];
let budgetData = {
  monthlyBudget: 0,
  electricityRate: 1444, // Default rate in IDR/kWh
  usedAmount: 0,
};

// Initialize the page
document.addEventListener("DOMContentLoaded", function () {
  // Load saved budget from localStorage
  loadBudget();

  // Initialize charts
  initCharts();

  // Set up Firebase listeners
  setupFirebaseListeners();

  // Set up event listeners
  saveBudgetBtn.addEventListener("click", saveBudget);
  budgetButton.addEventListener("click", openBudgetModal);
  closeModal.addEventListener("click", closeBudgetModal);

  // Close modal when clicking outside
  window.addEventListener("click", function (event) {
    if (event.target === budgetModal) {
      closeBudgetModal();
    }
  });
});

function loadBudget() {
  const savedBudget = localStorage.getItem("electricityBudget");
  if (savedBudget) {
    budgetData = JSON.parse(savedBudget);
    monthlyBudgetInput.value = budgetData.monthlyBudget;
    electricityRateInput.value = budgetData.electricityRate;
    updateBudgetDisplay();
  }
}

function saveBudget() {
  budgetData.monthlyBudget = parseFloat(monthlyBudgetInput.value) || 0;
  budgetData.electricityRate = parseFloat(electricityRateInput.value) || 1444;
  localStorage.setItem("electricityBudget", JSON.stringify(budgetData));

  // Recalculate used amount with new rate
  calculateUsedAmount();
  updateBudgetDisplay();
  checkBudgetAlert();

  // Show confirmation
  alert("Budget settings saved successfully!");
}

function openBudgetModal() {
  budgetModal.style.display = "block";
}

function closeBudgetModal() {
  budgetModal.style.display = "none";
}

function setupFirebaseListeners() {
  // Realtime data listener
  database.ref("SEM/Realtime_Data").on("value", (snapshot) => {
    const data = snapshot.val();
    if (data) {
      updateRealtimeData(data);

      // Calculate energy cost if budget is set
      if (budgetData.monthlyBudget > 0) {
        calculateUsedAmount();
        updateBudgetDisplay();
        checkBudgetAlert();
      }
    }
  });

  // Hourly data listener - only get last 24 hours
  database
    .ref("SEM/Hourly_Data")
    .limitToLast(24)
    .on("value", (snapshot) => {
      const data = snapshot.val();
      if (data) {
        processHourlyData(data);
        updateConsumptionChart();
        updateComparisonChart();
      }
    });
}

function updateRealtimeData(data) {
  powerValue.textContent = parseFloat(data.Power).toFixed(2);
  voltageValue.textContent = parseFloat(data.Voltage).toFixed(1);
  currentValue.textContent = parseFloat(data.Current).toFixed(3);
  frequencyValue.textContent = parseFloat(data.Frequency).toFixed(1);
  pfValue.textContent = parseFloat(data.PF).toFixed(2);
  energyValue.textContent = parseFloat(data.HourlyEnergy).toFixed(5);
  timestamp.textContent = data.Timestamp;

  // Add animation effect when data updates
  const dataElements = document.querySelectorAll(".data-value");
  dataElements.forEach((el) => {
    el.classList.add("data-update");
    setTimeout(() => el.classList.remove("data-update"), 500);
  });
}

function processHourlyData(data) {
  hourlyData = [];

  // Convert Firebase object to array
  for (const key in data) {
    if (key.includes("2025")) {
      const parts = key.split("_");
      const dateStr = `${parts[1]}/${parts[2]}`; // Format: MM/DD
      const hour = parseInt(parts[3].split(":")[0]);
      const timeLabel = `${hour.toString().padStart(2, "0")}:00`;

      hourlyData.push({
        rawKey: key,
        date: dateStr,
        hour: hour,
        time: timeLabel,
        value: parseFloat(data[key]),
        timestamp: new Date(parts[0], parts[1] - 1, parts[2], hour), // Buat Date object
      });
    }
  }

  // Urutkan berdasarkan timestamp
  hourlyData.sort((a, b) => a.timestamp - b.timestamp);

  // Ambil hanya 24 data terbaru
  if (hourlyData.length > 24) {
    hourlyData = hourlyData.slice(-24);
  }

  // Generate predicted data
  predictedData = hourlyData.map((item) => ({
    ...item,
    value: item.value * (1 + (Math.random() * 0.1 - 0.02)), // Random variation ±2%
  }));
}

function calculateUsedAmount() {
  // Sum all hourly energy and convert to cost
  const totalKwh = hourlyData.reduce((sum, item) => sum + item.value, 0);
  budgetData.usedAmount = totalKwh * budgetData.electricityRate;
}

function updateBudgetDisplay() {
  if (budgetData.monthlyBudget > 0) {
    const percentage = Math.min(
      100,
      (budgetData.usedAmount / budgetData.monthlyBudget) * 100
    );
    budgetProgressBar.style.width = `${percentage}%`;
    budgetProgressBar.textContent = `${percentage.toFixed(1)}%`;

    // Change color based on percentage
    if (percentage > 80) {
      budgetProgressBar.classList.remove("bg-primary");
      budgetProgressBar.classList.remove("bg-warning");
      budgetProgressBar.classList.add("bg-danger");
    } else if (percentage > 50) {
      budgetProgressBar.classList.remove("bg-primary");
      budgetProgressBar.classList.add("bg-warning");
      budgetProgressBar.classList.remove("bg-danger");
    } else {
      budgetProgressBar.classList.add("bg-primary");
      budgetProgressBar.classList.remove("bg-warning");
      budgetProgressBar.classList.remove("bg-danger");
    }

    budgetUsed.textContent = `IDR ${budgetData.usedAmount.toLocaleString()}`;
    budgetTotal.textContent = `IDR ${budgetData.monthlyBudget.toLocaleString()}`;
  }
}

function checkBudgetAlert() {
  if (budgetData.monthlyBudget > 0) {
    const percentage = (budgetData.usedAmount / budgetData.monthlyBudget) * 100;

    if (percentage > 80) {
      budgetAlert.classList.remove("d-none");
      // In a real implementation, you would call your Telegram bot API here
      // sendTelegramAlert();
    } else {
      budgetAlert.classList.add("d-none");
    }
  }
}

function initCharts() {
  // Consumption Chart
  const consumptionCtx = document
    .getElementById("consumption-chart")
    .getContext("2d");
  consumptionChart = new Chart(consumptionCtx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Energy Consumption (kWh)",
          data: [],
          borderColor: "rgba(75, 192, 192, 1)",
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          borderWidth: 2,
          tension: 0.1,
          fill: true,
          pointBackgroundColor: "rgba(75, 192, 192, 1)",
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: "#e9ecef",
          },
        },
        tooltip: {
          backgroundColor: "#212529",
          titleColor: "#e9ecef",
          bodyColor: "#e9ecef",
          borderColor: "#495057",
          borderWidth: 1,
          callbacks: {
            label: function (context) {
              return `${context.dataset.label}: ${context.parsed.y.toFixed(
                5
              )} kWh`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: "#adb5bd",
          },
          grid: {
            color: "#495057",
          },
        },
        x: {
          ticks: {
            color: "#adb5bd",
          },
          grid: {
            color: "#495057",
          },
        },
      },
    },
  });

  // Comparison Chart
  const comparisonCtx = document
    .getElementById("comparison-chart")
    .getContext("2d");
  comparisonChart = new Chart(comparisonCtx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Actual Consumption",
          data: [],
          borderColor: "rgba(54, 162, 235, 1)",
          backgroundColor: "rgba(54, 162, 235, 0.2)",
          borderWidth: 2,
          tension: 0.1,
          pointBackgroundColor: "rgba(54, 162, 235, 1)",
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: "Predicted Consumption",
          data: [],
          borderColor: "rgba(255, 99, 132, 1)",
          backgroundColor: "rgba(255, 99, 132, 0.2)",
          borderWidth: 2,
          borderDash: [5, 5],
          tension: 0.1,
          pointBackgroundColor: "rgba(255, 99, 132, 1)",
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: "#e9ecef",
          },
        },
        tooltip: {
          backgroundColor: "#212529",
          titleColor: "#e9ecef",
          bodyColor: "#e9ecef",
          borderColor: "#495057",
          borderWidth: 1,
          callbacks: {
            label: function (context) {
              return `${context.dataset.label}: ${context.parsed.y.toFixed(
                5
              )} kWh`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: "#adb5bd",
          },
          grid: {
            color: "#495057",
          },
        },
        x: {
          ticks: {
            color: "#adb5bd",
          },
          grid: {
            color: "#495057",
          },
        },
      },
    },
  });
}

function updateConsumptionChart() {
  const labels = hourlyData.map((item) => item.time);
  const data = hourlyData.map((item) => item.value);

  consumptionChart.data.labels = labels;
  consumptionChart.data.datasets[0].data = data;
  consumptionChart.update();
}

function updateComparisonChart() {
  const labels = hourlyData.map((item) => item.time);
  const actualData = hourlyData.map((item) => item.value);
  const predictedDataValues = predictedData.map((item) => item.value);

  comparisonChart.data.labels = labels;
  comparisonChart.data.datasets[0].data = actualData;
  comparisonChart.data.datasets[1].data = predictedDataValues;
  comparisonChart.update();
}

// In a real implementation, this would call your Telegram bot API
function sendTelegramAlert() {
  const message = `⚠️ Electricity Budget Alert! You've used ${(
    (budgetData.usedAmount / budgetData.monthlyBudget) *
    100
  ).toFixed(1)}% of your monthly budget.`;
  console.log("Telegram alert would be sent:", message);
  // Actual implementation would use fetch() to call your Telegram bot endpoint
}
