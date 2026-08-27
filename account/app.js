import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const elements = {
  setup: document.getElementById("setup-notice"),
  signedOut: document.getElementById("signed-out-panel"),
  signIn: document.getElementById("google-signin"),
  dashboard: document.getElementById("member-dashboard"),
  signOut: document.getElementById("sign-out"),
  photo: document.getElementById("account-photo"),
  name: document.getElementById("account-name"),
  email: document.getElementById("account-email"),
  pending: document.getElementById("pending-panel"),
  blocked: document.getElementById("blocked-panel"),
  resources: document.getElementById("resource-section"),
  resourceGrid: document.getElementById("resource-grid"),
  resourceEmpty: document.getElementById("resource-empty"),
  admin: document.getElementById("admin-section"),
  userList: document.getElementById("user-list"),
  refreshUsers: document.getElementById("refresh-users"),
  resourceForm: document.getElementById("resource-form"),
  adminFeedback: document.getElementById("admin-feedback"),
  status: document.getElementById("portal-status")
};

const firebaseConfig = window.MSE_AUTH_CONFIG?.firebase ?? {};
const bootstrapAdminEmail = window.MSE_AUTH_CONFIG?.bootstrapAdminEmail?.trim().toLowerCase() ?? "";
const requiredConfig = ["apiKey", "authDomain", "projectId", "appId"];
const configured = requiredConfig.every(key => typeof firebaseConfig[key] === "string" && firebaseConfig[key].trim());

let auth;
let db;
let currentUser = null;
let currentProfile = null;

if (!configured) {
  elements.setup.hidden = false;
  elements.signedOut.hidden = true;
  elements.status.textContent = "Authentication configuration is required before sign-in can begin.";
} else {
  initialisePortal();
}

function initialisePortal() {
  const firebaseApp = initializeApp(firebaseConfig);
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);

  elements.signIn.addEventListener("click", beginGoogleSignIn);
  elements.signOut.addEventListener("click", () => signOut(auth));
  elements.refreshUsers.addEventListener("click", loadAdminUsers);
  elements.userList.addEventListener("click", handleUserAction);
  elements.resourceGrid.addEventListener("click", handleResourceAction);
  elements.resourceForm.addEventListener("submit", addResource);

  getRedirectResult(auth).catch(showAuthError);
  onAuthStateChanged(auth, handleAuthState);
}

async function beginGoogleSignIn() {
  elements.signIn.disabled = true;
  elements.status.textContent = "Opening Google sign-in...";
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    if (error.code === "auth/popup-blocked") {
      await signInWithRedirect(auth, provider);
      return;
    }
    if (error.code !== "auth/popup-closed-by-user") showAuthError(error);
  } finally {
    elements.signIn.disabled = false;
  }
}

async function handleAuthState(user) {
  resetPanels();
  currentUser = user;
  currentProfile = null;

  if (!user) {
    elements.signedOut.hidden = false;
    elements.dashboard.hidden = true;
    elements.status.textContent = "";
    return;
  }

  elements.signedOut.hidden = true;
  elements.dashboard.hidden = false;
  renderIdentity(user);
  elements.status.textContent = "Checking your registration...";

  try {
    currentProfile = await getOrCreateProfile(user);
    renderAccessState(currentProfile);
  } catch (error) {
    console.error(error);
    elements.status.textContent = "Your registration could not be loaded. Please sign out and try again.";
  }
}

async function getOrCreateProfile(user) {
  const profileRef = doc(db, "users", user.uid);
  let snapshot = await getDoc(profileRef);
  if (!snapshot.exists()) {
    const isBootstrapAdmin = user.email?.toLowerCase() === bootstrapAdminEmail;
    await setDoc(profileRef, {
      displayName: user.displayName || "Google user",
      email: user.email,
      photoURL: user.photoURL || "",
      role: isBootstrapAdmin ? "admin" : "student",
      status: isBootstrapAdmin ? "active" : "pending",
      createdAt: serverTimestamp()
    });
    snapshot = await getDoc(profileRef);
  }
  return { id: snapshot.id, ...snapshot.data() };
}

function renderIdentity(user) {
  elements.name.textContent = user.displayName || "Google user";
  elements.email.textContent = user.email || "";
  if (user.photoURL) {
    elements.photo.src = user.photoURL;
    elements.photo.alt = `${user.displayName || "User"} profile photograph`;
    elements.photo.hidden = false;
  } else {
    elements.photo.hidden = true;
  }
}

async function renderAccessState(profile) {
  elements.status.textContent = "";
  if (profile.status === "pending") {
    elements.pending.hidden = false;
    return;
  }
  if (profile.status !== "active") {
    elements.blocked.hidden = false;
    return;
  }

  elements.resources.hidden = false;
  await loadResources(profile.role);
  if (profile.role === "admin") {
    elements.admin.hidden = false;
    await loadAdminUsers();
  }
}

async function loadResources(role) {
  elements.resourceGrid.replaceChildren();
  elements.resourceEmpty.hidden = true;
  try {
    const resourceQuery = role === "admin"
      ? query(collection(db, "resources"), orderBy("createdAt", "desc"))
      : query(
        collection(db, "resources"),
        where("published", "==", true),
        where("allowedRoles", "array-contains", role)
      );
    const snapshot = await getDocs(resourceQuery);
    if (snapshot.empty) {
      elements.resourceEmpty.hidden = false;
      return;
    }
    snapshot.forEach(resource => elements.resourceGrid.append(createResourceCard(resource)));
  } catch (error) {
    console.error(error);
    elements.status.textContent = "Resources could not be loaded. Please try again later.";
  }
}

function createResourceCard(snapshot) {
  const resource = snapshot.data();
  const article = document.createElement("article");
  article.className = "resource-card";

  const topic = document.createElement("p");
  topic.className = "section-kicker";
  topic.textContent = resource.course || "Course resource";
  const title = document.createElement("h3");
  title.textContent = resource.title;
  const description = document.createElement("p");
  description.textContent = resource.description || "Open this restricted resource in Google Drive.";
  const actions = document.createElement("div");
  actions.className = "resource-actions";
  const link = document.createElement("a");
  link.className = "button primary";
  link.href = safeDriveUrl(resource.driveUrl);
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = "Open in Google Drive";
  actions.append(link);

  if (currentProfile?.role === "admin") {
    const remove = document.createElement("button");
    remove.className = "button secondary";
    remove.type = "button";
    remove.dataset.deleteResource = snapshot.id;
    remove.textContent = "Remove";
    actions.append(remove);
  }

  article.append(topic, title, description, actions);
  return article;
}

async function loadAdminUsers() {
  if (currentProfile?.role !== "admin") return;
  elements.userList.innerHTML = "<p>Loading registrations...</p>";
  try {
    const snapshot = await getDocs(query(collection(db, "users"), orderBy("createdAt", "desc")));
    elements.userList.replaceChildren();
    snapshot.forEach(userSnapshot => elements.userList.append(createUserRow(userSnapshot)));
  } catch (error) {
    console.error(error);
    elements.userList.innerHTML = "<p>Registrations could not be loaded.</p>";
  }
}

function createUserRow(snapshot) {
  const profile = snapshot.data();
  const row = document.createElement("article");
  row.className = "user-row";
  row.dataset.userId = snapshot.id;

  const identity = document.createElement("div");
  const name = document.createElement("strong");
  name.textContent = profile.displayName || "Google user";
  const email = document.createElement("span");
  email.textContent = profile.email || "";
  identity.append(name, email);

  const role = createSelect("role", ["student", "instructor", "admin"], profile.role);
  const status = createSelect("status", ["pending", "active", "blocked"], profile.status);
  const save = document.createElement("button");
  save.className = "text-button";
  save.type = "button";
  save.dataset.saveUser = snapshot.id;
  save.textContent = snapshot.id === currentUser.uid ? "Current account" : "Save";
  save.disabled = snapshot.id === currentUser.uid;
  row.append(identity, role, status, save);
  return row;
}

function createSelect(name, options, selected) {
  const select = document.createElement("select");
  select.name = name;
  select.setAttribute("aria-label", name === "role" ? "User role" : "Account status");
  options.forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value[0].toUpperCase() + value.slice(1);
    option.selected = value === selected;
    select.append(option);
  });
  return select;
}

async function handleUserAction(event) {
  const button = event.target.closest("[data-save-user]");
  if (!button || currentProfile?.role !== "admin") return;
  const row = button.closest(".user-row");
  button.disabled = true;
  try {
    await updateDoc(doc(db, "users", button.dataset.saveUser), {
      role: row.querySelector('[name="role"]').value,
      status: row.querySelector('[name="status"]').value,
      updatedAt: serverTimestamp(),
      updatedBy: currentUser.uid
    });
    button.textContent = "Saved";
    elements.adminFeedback.textContent = "Website access updated. Remember to apply the matching Google Drive permission.";
  } catch (error) {
    console.error(error);
    button.disabled = false;
    elements.adminFeedback.textContent = "The account could not be updated.";
  }
}

async function addResource(event) {
  event.preventDefault();
  if (currentProfile?.role !== "admin") return;
  const form = new FormData(elements.resourceForm);
  const roles = form.getAll("role");
  if (!roles.length) {
    elements.adminFeedback.textContent = "Select at least one allowed role.";
    return;
  }
  let driveUrl;
  try {
    driveUrl = safeDriveUrl(String(form.get("driveUrl")));
  } catch (error) {
    elements.adminFeedback.textContent = error.message;
    return;
  }

  try {
    await addDoc(collection(db, "resources"), {
      title: String(form.get("title")).trim(),
      description: String(form.get("description")).trim(),
      course: String(form.get("course")).trim(),
      driveUrl,
      allowedRoles: roles,
      published: true,
      createdAt: serverTimestamp(),
      createdBy: currentUser.uid
    });
    elements.resourceForm.reset();
    elements.resourceForm.querySelector('[value="student"]').checked = true;
    elements.adminFeedback.textContent = "Resource added.";
    await loadResources(currentProfile.role);
  } catch (error) {
    console.error(error);
    elements.adminFeedback.textContent = "The resource could not be added.";
  }
}

async function handleResourceAction(event) {
  const button = event.target.closest("[data-delete-resource]");
  if (!button || currentProfile?.role !== "admin") return;
  if (!window.confirm("Remove this link from the website catalogue? The Drive file will remain unchanged.")) return;
  button.disabled = true;
  try {
    await deleteDoc(doc(db, "resources", button.dataset.deleteResource));
    await loadResources(currentProfile.role);
    elements.adminFeedback.textContent = "Resource removed from the website catalogue. The Drive file was not deleted.";
  } catch (error) {
    console.error(error);
    button.disabled = false;
    elements.adminFeedback.textContent = "The resource could not be removed.";
  }
}

function safeDriveUrl(value) {
  const url = new URL(value);
  const allowedHosts = new Set(["drive.google.com", "docs.google.com"]);
  if (url.protocol !== "https:" || !allowedHosts.has(url.hostname)) {
    throw new Error("Enter a valid Google Drive or Google Docs HTTPS link.");
  }
  return url.href;
}

function resetPanels() {
  elements.pending.hidden = true;
  elements.blocked.hidden = true;
  elements.resources.hidden = true;
  elements.admin.hidden = true;
  elements.resourceGrid.replaceChildren();
  elements.userList.replaceChildren();
}

function showAuthError(error) {
  console.error(error);
  elements.status.textContent = "Google sign-in could not be completed. Please try again.";
}
