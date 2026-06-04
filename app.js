/* ==========================================================================
   APP.JS - APPLICATION ENGINE FOR PREMIUM MULTI-PAGE RESUME BUILDER
   ========================================================================== */

// 1. Initial State Definition
let state = {
  resumeTitle: "Untitled resume",
  enableMultiPage: false,
  themeColor: "#2d527c",
  fontFamily: "Arial MT",
  layoutStyle: "layout-sidebar",
  personalDetails: {
    photo: "",
    firstName: "",
    lastName: "",
    jobPosition: "",
    useHeadline: true,
    email: "",
    phone: "",
    address: "",
    dob: "",
    linkedin: "",
    github: ""
  },
  profileSummary: "",
  employmentHistory: [],
  educationHistory: [],
  achievements: [],
  skills: [],
  technicalSkills: [],
  hobbies: [],
  references: []
};

// History Stacks for Undo/Redo
let historyStack = [];
let redoStack = [];
const MAX_HISTORY = 30;
let isHistoryChange = false;

// Zoom & Theme defaults
let zoomLevel = 1.0;
let fontScale = 14; // Base size for indicator
const fontScaleMap = {
  12: { body: "10.5px", titles: "15px", name: "19px" },
  13: { body: "11.2px", titles: "16.5px", name: "20.5px" },
  14: { body: "12px", titles: "18px", name: "22px" }, // Default
  15: { body: "12.8px", titles: "19.5px", name: "23.5px" },
  16: { body: "13.5px", titles: "21px", name: "25px" }
};

// --------------------------------------------------------------------------
// 2. DOM Initialization
// --------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

function initApp() {
  cacheElements();
  setupEventHandlers();
  
  // Check URL parameters for Firebase Cloud resume load
  const urlParams = new URLSearchParams(window.location.search);
  let resumeId = urlParams.get("id");
  
  if (!resumeId) {
    // Try to load the latest resume from index
    const index = getLocalResumesIndex();
    if (index.length > 0) {
      index.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      resumeId = index[0].id;
    } else {
      // Check if legacy autosave exists to migrate, otherwise create new ID
      resumeId = `local_${Date.now()}`;
    }
    
    // Update URL parameter without reloading page
    const newUrl = `${window.location.origin}${window.location.pathname}?id=${resumeId}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);
  }
  
  loadCloudResume(resumeId);

  // Setup initial Zoom based on screen width
  autoFitZoom();
}

let els = {};
function cacheElements() {
  els = {
    // Header Controls
    resumeTitle: document.getElementById("resume-title"),
    saveStatus: document.getElementById("save-status"),
    btnUndo: document.getElementById("btn-undo"),
    btnRedo: document.getElementById("btn-redo"),
    btnSaveCloud: document.getElementById("btn-save-cloud"),
    btnDownload: document.getElementById("btn-download"),
    chkMultiPage: document.getElementById("chk-multi-page"),
    
    // Quick Actions
    btnLoadExample: document.getElementById("btn-load-example"),
    
    // Accordion Headers
    accordionHeaders: document.querySelectorAll(".accordion-header"),
    
    // Form Inputs
    firstName: document.getElementById("first-name"),
    lastName: document.getElementById("last-name"),
    jobPosition: document.getElementById("job-position"),
    chkUseHeadline: document.getElementById("chk-use-headline"),
    emailAddress: document.getElementById("email-address"),
    phoneNumber: document.getElementById("phone-number"),
    addressStreet: document.getElementById("address-street"),
    dob: document.getElementById("dob"),
    linkedinUrl: document.getElementById("linkedin-url"),
    githubUrl: document.getElementById("github-url"),
    photoInput: document.getElementById("photo-input"),
    photoDropzone: document.getElementById("photo-dropzone"),
    photoPreviewImg: document.getElementById("photo-preview-image"),
    btnRemovePhoto: document.getElementById("btn-remove-photo"),
    dropzonePlaceholder: document.getElementById("dropzone-placeholder"),
    
    profileText: document.getElementById("profile-text"),
    
    // Dynamic List Containers (Left panel)
    employmentList: document.getElementById("employment-list"),
    btnAddEmployment: document.getElementById("btn-add-employment"),
    
    educationList: document.getElementById("education-list"),
    btnAddEducation: document.getElementById("btn-add-education"),
    
    achievementsList: document.getElementById("achievements-list"),
    btnAddAchievement: document.getElementById("btn-add-achievement"),
    
    skillsListContainer: document.getElementById("skills-list"),
    skillInput: document.getElementById("skill-input"),
    btnAddSkill: document.getElementById("btn-add-skill"),

    techSkillsListContainer: document.getElementById("tech-skills-list"),
    techSkillInput: document.getElementById("tech-skill-input"),
    btnAddTechSkill: document.getElementById("btn-add-tech-skill"),

    hobbiesListContainer: document.getElementById("hobbies-list"),
    hobbyInput: document.getElementById("hobby-input"),
    btnAddHobby: document.getElementById("btn-add-hobby"),

    referencesList: document.getElementById("references-list"),
    btnAddReference: document.getElementById("btn-add-reference"),
    
    languagesList: document.getElementById("languages-list"),
    btnAddLanguage: document.getElementById("btn-add-language"),
    
    // Preview Elements Page 1
    previewName: document.getElementById("preview-name"),
    previewHeadline: document.getElementById("preview-headline"),
    previewPhoto: document.getElementById("preview-photo"),
    previewPhotoPlaceholder: document.getElementById("preview-photo-placeholder"),
    
    previewFullname: document.getElementById("txt-preview-fullname"),
    previewEmail: document.getElementById("txt-preview-email"),
    previewPhone: document.getElementById("txt-preview-phone"),
    previewAddress: document.getElementById("txt-preview-address"),
    previewDob: document.getElementById("txt-preview-dob"),
    previewLinkedin: document.getElementById("txt-preview-linkedin"),
    previewGithub: document.getElementById("txt-preview-github"),
    
    previewSkillsContainer: document.getElementById("preview-skills-container"),
    previewLanguagesContainer: document.getElementById("preview-languages-container"),
    previewProfileText: document.getElementById("preview-profile-text"),
    previewEmploymentContainerP1: document.getElementById("preview-employment-container-p1"),
    previewEducationContainerP1: document.getElementById("preview-education-container-p1"),
    previewAchievementsContainerP1: document.getElementById("preview-achievements-container-p1"),

    // Preview Elements Page 2
    previewHobbiesContainer: document.getElementById("preview-hobbies-container"),
    previewTechSkillsContainer: document.getElementById("preview-tech-skills-container"),
    previewEmploymentContainerP2: document.getElementById("preview-employment-container-p2"),
    previewEducationContainerP2: document.getElementById("preview-education-container-p2"),
    previewAchievementsContainerP2: document.getElementById("preview-achievements-container-p2"),
    previewReferencesContainer: document.getElementById("preview-references-container"),
    
    // Preview Floating Toolbar Elements
    a4Wrapper: document.getElementById("a4-wrapper"),
    zoomValue: document.getElementById("zoom-value"),
    btnZoomIn: document.getElementById("btn-zoom-in"),
    btnZoomOut: document.getElementById("btn-zoom-out"),
    fontFamilySelect: document.getElementById("font-family-select"),
    btnTextDecrease: document.getElementById("btn-text-decrease"),
    btnTextIncrease: document.getElementById("btn-text-increase"),
    fontSizeIndicator: document.getElementById("font-size-indicator"),
    colorDots: document.querySelectorAll(".color-dot"),
    themeColorPicker: document.getElementById("theme-color-picker"),
    btnReset: document.getElementById("btn-reset"),
    
    // Modals & Overlays
    shareModal: document.getElementById("share-modal"),
    shareUrl: document.getElementById("share-url"),
    btnCopyUrl: document.getElementById("btn-copy-url"),
    btnCloseModal: document.getElementById("btn-close-modal"),
    loadingOverlay: document.getElementById("loading-overlay"),
    loadingText: document.getElementById("loading-text"),

    // Resumes Dashboard Modals & Buttons
    btnBackDashboard: document.getElementById("btn-back-dashboard"),
    resumesModal: document.getElementById("resumes-modal"),
    resumesListContainer: document.getElementById("resumes-list-container"),
    btnCloseResumesModal: document.getElementById("btn-close-resumes-modal"),
    btnCreateNewResume: document.getElementById("btn-create-new-resume"),
    layoutStyleSelect: document.getElementById("layout-style-select")
  };
}

// --------------------------------------------------------------------------
// 3. Event Handlers Configuration
// --------------------------------------------------------------------------
function setupEventHandlers() {
  // Title Sync
  els.resumeTitle.addEventListener("input", () => {
    state.resumeTitle = els.resumeTitle.value;
    autoSave();
  });

  // Multi-page layout switch
  els.chkMultiPage.addEventListener("change", (e) => {
    state.enableMultiPage = e.target.checked;
    
    // Toggle Section forms visibility depending on layout
    const referencesItem = document.getElementById("section-references").parentElement;
    const hobbiesItem = document.getElementById("section-hobbies").parentElement;
    const techSkillsItem = document.getElementById("section-tech-skills").parentElement;

    syncAllPreviewContent();
    pushHistory();
    autoSave();
  });

  // Accordion Expand/Collapse
  els.accordionHeaders.forEach(header => {
    header.addEventListener("click", () => {
      const parent = header.parentElement;
      const isOpen = parent.classList.contains("active");
      
      // Close all accordions
      document.querySelectorAll(".accordion-item").forEach(item => {
        item.classList.remove("active");
        item.querySelector(".toggle-icon").className = "fa-solid fa-chevron-down toggle-icon";
      });

      if (!isOpen) {
        parent.classList.add("active");
        header.querySelector(".toggle-icon").className = "fa-solid fa-chevron-up toggle-icon";
      }
    });
  });

  // Form Input Bindings (Debounced sync + history push on change)
  setupTextSync(els.firstName, 'personalDetails.firstName', () => syncName());
  setupTextSync(els.lastName, 'personalDetails.lastName', () => syncName());
  setupTextSync(els.jobPosition, 'personalDetails.jobPosition', () => syncHeadline());
  els.chkUseHeadline.addEventListener("change", (e) => {
    state.personalDetails.useHeadline = e.target.checked;
    syncHeadline();
    pushHistory();
    autoSave();
  });
  
  setupTextSync(els.emailAddress, 'personalDetails.email', () => syncContactField("email", els.previewEmail, els.emailAddress));
  setupTextSync(els.phoneNumber, 'personalDetails.phone', () => syncContactField("phone", els.previewPhone, els.phoneNumber));
  setupTextSync(els.addressStreet, 'personalDetails.address', () => syncContactField("address", els.previewAddress, els.addressStreet));
  setupTextSync(els.dob, 'personalDetails.dob', () => syncContactField("dob", els.previewDob, els.dob));
  setupTextSync(els.linkedinUrl, 'personalDetails.linkedin', () => syncContactField("linkedin", els.previewLinkedin, els.linkedinUrl));
  setupTextSync(els.githubUrl, 'personalDetails.github', () => syncContactField("github", els.previewGithub, els.githubUrl));

  setupTextSync(els.profileText, 'profileSummary', () => {
    els.previewProfileText.innerText = state.profileSummary || "Professional summary content...";
    const profileSection = document.getElementById("preview-section-profile");
    profileSection.style.display = state.profileSummary ? "block" : "none";
  });

  // Photo Upload Handler
  els.photoDropzone.addEventListener("click", () => els.photoInput.click());
  els.photoInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) handleImageFile(file);
  });
  
  // Photo Drag and Drop
  els.photoDropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    els.photoDropzone.style.borderColor = "#6366f1";
  });
  els.photoDropzone.addEventListener("dragleave", () => {
    els.photoDropzone.style.borderColor = "var(--border-ui)";
  });
  els.photoDropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    els.photoDropzone.style.borderColor = "var(--border-ui)";
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleImageFile(file);
    }
  });

  els.btnRemovePhoto.addEventListener("click", (e) => {
    e.stopPropagation();
    removeProfilePhoto();
  });

  // Dynamic Add Buttons
  els.btnAddEmployment.addEventListener("click", () => addEmploymentItem());
  els.btnAddEducation.addEventListener("click", () => addEducationItem());
  els.btnAddLanguage.addEventListener("click", () => addLanguageItem());
  els.btnAddReference.addEventListener("click", () => addReferenceItem());
  els.btnAddAchievement.addEventListener("click", () => addAchievementItem());
  
  // Tag Adding
  els.btnAddSkill.addEventListener("click", () => addSkillTag("skills", els.skillInput, renderSkillsTags, syncSkillsPreview));
  els.skillInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkillTag("skills", els.skillInput, renderSkillsTags, syncSkillsPreview);
    }
  });

  els.btnAddTechSkill.addEventListener("click", () => addSkillTag("technicalSkills", els.techSkillInput, renderTechSkillsTags, syncTechSkillsPreview));
  els.techSkillInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkillTag("technicalSkills", els.techSkillInput, renderTechSkillsTags, syncTechSkillsPreview);
    }
  });

  els.btnAddHobby.addEventListener("click", () => addSkillTag("hobbies", els.hobbyInput, renderHobbiesTags, syncHobbiesPreview));
  els.hobbyInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkillTag("hobbies", els.hobbyInput, renderHobbiesTags, syncHobbiesPreview);
    }
  });

  // Undo / Redo
  els.btnUndo.addEventListener("click", () => triggerUndo());
  els.btnRedo.addEventListener("click", () => triggerRedo());

  // Cloud Actions
  els.btnSaveCloud.addEventListener("click", () => saveResumeCloud());
  els.btnDownload.addEventListener("click", () => exportPDF());
  els.btnLoadExample.addEventListener("click", () => loadExampleData());

  // Toolbar Actions
  els.btnZoomIn.addEventListener("click", () => changeZoom(0.05));
  els.btnZoomOut.addEventListener("click", () => changeZoom(-0.05));
  
  els.fontFamilySelect.addEventListener("change", (e) => {
    state.fontFamily = e.target.value;
    document.getElementById("resume-pdf-root").style.fontFamily = `'${e.target.value}', sans-serif`;
    pushHistory();
    autoSave();
  });

  els.btnTextDecrease.addEventListener("click", () => changeFontSize(-1));
  els.btnTextIncrease.addEventListener("click", () => changeFontSize(1));

  // Color selection
  els.colorDots.forEach(dot => {
    dot.addEventListener("click", () => {
      els.colorDots.forEach(d => d.classList.remove("active"));
      dot.classList.add("active");
      const color = dot.dataset.color;
      updateThemeColor(color);
    });
  });

  els.themeColorPicker.addEventListener("input", (e) => {
    els.colorDots.forEach(d => d.classList.remove("active"));
    updateThemeColor(e.target.value);
  });

  els.btnReset.addEventListener("click", () => resetAllFields());
  els.btnCloseModal.addEventListener("click", () => els.shareModal.classList.add("hidden"));
  
  // Copy url button
  els.btnCopyUrl.addEventListener("click", () => {
    els.shareUrl.select();
    navigator.clipboard.writeText(els.shareUrl.value);
    const copyBtn = els.btnCopyUrl;
    const oldText = copyBtn.innerHTML;
    copyBtn.innerHTML = `<i class="fa-solid fa-check"></i> Copied`;
    setTimeout(() => {
      copyBtn.innerHTML = oldText;
    }, 2000);
  });

  // Resumes Manager Event Handlers
  if (els.btnBackDashboard) {
    els.btnBackDashboard.addEventListener("click", (e) => {
      e.preventDefault();
      renderResumesDashboardList();
      els.resumesModal.classList.remove("hidden");
    });
  }

  if (els.btnCloseResumesModal) {
    els.btnCloseResumesModal.addEventListener("click", () => {
      els.resumesModal.classList.add("hidden");
    });
  }

  if (els.layoutStyleSelect) {
    els.layoutStyleSelect.addEventListener("change", (e) => {
      state.layoutStyle = e.target.value;
      updateLayoutTemplate(e.target.value);
      pushHistory();
      autoSave();
    });
  }

  if (els.btnCreateNewResume) {
    els.btnCreateNewResume.addEventListener("click", () => {
      createNewResumeDraft();
    });
  }
}

// Helper setup function for live text inputs syncing
function setupTextSync(inputEl, path, callback) {
  let timeout = null;
  inputEl.addEventListener("input", (e) => {
    const val = e.target.value;
    
    // Update path
    const parts = path.split('.');
    if (parts.length === 2) {
      state[parts[0]][parts[1]] = val;
    } else {
      state[parts[0]] = val;
    }

    if (callback) callback();

    // Debounce pushing history stack to avoid rapid state snapshots
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      pushHistory();
      autoSave();
    }, 400);
  });
}

// --------------------------------------------------------------------------
// 4. Live Sync Engine Definitions
// --------------------------------------------------------------------------
function syncName() {
  const first = state.personalDetails.firstName;
  const last = state.personalDetails.lastName;
  const full = `${first} ${last}`.trim();
  
  els.previewName.innerText = full || "YOUR NAME";
  els.previewFullname.innerText = full || "Your Name";
  
  const nameItem = document.getElementById("preview-item-name");
  if (full) {
    nameItem.style.display = "flex";
  } else {
    nameItem.style.display = "none";
  }
}

function syncHeadline() {
  const headline = state.personalDetails.jobPosition;
  const useHeadline = state.personalDetails.useHeadline;
  
  if (headline && useHeadline) {
    els.previewHeadline.innerText = headline;
    els.previewHeadline.style.display = "block";
  } else {
    els.previewHeadline.innerText = "";
    els.previewHeadline.style.display = "none";
  }
}

function syncContactField(type, previewEl, inputEl) {
  const value = inputEl.value;
  previewEl.innerText = value;
  
  const elementId = `preview-item-${type}`;
  const domNode = document.getElementById(elementId);
  
  if (value) {
    domNode.style.display = "flex";
  } else {
    domNode.style.display = "none";
  }
  
  updateContactSeparators();
}

function updateContactSeparators() {
  const list = document.querySelector(".personal-details-list");
  if (!list) return;
  const items = Array.from(list.querySelectorAll(".detail-item"));
  items.forEach(el => el.classList.remove("last-visible"));
  const visibleItems = items.filter(el => {
    return el.style.display !== "none" && getComputedStyle(el).display !== "none";
  });
  if (visibleItems.length > 0) {
    visibleItems[visibleItems.length - 1].classList.add("last-visible");
  }
}

// --------------------------------------------------------------------------
// 5. Image Loading & Firebase Pipeline
// --------------------------------------------------------------------------
async function handleImageFile(file) {
  els.dropzonePlaceholder.classList.add("hidden");
  els.photoPreviewImg.classList.remove("hidden");
  els.photoPreviewImg.src = URL.createObjectURL(file);
  els.btnRemovePhoto.classList.remove("hidden");

  // Live preview image shows local URL instantly
  els.previewPhoto.src = els.photoPreviewImg.src;
  els.previewPhoto.classList.remove("hidden");
  els.previewPhotoPlaceholder.classList.add("hidden");

  // Cache Base64 representation locally to prevent CORS errors during PDF generation
  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target.result;
    els.photoPreviewImg.dataset.localBase64 = base64;
    els.previewPhoto.dataset.localBase64 = base64;
  };
  reader.readAsDataURL(file);

  // Save base64/upload to state
  try {
    els.saveStatus.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Uploading photo...`;
    
    // Call Firebase upload helper from firebase-config.js (will fall back to base64)
    const photoURL = await uploadProfilePicture(file);
    state.personalDetails.photo = photoURL;
    
    // Update live previews with permanent URL
    els.photoPreviewImg.src = photoURL;
    els.previewPhoto.src = photoURL;
    
    els.saveStatus.innerHTML = `<i class="fa-solid fa-check"></i> Photo loaded`;
    pushHistory();
    autoSave();
  } catch (error) {
    console.error("Photo process error:", error);
  }
}

function removeProfilePhoto() {
  state.personalDetails.photo = "";
  els.photoInput.value = "";
  els.photoPreviewImg.src = "";
  els.photoPreviewImg.classList.add("hidden");
  els.btnRemovePhoto.classList.add("hidden");
  els.dropzonePlaceholder.classList.remove("hidden");
  
  els.previewPhoto.src = "";
  els.previewPhoto.classList.add("hidden");
  els.previewPhotoPlaceholder.classList.remove("hidden");
  
  pushHistory();
  autoSave();
}

// --------------------------------------------------------------------------
// 6. Dynamic Input Management (Lists)
// --------------------------------------------------------------------------

// --- Employment History ---
function addEmploymentItem(data = null) {
  const id = data ? data.id : `emp_${Date.now()}`;
  const item = data || {
    id: id,
    company: "",
    position: "",
    dates: "",
    bullets: [""]
  };

  if (!data) state.employmentHistory.push(item);

  const card = document.createElement("div");
  card.className = "dynamic-item-card";
  card.id = `card-${id}`;
  card.innerHTML = `
    <div class="card-actions">
      <button type="button" class="btn-delete-item" title="Delete job"><i class="fa-solid fa-trash-can"></i></button>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Employer / Company</label>
        <input type="text" class="inp-emp-company" placeholder="e.g. Prime Group" value="${item.company}">
      </div>
      <div class="form-group">
        <label>Job Title</label>
        <input type="text" class="inp-emp-position" placeholder="e.g. HR Executive" value="${item.position}">
      </div>
    </div>
    <div class="form-group">
      <label>Date Range / Location</label>
      <input type="text" class="inp-emp-dates" placeholder="e.g. Jan 2025 - Present" value="${item.dates}">
    </div>
    <div class="form-group">
      <label>Responsibilities & Achievements</label>
      <div class="bullet-list-builder">
        <!-- Bullet points list will load here -->
      </div>
      <button type="button" class="btn-add-item btn-add-bullet" style="padding: 6px; font-size: 11px;">
        <i class="fa-solid fa-plus"></i> Add description bullet
      </button>
    </div>
  `;

  els.employmentList.appendChild(card);

  // Setup list deletion
  card.querySelector(".btn-delete-item").addEventListener("click", () => {
    state.employmentHistory = state.employmentHistory.filter(e => e.id !== id);
    card.remove();
    syncEmploymentPreview();
    pushHistory();
    autoSave();
  });

  // Setup change bindings
  const inpCompany = card.querySelector(".inp-emp-company");
  const inpPosition = card.querySelector(".inp-emp-position");
  const inpDates = card.querySelector(".inp-emp-dates");
  const bulletContainer = card.querySelector(".bullet-list-builder");
  const btnAddBullet = card.querySelector(".btn-add-bullet");

  const updateItemState = () => {
    item.company = inpCompany.value;
    item.position = inpPosition.value;
    item.dates = inpDates.value;
    syncEmploymentPreview();
  };

  let timer = null;
  const triggerDebouncedStateUpdate = () => {
    updateItemState();
    clearTimeout(timer);
    timer = setTimeout(() => {
      pushHistory();
      autoSave();
    }, 400);
  };

  inpCompany.addEventListener("input", triggerDebouncedStateUpdate);
  inpPosition.addEventListener("input", triggerDebouncedStateUpdate);
  inpDates.addEventListener("input", triggerDebouncedStateUpdate);

  // Bullet items rendering
  const renderBullets = () => {
    bulletContainer.innerHTML = "";
    item.bullets.forEach((bullet, bIndex) => {
      const row = document.createElement("div");
      row.className = "bullet-row";
      row.innerHTML = `
        <input type="text" class="inp-bullet" placeholder="e.g. Managed end-to-end payroll..." value="${bullet}">
        <button type="button" class="btn-delete-item btn-delete-bullet"><i class="fa-solid fa-xmark"></i></button>
      `;
      bulletContainer.appendChild(row);

      const inpBullet = row.querySelector(".inp-bullet");
      inpBullet.addEventListener("input", (e) => {
        item.bullets[bIndex] = e.target.value;
        syncEmploymentPreview();
        clearTimeout(timer);
        timer = setTimeout(() => {
          pushHistory();
          autoSave();
        }, 500);
      });

      row.querySelector(".btn-delete-bullet").addEventListener("click", () => {
        item.bullets.splice(bIndex, 1);
        renderBullets();
        syncEmploymentPreview();
        pushHistory();
        autoSave();
      });
    });
  };

  btnAddBullet.addEventListener("click", () => {
    item.bullets.push("");
    renderBullets();
    pushHistory();
  });

  renderBullets();
  syncEmploymentPreview();
  
  if (!data) {
    pushHistory();
    autoSave();
  }
}

function syncEmploymentPreview() {
  els.previewEmploymentContainerP1.innerHTML = "";
  els.previewEmploymentContainerP2.innerHTML = "";

  const sectionP1 = document.getElementById("preview-section-employment-p1");
  const sectionP2 = document.getElementById("preview-section-employment-p2");

  if (state.employmentHistory.length === 0) {
    sectionP1.style.display = "none";
    sectionP2.style.display = "none";
    return;
  }

  // Filter out empty items
  const validItems = state.employmentHistory.filter(item => item.company || item.position || item.dates);
  if (validItems.length === 0) {
    sectionP1.style.display = "none";
    sectionP2.style.display = "none";
    return;
  }

  sectionP1.style.display = "block";

  // Distribute items depending on enableMultiPage toggle
  if (state.enableMultiPage) {
    // Page 1 gets first 3 items
    const p1Items = validItems.slice(0, 3);
    const p2Items = validItems.slice(3);

    p1Items.forEach(item => appendEmploymentDOM(item, els.previewEmploymentContainerP1));
    
    if (p2Items.length > 0) {
      sectionP2.style.display = "block";
      p2Items.forEach(item => appendEmploymentDOM(item, els.previewEmploymentContainerP2));
    } else {
      sectionP2.style.display = "none";
    }
  } else {
    // Single page gets everything
    sectionP2.style.display = "none";
    validItems.forEach(item => appendEmploymentDOM(item, els.previewEmploymentContainerP1));
  }
}

function appendEmploymentDOM(item, containerEl) {
  const div = document.createElement("div");
  div.className = "timeline-item";
  
  let bulletsHtml = "";
  if (item.bullets && item.bullets.length > 0) {
    const activeBullets = item.bullets.filter(b => b.trim() !== "");
    if (activeBullets.length > 0) {
      bulletsHtml = `<ul class="job-bullets">${activeBullets.map(b => `<li>${b}</li>`).join("")}</ul>`;
    }
  }

  div.innerHTML = `
    <div class="timeline-header">
      <span class="job-company">${item.company || "Company"}</span>
      <span class="job-dates">${item.dates || ""}</span>
    </div>
    <div class="job-title">${item.position || "Job Title"}</div>
    ${bulletsHtml}
  `;
  containerEl.appendChild(div);
}

// --- Education History ---
function addEducationItem(data = null) {
  const id = data ? data.id : `edu_${Date.now()}`;
  const item = data || {
    id: id,
    school: "",
    degree: "",
    dates: "",
    description: ""
  };

  if (!data) state.educationHistory.push(item);

  const card = document.createElement("div");
  card.className = "dynamic-item-card";
  card.id = `card-${id}`;
  card.innerHTML = `
    <div class="card-actions">
      <button type="button" class="btn-delete-item" title="Delete entry"><i class="fa-solid fa-trash-can"></i></button>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>School / University</label>
        <input type="text" class="inp-edu-school" placeholder="e.g. University of Kelaniya" value="${item.school}">
      </div>
      <div class="form-group">
        <label>Degree / Certificate</label>
        <input type="text" class="inp-edu-degree" placeholder="e.g. BSc in Business Administration" value="${item.degree}">
      </div>
    </div>
    <div class="form-group">
      <label>Date Range / Location</label>
      <input type="text" class="inp-edu-dates" placeholder="e.g. 2018 - 2022" value="${item.dates}">
    </div>
    <div class="form-group">
      <label>Description (Optional)</label>
      <input type="text" class="inp-edu-desc" placeholder="e.g. Focused on HR analytics..." value="${item.description}">
    </div>
  `;

  els.educationList.appendChild(card);

  // Setup list deletion
  card.querySelector(".btn-delete-item").addEventListener("click", () => {
    state.educationHistory = state.educationHistory.filter(e => e.id !== id);
    card.remove();
    syncEducationPreview();
    pushHistory();
    autoSave();
  });

  // Setup changes
  const inpSchool = card.querySelector(".inp-edu-school");
  const inpDegree = card.querySelector(".inp-edu-degree");
  const inpDates = card.querySelector(".inp-edu-dates");
  const inpDesc = card.querySelector(".inp-edu-desc");

  const updateItemState = () => {
    item.school = inpSchool.value;
    item.degree = inpDegree.value;
    item.dates = inpDates.value;
    item.description = inpDesc.value;
    syncEducationPreview();
  };

  let timer = null;
  const triggerDebouncedStateUpdate = () => {
    updateItemState();
    clearTimeout(timer);
    timer = setTimeout(() => {
      pushHistory();
      autoSave();
    }, 400);
  };

  inpSchool.addEventListener("input", triggerDebouncedStateUpdate);
  inpDegree.addEventListener("input", triggerDebouncedStateUpdate);
  inpDates.addEventListener("input", triggerDebouncedStateUpdate);
  inpDesc.addEventListener("input", triggerDebouncedStateUpdate);

  syncEducationPreview();

  if (!data) {
    pushHistory();
    autoSave();
  }
}

function syncEducationPreview() {
  els.previewEducationContainerP1.innerHTML = "";
  els.previewEducationContainerP2.innerHTML = "";

  const sectionP1 = document.getElementById("preview-section-education-p1");
  const sectionP2 = document.getElementById("preview-section-education-p2");

  if (state.educationHistory.length === 0) {
    sectionP1.style.display = "none";
    sectionP2.style.display = "none";
    return;
  }

  // Filter empty
  const validItems = state.educationHistory.filter(item => item.school || item.degree || item.dates);
  if (validItems.length === 0) {
    sectionP1.style.display = "none";
    sectionP2.style.display = "none";
    return;
  }

  // If multi-page is checked, education renders on Page 2 main column
  if (state.enableMultiPage) {
    sectionP1.style.display = "none";
    sectionP2.style.display = "block";
    validItems.forEach(item => appendEducationDOM(item, els.previewEducationContainerP2));
  } else {
    // Fallback to Page 1
    sectionP2.style.display = "none";
    sectionP1.style.display = "block";
    validItems.forEach(item => appendEducationDOM(item, els.previewEducationContainerP1));
  }
}

function appendEducationDOM(item, containerEl) {
  const div = document.createElement("div");
  div.className = "timeline-item";
  
  let descHtml = "";
  if (item.description) {
    descHtml = `<div class="job-bullets" style="list-style:none; padding-left:0; font-size: 11px;">${item.description}</div>`;
  }

  div.innerHTML = `
    <div class="timeline-header">
      <span class="job-company">${item.school || "School / University"}</span>
      <span class="job-dates">${item.dates || ""}</span>
    </div>
    <div class="job-title">${item.degree || "Degree / Course"}</div>
    ${descHtml}
  `;
  containerEl.appendChild(div);
}

// --- Achievements ---
function addAchievementItem(data = null) {
  const id = data ? data.id : `ach_${Date.now()}`;
  const item = data || {
    id: id,
    text: ""
  };

  if (!data) state.achievements.push(item);

  const card = document.createElement("div");
  card.className = "dynamic-item-card";
  card.id = `card-${id}`;
  card.innerHTML = `
    <div class="card-actions">
      <button type="button" class="btn-delete-item" title="Delete achievement"><i class="fa-solid fa-trash-can"></i></button>
    </div>
    <div class="form-group">
      <label>Achievement Description</label>
      <input type="text" class="inp-ach-text" placeholder="e.g. Academic Merit List recognition" value="${item.text}">
    </div>
  `;

  els.achievementsList.appendChild(card);

  // Setup list deletion
  card.querySelector(".btn-delete-item").addEventListener("click", () => {
    state.achievements = state.achievements.filter(a => a.id !== id);
    card.remove();
    syncAchievementsPreview();
    pushHistory();
    autoSave();
  });

  // Setup change binding
  const inpText = card.querySelector(".inp-ach-text");
  let timer = null;
  inpText.addEventListener("input", (e) => {
    item.text = e.target.value;
    syncAchievementsPreview();
    clearTimeout(timer);
    timer = setTimeout(() => {
      pushHistory();
      autoSave();
    }, 400);
  });

  syncAchievementsPreview();

  if (!data) {
    pushHistory();
    autoSave();
  }
}

function syncAchievementsPreview() {
  els.previewAchievementsContainerP1.innerHTML = "";
  els.previewAchievementsContainerP2.innerHTML = "";

  const sectionP1 = document.getElementById("preview-section-achievements-p1");
  const sectionP2 = document.getElementById("preview-section-achievements-p2");

  if (state.achievements.length === 0) {
    sectionP1.style.display = "none";
    sectionP2.style.display = "none";
    return;
  }

  const validItems = state.achievements.filter(a => a.text.trim() !== "");
  if (validItems.length === 0) {
    sectionP1.style.display = "none";
    sectionP2.style.display = "none";
    return;
  }

  // If multi-page is checked, achievements render on Page 2 main column
  if (state.enableMultiPage) {
    sectionP1.style.display = "none";
    sectionP2.style.display = "block";
    validItems.forEach(item => {
      const li = document.createElement("li");
      li.innerText = item.text;
      els.previewAchievementsContainerP2.appendChild(li);
    });
  } else {
    // Single page fallback to Page 1
    sectionP2.style.display = "none";
    sectionP1.style.display = "block";
    validItems.forEach(item => {
      const li = document.createElement("li");
      li.innerText = item.text;
      els.previewAchievementsContainerP1.appendChild(li);
    });
  }
}

// --- Tag Addition Helpers (Skills, Tech Skills, Hobbies) ---
function addSkillTag(stateKey, inputEl, renderCallback, syncCallback) {
  const val = inputEl.value.trim();
  if (!val) return;

  if (state[stateKey].includes(val)) {
    inputEl.value = "";
    return;
  }

  state[stateKey].push(val);
  inputEl.value = "";

  renderCallback();
  syncCallback();
  
  pushHistory();
  autoSave();
}

// --- Render / Sync Tag lists ---
function renderSkillsTags() {
  renderGenericTags("skills", els.skillsListContainer, renderSkillsTags, syncSkillsPreview);
}
function syncSkillsPreview() {
  els.previewSkillsContainer.innerHTML = "";
  const section = document.getElementById("preview-section-skills");
  if (state.skills.length === 0) {
    section.style.display = "none";
    return;
  }
  section.style.display = "block";
  state.skills.forEach(skill => {
    const li = document.createElement("li");
    li.innerText = skill;
    els.previewSkillsContainer.appendChild(li);
  });
}

function renderTechSkillsTags() {
  renderGenericTags("technicalSkills", els.techSkillsListContainer, renderTechSkillsTags, syncTechSkillsPreview);
}
function syncTechSkillsPreview() {
  els.previewTechSkillsContainer.innerHTML = "";
  const section = document.getElementById("preview-section-tech-skills");
  if (state.technicalSkills.length === 0) {
    section.style.display = "none";
    return;
  }
  
  // Dynamically slide to Page 1 or Page 2 sidebar depending on layout
  if (state.layoutStyle === "layout-ats-modern") {
    // Positioning is managed in updateLayoutTemplate to maintain strict section order
  } else if (state.enableMultiPage) {
    document.querySelector("#page-2 .sidebar-body").appendChild(section);
  } else {
    document.querySelector("#page-1 .sidebar-body").appendChild(section);
  }

  section.style.display = "block";
  state.technicalSkills.forEach(skill => {
    const li = document.createElement("li");
    if (skill.includes(":")) {
      const idx = skill.indexOf(":");
      const category = skill.substring(0, idx);
      const values = skill.substring(idx); // includes the colon itself
      li.innerHTML = `<strong>${category}</strong>${values}`;
    } else {
      li.innerText = skill;
    }
    els.previewTechSkillsContainer.appendChild(li);
  });
}

function renderHobbiesTags() {
  renderGenericTags("hobbies", els.hobbiesListContainer, renderHobbiesTags, syncHobbiesPreview);
}
function syncHobbiesPreview() {
  els.previewHobbiesContainer.innerHTML = "";
  const section = document.getElementById("preview-section-hobbies");
  if (state.hobbies.length === 0) {
    section.style.display = "none";
    return;
  }
  
  // Dynamically slide to Page 1 or Page 2 sidebar depending on layout
  if (state.layoutStyle === "layout-ats-modern") {
    // Positioning is managed in updateLayoutTemplate to maintain strict section order
  } else if (state.enableMultiPage) {
    document.querySelector("#page-2 .sidebar-body").appendChild(section);
  } else {
    document.querySelector("#page-1 .sidebar-body").appendChild(section);
  }

  section.style.display = "block";
  state.hobbies.forEach(hobby => {
    const li = document.createElement("li");
    li.innerText = hobby;
    els.previewHobbiesContainer.appendChild(li);
  });
}

function renderGenericTags(stateKey, containerEl, renderCallback, syncCallback) {
  containerEl.innerHTML = "";
  state[stateKey].forEach(tag => {
    const span = document.createElement("span");
    span.className = "skill-tag";
    span.innerHTML = `
      ${tag}
      <i class="fa-solid fa-times" data-val="${tag}"></i>
    `;
    containerEl.appendChild(span);

    span.querySelector("i").addEventListener("click", (e) => {
      const val = e.target.dataset.val;
      state[stateKey] = state[stateKey].filter(s => s !== val);
      renderCallback();
      syncCallback();
      pushHistory();
      autoSave();
    });
  });
}

// --- Languages ---
function addLanguageItem(data = null) {
  const id = data ? data.id : `lang_${Date.now()}`;
  const item = data || {
    id: id,
    name: "",
    rating: 5
  };

  if (!data) state.languages.push(item);

  const card = document.createElement("div");
  card.className = "dynamic-item-card";
  card.id = `card-${id}`;
  card.innerHTML = `
    <div class="card-actions">
      <button type="button" class="btn-delete-item" title="Delete language"><i class="fa-solid fa-trash-can"></i></button>
    </div>
    <div class="lang-row">
      <div class="form-group">
        <label>Language</label>
        <input type="text" class="inp-lang-name" placeholder="e.g. English" value="${item.name}">
      </div>
      <div class="form-group">
        <label>Proficiency</label>
        <div class="star-rating-selector">
          <!-- selectors -->
        </div>
      </div>
    </div>
  `;

  els.languagesList.appendChild(card);

  // Setup list deletion
  card.querySelector(".btn-delete-item").addEventListener("click", () => {
    state.languages = state.languages.filter(l => l.id !== id);
    card.remove();
    syncLanguagesPreview();
    pushHistory();
    autoSave();
  });

  // ratings selectors
  const ratingContainer = card.querySelector(".star-rating-selector");
  const renderStars = () => {
    ratingContainer.innerHTML = "";
    for (let i = 1; i <= 5; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `rating-circle-btn ${i <= item.rating ? 'active' : ''}`;
      btn.dataset.rating = i;
      ratingContainer.appendChild(btn);

      btn.addEventListener("click", (e) => {
        const rate = parseInt(e.target.dataset.rating);
        item.rating = rate;
        renderStars();
        syncLanguagesPreview();
        pushHistory();
        autoSave();
      });
    }
  };

  const inpName = card.querySelector(".inp-lang-name");
  inpName.addEventListener("input", (e) => {
    item.name = e.target.value;
    syncLanguagesPreview();
    
    // Debounce
    clearTimeout(inpName.timer);
    inpName.timer = setTimeout(() => {
      pushHistory();
      autoSave();
    }, 400);
  });

  renderStars();
  syncLanguagesPreview();

  if (!data) {
    pushHistory();
    autoSave();
  }
}

function syncLanguagesPreview() {
  els.previewLanguagesContainer.innerHTML = "";
  const section = document.getElementById("preview-section-languages");

  if (state.languages.length === 0) {
    section.style.display = "none";
    return;
  }
  section.style.display = "block";

  state.languages.forEach(item => {
    if (!item.name) return;

    const div = document.createElement("div");
    div.className = "lang-preview-item";
    
    let dotsHtml = "";
    for (let i = 1; i <= 5; i++) {
      dotsHtml += `<span class="dot ${i <= item.rating ? 'active' : ''}"></span>`;
    }

    div.innerHTML = `
      <span class="lang-name">${item.name}</span>
      <div class="rating-dots">${dotsHtml}</div>
    `;
    els.previewLanguagesContainer.appendChild(div);
  });
}

// --- References ---
function addReferenceItem(data = null) {
  const id = data ? data.id : `ref_${Date.now()}`;
  const item = data || {
    id: id,
    name: "",
    title: "",
    company: "",
    phone: "",
    email: ""
  };

  if (!data) state.references.push(item);

  const card = document.createElement("div");
  card.className = "dynamic-item-card";
  card.id = `card-${id}`;
  card.innerHTML = `
    <div class="card-actions">
      <button type="button" class="btn-delete-item" title="Delete reference"><i class="fa-solid fa-trash-can"></i></button>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Reference Name</label>
        <input type="text" class="inp-ref-name" placeholder="e.g. Ms. Sanjani Kumarihami" value="${item.name}">
      </div>
      <div class="form-group">
        <label>Job Title</label>
        <input type="text" class="inp-ref-title" placeholder="e.g. Chief Human Resource Officer" value="${item.title}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Company</label>
        <input type="text" class="inp-ref-company" placeholder="e.g. Prime Lands (Pvt) Ltd" value="${item.company}">
      </div>
      <div class="form-group">
        <label>Contact Info (Phone/Email)</label>
        <input type="text" class="inp-ref-contact" placeholder="e.g. +94714756083, sanjani@primelands.lk" value="${item.phone}">
      </div>
    </div>
  `;

  els.referencesList.appendChild(card);

  // Setup list deletion
  card.querySelector(".btn-delete-item").addEventListener("click", () => {
    state.references = state.references.filter(r => r.id !== id);
    card.remove();
    syncReferencesPreview();
    pushHistory();
    autoSave();
  });

  // Setup changes
  const inpName = card.querySelector(".inp-ref-name");
  const inpTitle = card.querySelector(".inp-ref-title");
  const inpCompany = card.querySelector(".inp-ref-company");
  const inpContact = card.querySelector(".inp-ref-contact");

  const updateItemState = () => {
    item.name = inpName.value;
    item.title = inpTitle.value;
    item.company = inpCompany.value;
    item.phone = inpContact.value;
    syncReferencesPreview();
  };

  let timer = null;
  const triggerDebouncedStateUpdate = () => {
    updateItemState();
    clearTimeout(timer);
    timer = setTimeout(() => {
      pushHistory();
      autoSave();
    }, 400);
  };

  inpName.addEventListener("input", triggerDebouncedStateUpdate);
  inpTitle.addEventListener("input", triggerDebouncedStateUpdate);
  inpCompany.addEventListener("input", triggerDebouncedStateUpdate);
  inpContact.addEventListener("input", triggerDebouncedStateUpdate);

  syncReferencesPreview();

  if (!data) {
    pushHistory();
    autoSave();
  }
}

function syncReferencesPreview() {
  els.previewReferencesContainer.innerHTML = "";
  const section = document.getElementById("preview-section-references");

  const validItems = state.references.filter(r => r.name || r.title || r.company);
  if (validItems.length === 0) {
    section.style.display = "none";
    return;
  }
  
  // Appends to Page 2 main column in multi-page mode, and Page 1 main column in single-page mode
  if (state.layoutStyle === "layout-ats-modern") {
    // Positioning is managed in updateLayoutTemplate to maintain strict section order
  } else if (state.enableMultiPage) {
    document.querySelector("#page-2 .resume-main").appendChild(section);
  } else {
    document.querySelector("#page-1 .resume-main").appendChild(section);
  }
  section.className = "main-section";
  section.querySelector("h2").className = "main-section-title";
  els.previewReferencesContainer.className = "references-list";

  section.style.display = "block";

  validItems.forEach(item => {
    const div = document.createElement("div");
    div.className = "reference-item";
    
    // Check if it is a request-only reference
    const isRequestOnly = item.name && item.name.toLowerCase().includes("request") && !item.title && !item.company && !item.phone;
    if (isRequestOnly) {
      div.innerHTML = `
        <span class="ref-contact" style="font-style: italic; color: var(--resume-text-light); font-size: 11px;">
          Available upon request.
        </span>
      `;
    } else {
      let titleLine = item.title ? `<span class="ref-title">${item.title}</span>` : "";
      let companyLine = item.company ? `<span class="ref-company">${item.company}</span>` : "";
      let contactLine = item.phone ? `<span class="ref-contact">${item.phone}</span>` : "";
      div.innerHTML = `
        <span class="ref-name">${item.name || "Reference Name"}</span>
        ${titleLine}
        ${companyLine}
        ${contactLine}
      `;
    }
    els.previewReferencesContainer.appendChild(div);
  });
}

// --- Sync All Inputs from State (Used on History changes / cloud loads) ---
function updateFormInputsFromState() {
  // Simple elements
  els.resumeTitle.value = state.resumeTitle;
  els.chkMultiPage.checked = state.enableMultiPage;
  
  // Apply styles from state
  const themeColor = state.themeColor || "#2d527c";
  document.documentElement.style.setProperty("--primary-color", themeColor);
  els.themeColorPicker.value = themeColor;
  els.colorDots.forEach(dot => {
    if (dot.dataset.color === themeColor) {
      dot.classList.add("active");
    } else {
      dot.classList.remove("active");
    }
  });

  const fontFamily = state.fontFamily || "Arial MT";
  document.getElementById("resume-pdf-root").style.fontFamily = `'${fontFamily}', sans-serif`;
  els.fontFamilySelect.value = fontFamily;

  // Apply layout style from state
  updateLayoutTemplate(state.layoutStyle || "layout-sidebar");

  els.firstName.value = state.personalDetails.firstName;
  els.lastName.value = state.personalDetails.lastName;
  els.jobPosition.value = state.personalDetails.jobPosition;
  els.chkUseHeadline.checked = state.personalDetails.useHeadline;
  els.emailAddress.value = state.personalDetails.email;
  els.phoneNumber.value = state.personalDetails.phone;
  els.addressStreet.value = state.personalDetails.address;
  els.dob.value = state.personalDetails.dob;
  els.linkedinUrl.value = state.personalDetails.linkedin;
  els.githubUrl.value = state.personalDetails.github;
  els.profileText.value = state.profileSummary;

  // Photo state render
  if (state.personalDetails.photo) {
    els.dropzonePlaceholder.classList.add("hidden");
    els.photoPreviewImg.classList.remove("hidden");
    els.photoPreviewImg.src = state.personalDetails.photo;
    els.btnRemovePhoto.classList.remove("hidden");
  } else {
    els.photoPreviewImg.src = "";
    els.photoPreviewImg.classList.add("hidden");
    els.btnRemovePhoto.classList.add("hidden");
    els.dropzonePlaceholder.classList.remove("hidden");
  }

  // Clear and rebuild dynamic list forms
  els.employmentList.innerHTML = "";
  state.employmentHistory.forEach(item => addEmploymentItem(item));

  els.educationList.innerHTML = "";
  state.educationHistory.forEach(item => addEducationItem(item));

  renderSkillsTags();
  renderTechSkillsTags();
  renderHobbiesTags();

  els.languagesList.innerHTML = "";
  state.languages.forEach(item => addLanguageItem(item));

  els.referencesList.innerHTML = "";
  state.references.forEach(item => addReferenceItem(item));

  els.achievementsList.innerHTML = "";
  state.achievements.forEach(item => addAchievementItem(item));
}

function syncAllPreviewContent() {
  syncName();
  syncHeadline();
  
  // Apply styles from state
  const themeColor = state.themeColor || "#2d527c";
  document.documentElement.style.setProperty("--primary-color", themeColor);
  els.themeColorPicker.value = themeColor;
  els.colorDots.forEach(dot => {
    if (dot.dataset.color === themeColor) {
      dot.classList.add("active");
    } else {
      dot.classList.remove("active");
    }
  });

  const fontFamily = state.fontFamily || "Arial MT";
  document.getElementById("resume-pdf-root").style.fontFamily = `'${fontFamily}', sans-serif`;
  els.fontFamilySelect.value = fontFamily;
  
  const rootEl = document.getElementById("resume-pdf-root");
  // Toggle Page 2 DOM visibility
  const page2El = document.getElementById("page-2");
  if (state.enableMultiPage) {
    page2El.classList.remove("hidden");
    rootEl.classList.remove("single-page");
  } else {
    page2El.classList.add("hidden");
    rootEl.classList.add("single-page");
  }

  // Photo preview
  if (state.personalDetails.photo) {
    els.previewPhoto.src = state.personalDetails.photo;
    els.previewPhoto.classList.remove("hidden");
    els.previewPhotoPlaceholder.classList.add("hidden");
  } else {
    els.previewPhoto.src = "";
    els.previewPhoto.classList.add("hidden");
    els.previewPhotoPlaceholder.classList.remove("hidden");
  }

  syncContactField("email", els.previewEmail, els.emailAddress);
  syncContactField("phone", els.previewPhone, els.phoneNumber);
  syncContactField("address", els.previewAddress, els.addressStreet);
  syncContactField("dob", els.previewDob, els.dob);
  syncContactField("linkedin", els.previewLinkedin, els.linkedinUrl);
  syncContactField("github", els.previewGithub, els.githubUrl);

  els.previewProfileText.innerText = state.profileSummary || "Professional summary prefill content...";
  const profileSection = document.getElementById("preview-section-profile");
  profileSection.style.display = state.profileSummary ? "block" : "none";

  syncEmploymentPreview();
  syncEducationPreview();
  syncSkillsPreview();
  syncTechSkillsPreview();
  syncHobbiesPreview();
  syncLanguagesPreview();
  syncReferencesPreview();
  syncAchievementsPreview();
  
  // Apply layout style from state at the end to guarantee correct ordering
  updateLayoutTemplate(state.layoutStyle || "layout-sidebar");
  
  // Reapply dynamic font scaling in real-time
  changeFontSize(0);
}

// --------------------------------------------------------------------------
// 7. Undo/Redo Engine
// --------------------------------------------------------------------------
function pushHistory() {
  if (isHistoryChange) return; // Ignore pushes generated during undo/redo actions
  
  // Clone current state structure
  const clone = JSON.parse(JSON.stringify(state));
  historyStack.push(clone);
  
  // Cap at max limit
  if (historyStack.length > MAX_HISTORY) {
    historyStack.shift();
  }
  
  // Clear redo
  redoStack = [];
  updateHistoryButtons();
}

function triggerUndo() {
  if (historyStack.length <= 1) return; // Always keep the initial state
  
  isHistoryChange = true;
  const current = historyStack.pop();
  redoStack.push(current);
  
  const prevState = historyStack[historyStack.length - 1];
  state = JSON.parse(JSON.stringify(prevState));
  
  updateFormInputsFromState();
  syncAllPreviewContent();
  updateHistoryButtons();
  
  isHistoryChange = false;
  autoSave();
}

function triggerRedo() {
  if (redoStack.length === 0) return;
  
  isHistoryChange = true;
  const nextState = redoStack.pop();
  historyStack.push(nextState);
  
  state = JSON.parse(JSON.stringify(nextState));
  
  updateFormInputsFromState();
  syncAllPreviewContent();
  updateHistoryButtons();
  
  isHistoryChange = false;
  autoSave();
}

function updateHistoryButtons() {
  els.btnUndo.disabled = historyStack.length <= 1;
  els.btnRedo.disabled = redoStack.length === 0;
}

// --------------------------------------------------------------------------
// 8. Dynamic Floating Toolbar Controllers
// --------------------------------------------------------------------------
function changeZoom(factor) {
  zoomLevel = Math.max(0.4, Math.min(1.5, zoomLevel + factor));
  
  // Set scale transform on wrapper
  els.a4Wrapper.style.transform = `scale(${zoomLevel})`;
  els.zoomValue.innerText = `${Math.round(zoomLevel * 100)}%`;
}

function autoFitZoom() {
  // Check the preview viewport size and scale zoom to fit beautifully
  const panelWidth = document.querySelector(".preview-panel").clientWidth - 40;
  const a4Width = 794; // 210mm at 96dpi approx
  
  if (panelWidth < a4Width) {
    zoomLevel = panelWidth / a4Width;
    zoomLevel = Math.floor(zoomLevel * 20) / 20;
    changeZoom(0);
  }
}

function changeFontSize(delta) {
  fontScale = Math.max(12, Math.min(16, fontScale + delta));
  els.fontSizeIndicator.innerText = `${fontScale}px`;
  
  const map = fontScaleMap[fontScale];
  const root = document.getElementById("resume-pdf-root");
  
  // Dynamically adapt sizes for single-page layout to guarantee strict A4 fit
  const isSinglePage = root.classList.contains("single-page");
  let bodySize = map.body;
  let titlesSize = map.titles;
  let nameSize = map.name;
  
  if (isSinglePage) {
    bodySize = `${parseFloat(map.body) - 0.8}px`;
    titlesSize = `${parseFloat(map.titles) - 1.5}px`;
    nameSize = `${parseFloat(map.name) - 1.5}px`;
  }
  
  // Proportionally adjust specific classes using inline styles
  root.querySelectorAll(".main-section-content, .job-bullets li, .detail-text, .skills-list-bullets li, .hobbies-list-bullets li, .reference-item, .timeline-item, .lang-name").forEach(e => {
    e.style.fontSize = bodySize;
  });
  
  root.querySelectorAll(".sidebar-title, .main-section-title").forEach(e => {
    e.style.fontSize = titlesSize;
  });

  root.querySelector(".candidate-name").style.fontSize = nameSize;
}

function updateThemeColor(color) {
  state.themeColor = color;
  document.documentElement.style.setProperty("--primary-color", color);
  els.themeColorPicker.value = color;
  
  // Highlight active dot if standard color is picked
  els.colorDots.forEach(dot => {
    if (dot.dataset.color === color) {
      dot.classList.add("active");
    } else {
      dot.classList.remove("active");
    }
  });

  autoSave();
}

function updateLayoutTemplate(layout) {
  const rootEl = document.getElementById("resume-pdf-root");
  if (!rootEl) return;
  
  rootEl.classList.remove(
    "layout-sidebar", "layout-header", "layout-minimal", "layout-creative", 
    "layout-glass", "layout-metro", "layout-dark", "layout-bold", 
    "layout-stripe", "layout-timeline", "layout-ats-modern"
  );
  rootEl.classList.add(layout || "layout-sidebar");
  
  if (els.layoutStyleSelect) {
    els.layoutStyleSelect.value = layout || "layout-sidebar";
  }
  
  const nameBlock = document.querySelector(".name-headline-block");
  const mainCol = document.querySelector("#page-1 .resume-main");
  const sidebarBody = document.querySelector("#page-1 .sidebar-body");
  const sidebarHeader = document.querySelector("#page-1 .sidebar-header-curve");
  const personalList = document.querySelector(".personal-details-list");
  const sidebarPhoto = document.querySelector("#page-1 .sidebar-photo-wrapper");

  const secProfile = document.getElementById("preview-section-profile");
  const secEmployment = document.getElementById("preview-section-employment-p1");
  const secEducation = document.getElementById("preview-section-education-p1");
  const secAchievements = document.getElementById("preview-section-achievements-p1");
  const secReferences = document.getElementById("preview-section-references");
  const secTechSkills = document.getElementById("preview-section-tech-skills");
  const secSkills = document.getElementById("preview-section-skills");
  const secLanguages = document.getElementById("preview-section-languages");

  // Restore everything to default layout positions first (so subsequent layouts work perfectly)
  if (sidebarBody) {
    if (personalList && personalList.parentElement !== sidebarBody) {
      sidebarBody.insertBefore(personalList, sidebarBody.firstChild);
    }
    if (secTechSkills && secTechSkills.parentElement !== sidebarBody && !state.enableMultiPage) {
      sidebarBody.appendChild(secTechSkills);
    }
    if (secSkills && secSkills.parentElement !== sidebarBody) {
      sidebarBody.appendChild(secSkills);
    }
    if (secLanguages && secLanguages.parentElement !== sidebarBody) {
      sidebarBody.appendChild(secLanguages);
    }
  }
  
  if (mainCol) {
    if (secProfile) mainCol.appendChild(secProfile);
    if (secEmployment) mainCol.appendChild(secEmployment);
    if (secEducation) mainCol.appendChild(secEducation);
    if (secAchievements) mainCol.appendChild(secAchievements);
    if (secReferences) mainCol.appendChild(secReferences);
  }

  if (layout === "layout-ats-modern") {
    // ATS One-Column overrides
    if (sidebarPhoto) sidebarPhoto.style.display = "none"; // Hide photo
    
    if (mainCol) {
      // Move Name Block to top of main column
      if (nameBlock) mainCol.insertBefore(nameBlock, mainCol.firstChild);
      
      // Move Contact Details List right after Name Block
      if (personalList) {
        if (nameBlock) {
          nameBlock.after(personalList);
        } else {
          mainCol.insertBefore(personalList, mainCol.firstChild);
        }
      }
      
      // Strict layout order: Header -> Profile -> Tech Skills -> Projects -> Education -> Achievements -> Soft Skills -> Languages -> References
      if (secProfile) mainCol.appendChild(secProfile);
      if (secTechSkills) mainCol.appendChild(secTechSkills);
      if (secEmployment) mainCol.appendChild(secEmployment);
      if (secEducation) mainCol.appendChild(secEducation);
      if (secAchievements) mainCol.appendChild(secAchievements);
      if (secSkills) mainCol.appendChild(secSkills);
      if (secLanguages) mainCol.appendChild(secLanguages);
      if (secReferences) mainCol.appendChild(secReferences);
    }
  } else {
    // Restore normal photo display
    if (sidebarPhoto) sidebarPhoto.style.display = "";
    
    // Reposition name-headline-block
    if (nameBlock) {
      if (layout === "layout-header" || layout === "layout-glass" || layout === "layout-metro" || layout === "layout-bold" || layout === "layout-timeline") {
        if (mainCol && nameBlock.parentElement !== mainCol) {
          mainCol.insertBefore(nameBlock, mainCol.firstChild);
        }
      } else if (layout === "layout-minimal" || layout === "layout-stripe") {
        if (sidebarBody && nameBlock.parentElement !== sidebarBody) {
          sidebarBody.insertBefore(nameBlock, sidebarBody.firstChild);
        }
      } else {
        // Creative banner, standard sidebar, dark mode
        if (sidebarHeader && nameBlock.parentElement !== sidebarHeader) {
          sidebarHeader.appendChild(nameBlock);
        }
      }
    }
  }

  // Always update contact separators
  updateContactSeparators();
}

function resetAllFields() {
  if (confirm("Are you sure you want to clear all fields? This will delete all inputs.")) {
    state = {
      resumeTitle: "Untitled resume",
      enableMultiPage: true,
      themeColor: "#2d527c",
      fontFamily: "Arial MT",
      layoutStyle: "layout-sidebar",
      personalDetails: {
        photo: "",
        firstName: "",
        lastName: "",
        jobPosition: "",
        useHeadline: true,
        email: "",
        phone: "",
        address: "",
        dob: "",
        linkedin: "",
        github: ""
      },
      profileSummary: "",
      employmentHistory: [],
      educationHistory: [],
      achievements: [],
      skills: [],
      technicalSkills: [],
      hobbies: [],
      references: []
    };
    
    updateFormInputsFromState();
    syncAllPreviewContent();
    pushHistory();
    autoSave();
  }
}

// --------------------------------------------------------------------------
// 9. Firebase Cloud Sync Pipeline
// --------------------------------------------------------------------------
async function saveResumeCloud() {
  els.loadingOverlay.classList.remove("hidden");
  els.loadingText.innerText = "Syncing with cloud database...";
  
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const originalId = urlParams.get("id");
    
    // If it's a local ID or doesn't exist, we pass null to generate a new cloud ID. Otherwise use the existing cloud ID.
    const isLocal = !originalId || originalId.startsWith("local_");
    const cloudIdParam = isLocal ? null : originalId;
    
    const savedId = await saveResumeToCloud(cloudIdParam, state);
    
    if (isLocal) {
      // Save data locally under the new Cloud ID
      localStorage.setItem(`resume_${savedId}`, JSON.stringify(state));
      // Delete the old local draft from local storage
      if (originalId) {
        localStorage.removeItem(`resume_${originalId}`);
      }
      
      // Update the index to point to the new ID
      updateResumeIndexId(originalId, savedId);
      
      // Update URL to the new Cloud ID
      const newUrl = `${window.location.origin}${window.location.pathname}?id=${savedId}`;
      window.history.pushState({ path: newUrl }, '', newUrl);
    }
    
    els.loadingOverlay.classList.add("hidden");
    const shareLink = `${window.location.origin}${window.location.pathname}?id=${savedId}`;
    els.shareUrl.value = shareLink;
    els.shareModal.classList.remove("hidden");
    
    els.saveStatus.innerHTML = `<i class="fa-solid fa-cloud"></i> Synced to Cloud`;
  } catch (error) {
    console.error("Cloud save failed:", error);
    els.loadingOverlay.classList.add("hidden");
    alert("Could not sync with Firebase. The resume has been saved locally.");
  }
}

async function loadCloudResume(id) {
  els.loadingOverlay.classList.remove("hidden");
  els.loadingText.innerText = "Loading resume...";
  
  try {
    let cloudData = await loadResumeFromCloud(id);
    
    // Check for legacy migration if not found in local/cloud
    if (!cloudData && id.startsWith("local_")) {
      cloudData = migrateLegacyAutosave(id);
    }
    
    els.loadingOverlay.classList.add("hidden");
    
    if (cloudData) {
      state = cloudData;
      updateFormInputsFromState();
      syncAllPreviewContent();
      pushHistory();
      
      if (id.startsWith("local_")) {
        els.saveStatus.innerHTML = `<i class="fa-solid fa-cloud"></i> Synced locally`;
      } else {
        els.saveStatus.innerHTML = `<i class="fa-solid fa-cloud"></i> Loaded from Cloud`;
      }
    } else {
      if (id.startsWith("local_")) {
        loadExampleData();
        state.resumeTitle = "Kaveesha Sewmini IT Underg";
        autoSave();
      } else {
        alert("Resume ID not found. Prefilling default mock data.");
        loadExampleData();
      }
    }
  } catch (error) {
    console.error("Cloud fetch failed:", error);
    els.loadingOverlay.classList.add("hidden");
    alert("Could not fetch cloud database file. Loaded locally instead.");
    loadExampleData();
  }
}

// --- Local Storage Resumes Index Helper Functions ---
function getLocalResumesIndex() {
  const indexStr = localStorage.getItem("resume_builder_index");
  if (!indexStr) return [];
  try {
    return JSON.parse(indexStr);
  } catch (e) {
    return [];
  }
}

function saveLocalResumesIndex(index) {
  localStorage.setItem("resume_builder_index", JSON.stringify(index));
}

function updateResumeIndexId(oldId, newId) {
  let index = getLocalResumesIndex();
  const entry = index.find(item => item.id === oldId);
  if (entry) {
    entry.id = newId;
    entry.updatedAt = new Date().toISOString();
  } else {
    index.push({
      id: newId,
      title: state.resumeTitle || "Untitled resume",
      updatedAt: new Date().toISOString()
    });
  }
  saveLocalResumesIndex(index);
}

function migrateLegacyAutosave(newId) {
  const legacyData = localStorage.getItem("resume_builder_autosave");
  if (legacyData) {
    try {
      const parsed = JSON.parse(legacyData);
      if (parsed && typeof parsed === "object") {
        localStorage.setItem(`resume_${newId}`, legacyData);
        localStorage.removeItem("resume_builder_autosave");
        console.log("Migrated legacy resume autosave to new slot:", newId);
        
        // Add to index
        let index = getLocalResumesIndex();
        index.push({
          id: newId,
          title: parsed.resumeTitle || "Untitled resume",
          updatedAt: new Date().toISOString()
        });
        saveLocalResumesIndex(index);
        
        return parsed;
      }
    } catch (e) {
      console.error("Failed to migrate legacy autosave:", e);
    }
  }
  return null;
}

function autoSave() {
  const urlParams = new URLSearchParams(window.location.search);
  const resumeId = urlParams.get("id");
  if (!resumeId) return;

  // Save specific resume state
  localStorage.setItem(`resume_${resumeId}`, JSON.stringify(state));

  // Update index
  let index = getLocalResumesIndex();
  let entry = index.find(item => item.id === resumeId);
  if (entry) {
    entry.title = state.resumeTitle || "Untitled resume";
    entry.updatedAt = new Date().toISOString();
  } else {
    index.push({
      id: resumeId,
      title: state.resumeTitle || "Untitled resume",
      updatedAt: new Date().toISOString()
    });
  }
  saveLocalResumesIndex(index);

  if (resumeId.startsWith("local_")) {
    els.saveStatus.innerHTML = `<i class="fa-solid fa-cloud"></i> Synced locally`;
  } else {
    els.saveStatus.innerHTML = `<i class="fa-solid fa-cloud"></i> Synced to Cloud`;
  }
}

// --- Resumes List Dashboard Rendering & Operations ---
function renderResumesDashboardList() {
  const container = els.resumesListContainer;
  container.innerHTML = "";
  
  const index = getLocalResumesIndex();
  // Sort by updatedAt descending
  index.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  
  const urlParams = new URLSearchParams(window.location.search);
  const activeId = urlParams.get("id");
  
  if (index.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 30px; color: var(--text-muted); font-size: 13px;">
        <i class="fa-regular fa-folder" style="font-size: 24px; margin-bottom: 8px; display: block; color: var(--text-muted);"></i>
        No saved resumes found. Click below to create one.
      </div>
    `;
    return;
  }
  
  index.forEach(item => {
    const isActive = item.id === activeId;
    const itemCard = document.createElement("div");
    itemCard.className = `resume-dashboard-item ${isActive ? 'active' : ''}`;
    
    const formattedDate = new Date(item.updatedAt).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const isCloud = !item.id.startsWith("local_");
    
    itemCard.innerHTML = `
      <div class="resume-item-info">
        <span class="resume-item-title">${escapeHtml(item.title || "Untitled resume")}</span>
        <span class="resume-item-date">
          <i class="fa-regular fa-clock"></i> Updated: ${formattedDate}
          ${isCloud ? '<span style="color:#818cf8; margin-left:8px;"><i class="fa-solid fa-cloud"></i> Cloud synced</span>' : '<span style="color:#10b981; margin-left:8px;"><i class="fa-solid fa-circle-check"></i> Local only</span>'}
        </span>
      </div>
      <div class="resume-item-actions">
        <button type="button" class="btn-delete-resume" title="Delete draft" data-id="${item.id}">
          <i class="fa-regular fa-trash-can"></i>
        </button>
      </div>
    `;
    
    // Clicking on the item loads it (excluding the delete button)
    itemCard.addEventListener("click", (e) => {
      if (e.target.closest(".btn-delete-resume")) return;
      
      // Load this resume
      els.resumesModal.classList.add("hidden");
      const newUrl = `${window.location.origin}${window.location.pathname}?id=${item.id}`;
      window.history.pushState({ path: newUrl }, '', newUrl);
      loadCloudResume(item.id);
    });
    
    // Delete action
    itemCard.querySelector(".btn-delete-resume").addEventListener("click", (e) => {
      e.stopPropagation();
      deleteResumeDraft(item.id, item.title);
    });
    
    container.appendChild(itemCard);
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function createNewResumeDraft() {
  const newId = `local_${Date.now()}`;
  els.resumesModal.classList.add("hidden");
  
  // Set clean initial state
  state = {
    resumeTitle: "New Local Resume",
    enableMultiPage: false,
    themeColor: "#2d527c",
    fontFamily: "Arial MT",
    layoutStyle: "layout-sidebar",
    personalDetails: {
      photo: "",
      firstName: "",
      lastName: "",
      jobPosition: "",
      useHeadline: true,
      email: "",
      phone: "",
      address: "",
      dob: "",
      linkedin: "",
      github: ""
    },
    profileSummary: "",
    employmentHistory: [],
    educationHistory: [],
    achievements: [],
    skills: [],
    technicalSkills: [],
    hobbies: [],
    references: []
  };
  
  // Save new resume
  localStorage.setItem(`resume_${newId}`, JSON.stringify(state));
  
  // Add to index
  let index = getLocalResumesIndex();
  index.push({
    id: newId,
    title: state.resumeTitle,
    updatedAt: new Date().toISOString()
  });
  saveLocalResumesIndex(index);
  
  // Update URL and load
  const newUrl = `${window.location.origin}${window.location.pathname}?id=${newId}`;
  window.history.pushState({ path: newUrl }, '', newUrl);
  
  updateFormInputsFromState();
  syncAllPreviewContent();
  
  // Reset undo/redo history stack for this new resume
  historyStack = [];
  redoStack = [];
  pushHistory();
}

function deleteResumeDraft(id, title) {
  if (confirm(`Are you sure you want to delete "${title || 'Untitled resume'}"? This will delete all local data for this draft.`)) {
    // Remove from storage
    localStorage.removeItem(`resume_${id}`);
    
    // Remove from index
    let index = getLocalResumesIndex();
    index = index.filter(item => item.id !== id);
    saveLocalResumesIndex(index);
    
    // Check if we just deleted the active resume
    const urlParams = new URLSearchParams(window.location.search);
    const activeId = urlParams.get("id");
    
    if (activeId === id) {
      if (index.length > 0) {
        // Load the next latest resume
        index.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        const nextId = index[0].id;
        const newUrl = `${window.location.origin}${window.location.pathname}?id=${nextId}`;
        window.history.replaceState({ path: newUrl }, '', newUrl);
        loadCloudResume(nextId);
      } else {
        // No resumes left, create a fresh default one
        createNewResumeDraft();
      }
    } else {
      // Re-render dashboard
      renderResumesDashboardList();
    }
  }
}


// --------------------------------------------------------------------------
// 10. A4 PDF Compilation with html2pdf.js
// --------------------------------------------------------------------------
function exportPDF() {
  window.print();
}

// --------------------------------------------------------------------------
// 11. Mock / Example Data Injection (Exact screenshot replica)
// --------------------------------------------------------------------------
function loadExampleData() {
  state = {
    resumeTitle: "Kaveesha Sewmini IT Undergraduate CV",
    enableMultiPage: false,
    themeColor: "#1e3d59", // Navy Blue
    fontFamily: "Arial MT",
    layoutStyle: "layout-ats-modern", // Default to the new Modern ATS layout
    personalDetails: {
      photo: "", 
      firstName: "KAVEESHA",
      lastName: "SEWMINI",
      jobPosition: "IT Undergraduate | Software Engineering Intern | Java | SQL | Web Development",
      useHeadline: true,
      email: "balasooriyakavee2003@gmail.com",
      phone: "+94 76 745 8455",
      address: "Malabe, Colombo",
      dob: "",
      linkedin: "linkedin.com/in/kaveeshasewmini-balasooriya-8a856b225",
      github: "github.com/kaveeshasewmini"
    },
    profileSummary: "IT undergraduate at SLIIT with hands-on academic project experience in Java, MySQL, JDBC, MVC architecture, web development, and Arduino-based IoT systems. Strong foundation in object-oriented programming, database design, and system development. Seeking a Software Engineering / IT Internship to apply technical knowledge in real-world software projects and grow within a professional development team.",
    employmentHistory: [
      {
        id: "emp_1",
        company: "Movie Rental Platform System",
        position: "Academic Project | Java Swing, MVC, OOP, File I/O",
        dates: "Jan 2025 – Present",
        bullets: [
          "Developed a desktop-based Movie Rental Management System using Java Swing, MVC architecture, and object-oriented programming concepts.",
          "Designed and implemented core modules for movie records, customer details, and rental transactions.",
          "Applied inheritance, encapsulation, and polymorphism to structure reusable and maintainable code.",
          "Implemented file-based data persistence using Java File I/O and object serialization.",
          "Improved logical flow and user interaction through structured form design and validation."
        ]
      },
      {
        id: "emp_2",
        company: "Hotel Reservation System",
        position: "Academic Project | Java, JDBC, MySQL",
        dates: "Jun 2024 – Dec 2024",
        bullets: [
          "Developed a Hotel Reservation System using Java, JDBC, and MySQL to manage room bookings and availability.",
          "Designed relational database tables with proper normalization to reduce data duplication.",
          "Wrote SQL queries for booking records, room status updates, and reservation history.",
          "Supported backend functionality for reservation creation, updates, and availability checking."
        ]
      },
      {
        id: "emp_3",
        company: "IoT-Based Water Level Monitoring System",
        position: "IoT Project | Arduino Uno, C/C++, Ultrasonic Sensors, I2C LCD",
        dates: "Mar 2024 – Jun 2024",
        bullets: [
          "Built a real-time water level monitoring prototype using Arduino Uno and ultrasonic sensors.",
          "Programmed microcontroller logic using C/C++ in the Arduino IDE.",
          "Integrated sensor readings to calculate water levels and display real-time values on an I2C LCD.",
          "Gained practical exposure to sensor integration, embedded programming, and IoT prototyping."
        ]
      }
    ],
    educationHistory: [
      {
        id: "edu_1",
        school: "Sri Lanka Institute of Information Technology — SLIIT",
        degree: "BSc (Hons) in Information Technology — Undergraduate",
        dates: "2024 – Present",
        description: "Relevant Modules: Object-Oriented Programming, Data Structures and Algorithms, Database Management Systems, Web Development, System Design, Software Engineering"
      },
      {
        id: "edu_2",
        school: "C.I.A Computer Training Institute",
        degree: "Certificate in Information Communication Technology Technician — NVQ Level 3",
        dates: "2024",
        description: "Areas Covered: Computer Hardware, Networking, Software Installation, Database Administration Basics"
      },
      {
        id: "edu_3",
        school: "Sabaragamuwa University of Sri Lanka",
        degree: "Certificate in English",
        dates: "2023",
        description: "Areas Covered: Professional Communication, Technical Writing, Business Presentation Skills"
      },
      {
        id: "edu_4",
        school: "R/Sumana Balika Vidyalaya, Ratnapura",
        degree: "G.C.E. Advanced Level — 3C’s",
        dates: "2022 / 2023",
        description: "G.C.E. Ordinary Level — 2B’s, 4C’s, 2S’s (2019)"
      }
    ],
    achievements: [],
    skills: ["Problem Solving", "Team Collaboration", "Communication", "Time Management", "Self-Learning", "Attention to Detail"],
    technicalSkills: [
      "Programming Languages: Java, Python, C++, SQL",
      "Web Technologies: HTML5, CSS3, JavaScript",
      "Database Technologies: MySQL, SQLite, JDBC, Relational Database Design",
      "Software Concepts: Object-Oriented Programming, MVC Architecture, Data Structures and Algorithms, SDLC, System Design",
      "Tools & Platforms: Git, GitHub, VS Code, Arduino IDE",
      "Other Technical Areas: IoT Prototyping, File Handling, Data Persistence, Debugging, Technical Documentation"
    ],
    hobbies: [],
    languages: [
      { id: "lang_1", name: "Sinhala — Native", rating: 5 },
      { id: "lang_2", name: "English — Professional Working Proficiency", rating: 5 }
    ],
    references: [
      {
        id: "ref_1",
        name: "Available upon request.",
        title: "",
        company: "",
        phone: ""
      }
    ]
  };

  // Reset CSS theme variables
  document.documentElement.style.setProperty("--primary-color", "#1e3d59");
  
  updateFormInputsFromState();
  syncAllPreviewContent();
  
  // Initialize stacks
  historyStack = [];
  redoStack = [];
  pushHistory();
  autoSave();
}
