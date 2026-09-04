// ==========================================
// PACKCHECK FRONTEND
// Dynamic Stats + Dynamic History
// ==========================================


// ==========================================
// ELEMENTS
// ==========================================

const fileInput = document.getElementById("fileInput");
const fileName = document.getElementById("fileName");
const uploadBox = document.getElementById("uploadBox");
const mockResult = document.getElementById("mockResult");
const faceWidthCmInput = document.getElementById("faceWidthCm");
const faceHeightCmInput = document.getElementById("faceHeightCm");
const moldedLettersInput = document.getElementById("moldedLetters");
const scalePresets = document.getElementById("scalePresets");

let lastScanFile = null;


// ==========================================
// BACKEND
// ==========================================

const BACKEND_URL = "http://localhost:3000";


// ==========================================
// LOCAL STORAGE
// ==========================================

const HISTORY_KEY = "packcheck_history";


// ==========================================
// SMOOTH SCROLL
// ==========================================

function scrollToSection(id) {

  document.getElementById(id)?.scrollIntoView({
    behavior: "smooth"
  });

}


// ==========================================
// LOGIN
// ==========================================

function showLogin() {

  document
    .getElementById("loginModal")
    ?.classList.add("show");

}


function closeLogin() {

  document
    .getElementById("loginModal")
    ?.classList.remove("show");

}


document
  .getElementById("loginModal")
  ?.addEventListener("click", (event) => {

    if (event.target.id === "loginModal") {
      closeLogin();
    }

  });


// ==========================================
// ESCAPE HTML
// ==========================================

function escapeHTML(value) {

  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


// ==========================================
// CHECK VALUE
// ==========================================

function hasValue(value) {

  return (
    value !== null &&
    value !== undefined &&
    String(value).trim() !== ""
  );

}


// ==========================================
// GET STATUS ICON
// ==========================================

function getStatusIcon(status) {

  if (status === "PASS") {
    return "✓";
  }

  if (status === "FAIL") {
    return "✕";
  }

  return "⚠";

}


// ==========================================
// GET STATUS CLASS
// ==========================================

function getStatusClass(status) {

  if (status === "PASS") {
    return "pass";
  }

  if (status === "FAIL") {
    return "fail";
  }

  return "review";

}


function getScaleInputs() {

  return {
    faceWidthCm: faceWidthCmInput
      ? faceWidthCmInput.value
      : "",
    faceHeightCm: faceHeightCmInput
      ? faceHeightCmInput.value
      : "",
    molded: Boolean(
      moldedLettersInput &&
      moldedLettersInput.checked
    )
  };

}


if (scalePresets) {

  scalePresets.addEventListener("click", (event) => {

    const button = event.target.closest("button[data-cm]");

    if (!button || !faceWidthCmInput) {
      return;
    }

    faceWidthCmInput.value = button.dataset.cm;

    scalePresets
      .querySelectorAll("button")
      .forEach((item) => {
        item.classList.toggle(
          "active",
          item === button
        );
      });

  });

}


// ==========================================
// HISTORY STORAGE
// ==========================================

function getHistory() {

  try {

    const saved =
      localStorage.getItem(HISTORY_KEY);

    if (!saved) {
      return [];
    }

    const parsed =
      JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return [];
    }

    // Remove old/incomplete records that do not contain
    // a real product name.
    const cleaned = parsed.filter(record => {

      if (!record || typeof record !== "object") {
        return false;
      }

      const productName =
        record.product !== null &&
        record.product !== undefined
          ? String(record.product).trim()
          : "";

      return (
        productName !== "" &&
        productName !== "Unknown Product"
      );

    });

    // Save cleaned history back to localStorage.
    // This permanently removes old blank rows.
    if (cleaned.length !== parsed.length) {

      localStorage.setItem(
        HISTORY_KEY,
        JSON.stringify(cleaned.slice(0, 50))
      );

    }

    return cleaned.slice(0, 50);

  } catch (error) {

    console.error(
      "Could not read PackCheck history:",
      error
    );

    return [];

  }

}


// ==========================================
// SAVE HISTORY
// ==========================================

function saveHistory(history) {

  localStorage.setItem(
    HISTORY_KEY,
    JSON.stringify(history)
  );

}


// ==========================================
// ADD HISTORY RECORD
// ==========================================

function addHistoryRecord(data, processingTime) {

  const product =
    data.productInfo || {};

  const compliance =
    data.compliance || {};

  const history =
    getHistory();

  const productName =
    product.productName !== null &&
    product.productName !== undefined
      ? String(product.productName).trim()
      : "";

  // Never create an empty history row.
  const record = {

    id:
      Date.now(),

    product:
      productName ||
      "Product not detected",

    date:
      new Date().toISOString(),

    status:
      compliance.overallStatus ||
      "NEEDS REVIEW",

    processingTime:
      processingTime

  };


  history.unshift(record);


  // Keep only latest 50 inspections
  const limitedHistory =
    history.slice(0, 50);


  saveHistory(limitedHistory);


  updateStats();

  renderHistory();

}


// ==========================================
// FORMAT DATE
// ==========================================

function formatDate(dateString) {

  const date =
    new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  const now =
    new Date();

  const isToday =
    date.toDateString() ===
    now.toDateString();

  if (isToday) {
    return "Today";
  }


  const yesterday =
    new Date();

  yesterday.setDate(
    yesterday.getDate() - 1
  );


  if (
    date.toDateString() ===
    yesterday.toDateString()
  ) {

    return "Yesterday";

  }


  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  );

}


// ==========================================
// RENDER HISTORY
// ==========================================

function renderHistory() {

  const historyList =
    document.getElementById(
      "historyList"
    );

  if (!historyList) {
    return;
  }


  const history =
    getHistory();


  if (history.length === 0) {

    historyList.innerHTML = `

      <div class="history-empty">

        <div class="history-empty-icon">
          ✓
        </div>

        <strong>
          No inspections yet
        </strong>

        <span>
          Scan a product and your inspection
          will appear here.
        </span>

      </div>

    `;

    return;
  }


  historyList.innerHTML =
    history
      .map((record, index) => {

        let statusClass =
          "warn";

        let statusText =
          "Needs Review";


        if (
          record.status ===
          "COMPLIANT"
        ) {

          statusClass =
            "good";

          statusText =
            "Compliant";

        }


        if (
          record.status ===
          "FAIL"
        ) {

          statusClass =
            "fail";

          statusText =
            "Failed";

        }


        const productName =
          hasValue(record.product)
            ? record.product
            : "Product not detected";


        return `

          <div class="table-row">

            <span>
              #${String(
                history.length - index
              ).padStart(4, "0")}
            </span>

            <span class="history-product">
              ${escapeHTML(
                productName
              )}
            </span>

            <span>
              ${formatDate(
                record.date
              )}
            </span>

            <b class="${statusClass}">
              ${statusText}
            </b>

          </div>

        `;

      })
      .join("");

}


// ==========================================
// UPDATE STATS
// ==========================================

function updateStats() {

  const history =
    getHistory();


  const total =
    history.length;


  // ----------------------------------------
  // TOTAL INSPECTIONS
  // ----------------------------------------

  const inspectionsElement =
    document.getElementById(
      "statInspections"
    );

  if (inspectionsElement) {

    inspectionsElement.textContent =
      total;

  }


  // ----------------------------------------
  // PRODUCTS INSPECTED
  // ----------------------------------------

  const productsElement =
    document.getElementById(
      "statProducts"
    );

  if (productsElement) {

    productsElement.textContent =
      total;

  }


  // ----------------------------------------
  // AVERAGE PROCESSING TIME
  // ----------------------------------------

  const times =
    history
      .map(
        item =>
          Number(
            item.processingTime
          )
      )
      .filter(
        time =>
          Number.isFinite(time) &&
          time > 0
      );


  const timeElement =
    document.getElementById(
      "statTime"
    );


  if (timeElement) {

    if (times.length === 0) {

      timeElement.textContent =
        "—";

    } else {

      const average =
        times.reduce(
          (sum, time) =>
            sum + time,
          0
        ) / times.length;


      timeElement.textContent =
        `${average.toFixed(1)}s`;

    }

  }


  // ----------------------------------------
  // PASS RATE
  // ----------------------------------------

  const passElement =
    document.getElementById(
      "statPassRate"
    );


  if (passElement) {

    if (total === 0) {

      passElement.textContent =
        "—";

    } else {

      const compliant =
        history.filter(
          item =>
            item.status ===
            "COMPLIANT"
        ).length;


      const rate =
        (compliant / total) * 100;


      passElement.textContent =
        `${rate.toFixed(0)}%`;

    }

  }


  // ----------------------------------------
  // DASHBOARD STATS
  // ----------------------------------------

  const today =
    new Date().toDateString();


  const todayHistory =
    history.filter(
      item =>
        new Date(
          item.date
        ).toDateString() ===
        today
    );


  const compliant =
    history.filter(
      item =>
        item.status ===
        "COMPLIANT"
    ).length;


  const review =
    history.filter(
      item =>
        item.status ===
          "NEEDS REVIEW" ||
        item.status ===
          "REVIEW"
    ).length;


  const todayElement =
    document.getElementById(
      "dashboardToday"
    );

  if (todayElement) {

    todayElement.textContent =
      todayHistory.length;

  }


  const compliantElement =
    document.getElementById(
      "dashboardCompliant"
    );

  if (compliantElement) {

    compliantElement.textContent =
      compliant;

  }


  const reviewElement =
    document.getElementById(
      "dashboardReview"
    );

  if (reviewElement) {

    reviewElement.textContent =
      review;

  }

}


// ==========================================
// DISPLAY INSPECTION RESULT
// ==========================================

function displayInspectionResult(data) {

  if (!mockResult) {
    return;
  }


  if (!data) {

    fileName.textContent =
      "✕ No response received from backend.";

    return;

  }


  if (!data.productInfo) {

    fileName.textContent =
      "✕ Product information was not returned.";

    return;

  }


  if (!data.compliance) {

    fileName.textContent =
      "✕ Compliance result was not returned.";

    return;

  }


  const product =
    data.productInfo;

  const compliance =
    data.compliance;


  // ========================================
  // STATUS
  // ========================================

  const status =
    compliance.overallStatus ||
    "NEEDS REVIEW";


  let statusClass =
    "review";


  if (status === "COMPLIANT") {
    statusClass =
      "compliant";
  }


  if (status === "FAIL") {
    statusClass =
      "fail";
  }


  // ========================================
  // PRODUCT FIELDS
  // ========================================

  const fields = [

    {
      label: "Product Name",
      value: product.productName
    },

    {
      label: "MRP",
      value: product.mrp
    },

    {
      label: "Net Quantity",
      value: product.netQuantity
    },

    {
      label: "Batch Number",
      value: product.batchNumber
    },

    {
      label: "Packed / Mfg Date",
      value: product.manufacturingDate
    },

    {
      label: "Best Before / Expiry",
      value: product.bestBefore
    },

    {
      label: "Manufacturer",
      value: product.manufacturer
    },

    {
      label: "FSSAI Licence",
      value: product.fssaiLicense
    },

    {
      label: "Customer Care",
      value: product.customerCare
    }

  ];


  // ========================================
  // FIELD CARDS
  // ========================================

  const fieldCards =
    fields
      .map(field => {

        const detected =
          hasValue(
            field.value
          );


        return `

          <div class="inspection-field">

            <div class="inspection-field-header">

              <span class="inspection-field-label">
                ${escapeHTML(
                  field.label
                )}
              </span>

              <span class="${
                detected
                  ? "field-pass"
                  : "field-review"
              }">

                ${
                  detected
                    ? "✓ Detected"
                    : "⚠ Review"
                }

              </span>

            </div>


            <div class="inspection-field-value">

              ${
                detected
                  ? escapeHTML(
                      field.value
                    )
                  : "Not detected"
              }

            </div>

          </div>

        `;

      })
      .join("");


  // ========================================
  // COMPLIANCE CHECKS
  // ========================================

  const checks =
    Array.isArray(
      compliance.checks
    )
      ? compliance.checks
      : [];


  const checksHTML =
    checks
      .map(check => {

        const checkStatus =
          check.status ||
          "REVIEW";


        const checkClass =
          getStatusClass(
            checkStatus
          );


        const icon =
          getStatusIcon(
            checkStatus
          );


        return `

          <div class="compliance-check">

            <div class="compliance-check-left">

              <span class="check-icon-${checkClass}">
                ${icon}
              </span>


              <div>

                <div class="compliance-field">
                  ${escapeHTML(
                    check.field
                  )}
                </div>

                <div class="compliance-message">
                  ${escapeHTML(
                    check.message
                  )}
                </div>

              </div>

            </div>


            ${
              hasValue(check.value)
                ? `
                  <span class="compliance-value">
                    ${escapeHTML(
                      check.value
                    )}
                  </span>
                `
                : ""
            }

          </div>

        `;

      })
      .join("");


  const originalName =
    data.file?.originalName ||
    "Uploaded package";


  // ========================================
  // BUILD RESULT
  // ========================================

  mockResult.innerHTML = `

    <div class="inspection-result">

      <span class="result-label">
        PACKCHECK INSPECTION
      </span>


      <div class="inspection-header">

        <div>

          <h3>
            Inspection Complete
          </h3>

          <p class="inspection-file">
            ${escapeHTML(
              originalName
            )}
          </p>

        </div>


        <div class="overall-status ${statusClass}">

          <span class="overall-status-icon">

            ${
              status === "COMPLIANT"
                ? "✓"
                : status === "FAIL"
                  ? "✕"
                  : "⚠"
            }

          </span>


          <div>

            <div class="overall-status-title">
              ${escapeHTML(status)}
            </div>

            <div class="overall-status-count">

              ${
                Number(
                  compliance.passed
                ) || 0
              }

              passed

              ·

              ${
                Number(
                  compliance.review
                ) || 0
              }

              need review

              ${
                Number(compliance.failed)
                  ? `· ${Number(compliance.failed)} failed`
                  : ""
              }

            </div>

          </div>

        </div>

      </div>


      ${buildFontSizeSection(data.fontSize)}


      <div class="inspection-section">

        <h4>
          Detected Product Information
        </h4>


        <div class="inspection-grid">

          ${fieldCards}

        </div>

      </div>


      <div class="inspection-section">

        <h4>
          Compliance Check
        </h4>


        <div class="compliance-summary">

          <span>
            Total checks:
            ${
              Number(
                compliance.totalChecks
              ) || checks.length
            }
          </span>


          <span>
            ✓
            ${
              Number(
                compliance.passed
              ) || 0
            }
            passed
          </span>


          <span>
            ⚠
            ${
              Number(
                compliance.review
              ) || 0
            }
            review
          </span>

        </div>


        <div class="compliance-list">

          ${
            checksHTML ||
            `
              <div>
                No compliance checks were returned.
              </div>
            `
          }

        </div>

      </div>

    </div>

  `;


  mockResult.style.display =
    "block";


  fileName.textContent =
    `✓ Inspection completed: ${originalName}`;


  mockResult.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

}


// ==========================================
// UPLOAD IMAGE
// ==========================================

async function uploadImage(file) {

  if (!file) {
    return;
  }


  // ========================================
  // FILE TYPE
  // ========================================

  if (!file.type.startsWith("image/")) {

    fileName.textContent =
      "Please select an image file.";

    return;

  }


  // ========================================
  // START TIMER
  // ========================================

  const startTime =
    performance.now();


  fileName.textContent =
    `Analysing ${file.name} with AI vision...`;


  mockResult.style.display =
    "none";


  // ========================================
  // FORM DATA
  // ========================================

  const formData =
    new FormData();


  formData.append(
    "productImage",
    file
  );


  try {

    console.log(
      "Sending image to PackCheck backend..."
    );


    // ======================================
    // SEND REQUEST
    // ======================================

    const response =
      await fetch(
        `${BACKEND_URL}/api/scan`,
        {
          method: "POST",
          body: formData
        }
      );


    // ======================================
    // PROCESSING TIME
    // ======================================

    const endTime =
      performance.now();


    const processingTime =
      (endTime - startTime) / 1000;


    // ======================================
    // JSON
    // ======================================

    let data;


    try {

      data =
        await response.json();

    } catch (jsonError) {

      console.error(
        "Invalid backend JSON:",
        jsonError
      );

      fileName.textContent =
        "✕ Backend returned an invalid response.";

      return;

    }


    console.log(
      "PackCheck backend response:",
      data
    );


    // ======================================
    // ERROR
    // ======================================

    if (!response.ok) {

      fileName.textContent =
        `✕ ${
          data.message ||
          "Failed to process image."
        }`;

      return;

    }


    // ======================================
    // SAVE HISTORY
    // ======================================

    addHistoryRecord(
      data,
      processingTime
    );


    // ======================================
    // SHOW RESULT
    // ======================================

    displayInspectionResult(
      data
    );


  } catch (error) {

    console.error(
      "Upload error:",
      error
    );


    fileName.textContent =
      "✕ Could not connect to PackCheck backend.";

  }

}


// ==========================================
// FILE INPUT
// ==========================================

if (fileInput) {

  fileInput.addEventListener(
    "change",
    () => {

      const file =
        fileInput.files[0];

      uploadImage(file);

    }
  );

}


// ==========================================
// DRAG & DROP
// ==========================================

if (uploadBox) {

  [
    "dragenter",
    "dragover"
  ].forEach(
    eventName => {

      uploadBox.addEventListener(
        eventName,
        event => {

          event.preventDefault();

          event.stopPropagation();

          uploadBox.classList.add(
            "dragging"
          );

        }
      );

    }
  );


  [
    "dragleave",
    "drop"
  ].forEach(
    eventName => {

      uploadBox.addEventListener(
        eventName,
        event => {

          event.preventDefault();

          event.stopPropagation();

          uploadBox.classList.remove(
            "dragging"
          );

        }
      );

    }
  );


  uploadBox.addEventListener(
    "drop",
    event => {

      const file =
        event.dataTransfer.files[0];

      uploadImage(file);

    }
  );

}


// ==========================================
// INITIAL LOAD
// ==========================================

updateStats();

renderHistory();


console.log(
  "PackCheck frontend loaded."
);

console.log(
  "Backend URL:",
  BACKEND_URL
);