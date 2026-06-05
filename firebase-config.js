// Firebase Configuration and Initialization
const firebaseConfig = {
  apiKey: "AIzaSyBP9w5KDb2IZpqdgCAI1FpF9Qk9b6To4zI",
  authDomain: "collection-dashboard-1fe90.firebaseapp.com",
  projectId: "collection-dashboard-1fe90",
  storageBucket: "collection-dashboard-1fe90.firebasestorage.app",
  messagingSenderId: "421325245468",
  appId: "1:421325245468:web:fe96a60751d1f87c85e3d9"
};

let db = null;
let storage = null;
let isFirebaseConnected = false;

try {
  // Initialize Firebase using the Compat libraries for browser standard scripts
  if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    storage = firebase.storage();
    isFirebaseConnected = true;
    console.log("Firebase initialized successfully.");
  } else {
    console.warn("Firebase scripts not loaded. Operating in Local Mode.");
  }
} catch (error) {
  console.error("Failed to initialize Firebase:", error);
}

/**
 * Uploads a profile picture to Firebase Storage.
 * Falls back to local base64 data URL if Firebase fails or is disconnected.
 * @param {File} file 
 * @returns {Promise<string>} The download URL or local data URL
 */
async function uploadProfilePicture(file) {
  if (!isFirebaseConnected || !storage) {
    console.log("Firebase not active. Generating local preview URL.");
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }

  try {
    const filename = `photos/${Date.now()}_${file.name}`;
    const storageRef = storage.ref().child(filename);
    const snapshot = await storageRef.put(file);
    const downloadURL = await snapshot.ref.getDownloadURL();
    console.log("Photo uploaded to Firebase Storage:", downloadURL);
    return downloadURL;
  } catch (error) {
    console.error("Firebase photo upload failed. Falling back to local URL:", error);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }
}

/**
 * Saves resume data to Firestore.
 * Falls back to LocalStorage if Firebase is offline.
 * @param {string} resumeId 
 * @param {Object} resumeData 
 * @returns {Promise<string>} The document ID
 */
async function saveResumeToCloud(resumeId, resumeData) {
  const localKey = `resume_${resumeId || 'default'}`;
  localStorage.setItem(localKey, JSON.stringify(resumeData));

  if (!isFirebaseConnected || !db) {
    console.log("Saved resume locally (Firebase disconnected).");
    return resumeId || 'local-offline';
  }

  try {
    const dataToSave = {
      ...resumeData,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (resumeId) {
      await db.collection("resumes").doc(resumeId).set(dataToSave, { merge: true });
      console.log("Resume updated in Firestore:", resumeId);
      return resumeId;
    } else {
      const docRef = await db.collection("resumes").add({
        ...dataToSave,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      console.log("New resume saved to Firestore:", docRef.id);
      return docRef.id;
    }
  } catch (error) {
    console.error("Firestore save failed. Fallback to LocalStorage completed:", error);
    return resumeId || 'local-offline-fallback';
  }
}

/**
 * Loads resume data from Firestore or local storage.
 * @param {string} resumeId 
 * @returns {Promise<Object|null>} The resume data
 */
async function loadResumeFromCloud(resumeId) {
  if (!resumeId) return null;

  // Try loading from LocalStorage first for instant load
  const localKey = `resume_${resumeId}`;
  const localData = localStorage.getItem(localKey);
  let parsedLocal = null;
  if (localData) {
    try {
      parsedLocal = JSON.parse(localData);
    } catch (e) {
      console.error(e);
    }
  }

  if (!isFirebaseConnected || !db) {
    console.log("Loaded resume from LocalStorage (Firebase disconnected).");
    return parsedLocal;
  }

  try {
    const doc = await db.collection("resumes").doc(resumeId).get();
    if (doc.exists) {
      const cloudData = doc.data();
      // Update local storage cache
      localStorage.setItem(localKey, JSON.stringify(cloudData));
      console.log("Loaded resume from Firestore:", resumeId);
      return cloudData;
    }
    return parsedLocal;
  } catch (error) {
    console.error("Firestore load failed. Loading from LocalStorage cache:", error);
    return parsedLocal;
  }
}

/**
 * Fetches all resumes from Firestore.
 * @returns {Promise<Array>} List of resumes with their IDs and metadata
 */
async function fetchAllResumesFromCloud() {
  if (!isFirebaseConnected || !db) {
    console.warn("Firebase not connected. Cannot fetch resumes from cloud.");
    return [];
  }
  try {
    const querySnapshot = await db.collection("resumes").get();
    const resumes = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      let updatedAtVal = new Date().toISOString();
      if (data.updatedAt) {
        if (typeof data.updatedAt.toDate === "function") {
          updatedAtVal = data.updatedAt.toDate().toISOString();
        } else {
          updatedAtVal = new Date(data.updatedAt).toISOString();
        }
      } else if (data.createdAt) {
        if (typeof data.createdAt.toDate === "function") {
          updatedAtVal = data.createdAt.toDate().toISOString();
        } else {
          updatedAtVal = new Date(data.createdAt).toISOString();
        }
      }
      resumes.push({
        id: doc.id,
        title: data.resumeTitle || "Untitled resume",
        updatedAt: updatedAtVal
      });
    });
    return resumes;
  } catch (error) {
    console.error("Failed to fetch resumes from Firestore:", error);
    return [];
  }
}

/**
 * Deletes a resume from Firestore.
 * @param {string} resumeId 
 * @returns {Promise<boolean>} True if successful
 */
async function deleteResumeFromCloud(resumeId) {
  if (!isFirebaseConnected || !db || !resumeId || resumeId.startsWith("local_")) {
    return false;
  }
  try {
    await db.collection("resumes").doc(resumeId).delete();
    console.log("Deleted resume from Firestore:", resumeId);
    return true;
  } catch (error) {
    console.error("Failed to delete resume from Firestore:", error);
    return false;
  }
}
