const API_ROOT = window.CAMPUS_CHRONICLE_API_ROOT || "/api/v1";
const VIEWER_KEY = "campusChronicle.viewer";

const endpoints = {
  register: "/signUp/register",
  login: "/loginUser/login",
  logout: "/logout/logOut",
  posts: "/blogs/getPosts",
  post: (id) => `/blogs/getBlog/${encodeURIComponent(id)}`,
  createPost: "/create/writePost",
  comments: (id) => `/comment/getComments/${encodeURIComponent(id)}`,
  createComment: (id) => `/comment/writeComment/${encodeURIComponent(id)}`,
};

function readSession() {
  try {
    const stored = localStorage.getItem(VIEWER_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveSession(session) {
  localStorage.setItem(VIEWER_KEY, JSON.stringify(session));
  renderAuthState();
}

function clearSession() {
  localStorage.removeItem(VIEWER_KEY);
  renderAuthState();
}

function currentUser() {
  return readSession()?.user || null;
}

async function api(path, options = {}) {
  const {
    authRequired = false,
    returnPayload = false,
    timeoutMs = 15000,
    ...requestOptions
  } = options;
  const headers = new Headers(requestOptions.headers || {});
  if (requestOptions.body && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");

  let response;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    response = await fetch(`${API_ROOT}${path}`, {
      ...requestOptions,
      headers,
      credentials: "include",
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(
        "The server did not respond within 15 seconds. Please try again."
      );
    }
    throw new Error(
      "The API could not be reached. Start the backend and try again."
    );
  } finally {
    window.clearTimeout(timeout);
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }
  if (!response.ok || payload.success === false) {
    if (response.status === 401 && authRequired) clearSession();
    throw new Error(payload.message || `Request failed (${response.status})`);
  }
  // Most routes put the resource in `data`. `writePost` predates that convention
  // and returns the newly-created post as `message`, so callers can opt into the
  // complete envelope when they need to support that existing route unchanged.
  return returnPayload ? payload : payload.data;
}

function escapeHtml(value = "") {
  return String(value).replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#039;",
        '"': "&quot;",
      })[character]
  );
}

function initials(value = "Campus Chronicle") {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function formatDate(value) {
  if (!value) return "Recently";
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "Recently"
    : new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
}

function humanTag(value) {
  return String(value || "Campus life")
    .toLowerCase()
    .replace(/[_-]+/g, " ");
}

function storyUrl(id) {
  return `/post/?id=${encodeURIComponent(id)}`;
}

function setStatus(element, message, type = "info") {
  if (!element) return;
  element.textContent = message;
  element.className = `form-status ${type}`;
}

function setButtonLoading(button, loading, loadingLabel = "Please wait…") {
  if (!button) return;
  if (loading) {
    button.dataset.label = button.textContent;
    button.textContent = loadingLabel;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.label || button.textContent;
    button.disabled = false;
  }
}

function renderAuthState() {
  const user = currentUser();
  document
    .querySelectorAll("[data-guest-only]")
    .forEach((element) => element.classList.toggle("hidden", Boolean(user)));
  document
    .querySelectorAll("[data-member-only]")
    .forEach((element) => element.classList.toggle("hidden", !user));
  document.querySelectorAll("[data-user-name]").forEach((element) => {
    element.textContent = user?.fullName || user?.username || "";
  });
}

async function logout() {
  try {
    await api(endpoints.logout, { method: "POST", authRequired: true });
  } catch (error) {
    // Clear local UI state even when an expired backend session prevents a logout request.
    console.warn(error.message);
  }
  clearSession();
  window.location.assign("/");
}

function bindSharedControls() {
  renderAuthState();
  document.querySelectorAll("[data-login-link]").forEach((link) => {
    link.setAttribute("href", "/login/");
  });
  document
    .querySelectorAll("[data-logout]")
    .forEach((button) => button.addEventListener("click", logout));
}

function cardMarkup(post, index = 0) {
  const title = escapeHtml(post.postName || "Untitled story");
  const excerpt = escapeHtml(
    post.postSubContent || post.postContent || "A story from our community."
  );
  const tag = humanTag(post.postTag);
  const hue = ["#1a8917", "#f0b84c", "#7b61a8", "#c86447", "#267a86"][
    index % 5
  ];
  return `<article class="story-card" data-story-tag="${escapeHtml(tag)}">
    <div>
      <div class="story-meta"><span class="avatar">CC</span><span>Campus Chronicle writer</span></div>
      <a href="${storyUrl(post._id)}" aria-label="Read ${title}"><h2 class="story-title">${title}</h2></a>
      <p class="story-description">${excerpt}</p>
      <div class="story-footer"><span><span class="tag">${escapeHtml(tag)}</span> · ${formatDate(post.createdAt)}</span><span aria-hidden="true">↗</span></div>
    </div>
    <a href="${storyUrl(post._id)}" class="story-thumb" style="--thumb:${hue}" aria-hidden="true"><span>${escapeHtml((post.postName || "C").charAt(0).toUpperCase())}</span></a>
  </article>`;
}

async function initializeHome() {
  const list = document.querySelector("[data-story-list]");
  const trending = document.querySelector("[data-trending]");
  const feedback = document.querySelector("[data-feed-feedback]");
  if (!list) return;
  try {
    const posts = await api(endpoints.posts);
    const safePosts = Array.isArray(posts) ? posts : [];
    window.__campusPosts = safePosts;
    renderStories(safePosts);
    renderTrending(safePosts);
    if (feedback)
      feedback.textContent = safePosts.length
        ? `${safePosts.length} stories from the community`
        : "Be the first to publish a story.";
  } catch (error) {
    list.innerHTML = `<div class="error-state"><h2>Stories are taking a moment</h2><p>${escapeHtml(error.message)}</p><button class="button small" data-retry-feed>Try again</button></div>`;
    list
      .querySelector("[data-retry-feed]")
      ?.addEventListener("click", initializeHome);
    if (trending) trending.innerHTML = "";
  }
}

function renderStories(posts) {
  const list = document.querySelector("[data-story-list]");
  if (!list) return;
  if (!posts.length) {
    list.innerHTML = `<div class="empty-state"><h2>No stories yet</h2><p>Start the campus conversation with the first post.</p></div>`;
    return;
  }
  list.innerHTML = posts
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(cardMarkup)
    .join("");
}

function renderTrending(posts) {
  const target = document.querySelector("[data-trending]");
  if (!target) return;
  target.innerHTML =
    posts
      .slice(0, 5)
      .map(
        (post, index) => `<a class="trending-item" href="${storyUrl(post._id)}">
    <span class="trending-index">0${index + 1}</span>
    <span><span class="trending-title">${escapeHtml(post.postName || "Untitled story")}</span><span class="trending-byline">${humanTag(post.postTag)} · ${formatDate(post.createdAt)}</span></span>
  </a>`
      )
      .join("") ||
    `<p class="trending-byline">New stories will appear here.</p>`;
}

function bindTopicFilters() {
  document.querySelectorAll("[data-topic]").forEach((button) =>
    button.addEventListener("click", () => {
      document
        .querySelectorAll("[data-topic]")
        .forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      const topic = button.dataset.topic;
      const posts = window.__campusPosts || [];
      renderStories(
        topic === "all"
          ? posts
          : posts.filter((post) => humanTag(post.postTag) === topic)
      );
    })
  );
}

function bindLoginForm() {
  const form = document.querySelector("[data-login-form]");
  if (!form) return;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = form.querySelector("button[type=submit]");
    const status = form.querySelector("[data-form-status]");
    const data = new FormData(form);
    const identifier = String(data.get("identifier") || "").trim();
    if (!identifier || !data.get("password"))
      return setStatus(
        status,
        "Enter your email or username and password.",
        "error"
      );
    setButtonLoading(submit, true, "Signing in…");
    setStatus(status, "");
    try {
      const session = await api(endpoints.login, {
        method: "POST",
        body: JSON.stringify({
          email: identifier,
          username: identifier,
          password: data.get("password"),
        }),
      });
      if (!session?.user)
        throw new Error("The login response was incomplete. Please try again.");
      saveSession({ user: session.user });
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.assign(next && next.startsWith("/") ? next : "/");
    } catch (error) {
      setStatus(status, error.message, "error");
      setButtonLoading(submit, false);
    }
  });
}

function bindSignupForm() {
  const form = document.querySelector("[data-signup-form]");
  if (!form) return;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = form.querySelector("button[type=submit]");
    const status = form.querySelector("[data-form-status]");
    const data = new FormData(form);
    const payload = Object.fromEntries(data.entries());
    if (Object.values(payload).some((value) => !String(value).trim()))
      return setStatus(
        status,
        "Every field helps create a complete profile.",
        "error"
      );
    setButtonLoading(submit, true, "Creating account…");
    setStatus(status, "");
    let accountCreated = false;
    try {
      await api(endpoints.register, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      accountCreated = true;
      setStatus(status, "Account created. Signing you in…", "success");
      const session = await api(endpoints.login, {
        method: "POST",
        body: JSON.stringify({
          email: payload.email,
          username: payload.username,
          password: payload.password,
        }),
      });
      if (!session?.user) {
        throw new Error(
          "Your account was created, but automatic sign-in failed."
        );
      }
      saveSession({ user: session.user });
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.assign(next && next.startsWith("/") ? next : "/");
    } catch (error) {
      setStatus(
        status,
        accountCreated
          ? `Your account was created, but sign-in did not complete: ${error.message} Please sign in manually.`
          : error.message,
        "error"
      );
      setButtonLoading(submit, false);
    }
  });
}

function initializeWritePage() {
  const form = document.querySelector("[data-write-form]");
  if (!form) return;
  const user = currentUser();
  if (!user) {
    window.location.replace(`/login/?next=${encodeURIComponent("/write/")}`);
    return;
  }
  document.querySelector("[data-author-name]").textContent =
    user.fullName || user.username;
  document.querySelector("[data-author-initials]").textContent = initials(
    user.fullName || user.username
  );
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = form.querySelector("button[type=submit]");
    const status = form.querySelector("[data-form-status]");
    const data = new FormData(form);
    const payload = {
      postName: String(data.get("postName") || "").trim(),
      postSubContent: String(data.get("postSubContent") || "").trim(),
      postTag: String(data.get("postTag") || "").trim(),
      postContent: String(data.get("postContent") || "").trim(),
      postAuthor: user.fullName,
    };
    if (
      !payload.postName ||
      !payload.postTag ||
      !payload.postContent ||
      !payload.postAuthor
    )
      return setStatus(
        status,
        "Add a title, a topic, and the body of your story.",
        "error"
      );
    setButtonLoading(submit, true, "Publishing…");
    setStatus(status, "");
    try {
      const created = await api(endpoints.createPost, {
        method: "POST",
        body: JSON.stringify(payload),
        authRequired: true,
        returnPayload: true,
      });
      const post = created?.data?._id
        ? created.data
        : created?.message?._id
          ? created.message
          : null;
      if (!post)
        throw new Error(
          "Your story was created, but its ID was not returned. Find it on the home page."
        );
      window.location.assign(storyUrl(post._id));
    } catch (error) {
      setStatus(status, error.message, "error");
      setButtonLoading(submit, false);
    }
  });
}

function postMarkup(post) {
  const title = escapeHtml(post.postName || "Untitled story");
  const deck = escapeHtml(post.postSubContent || "A Campus Chronicle story.");
  const content = escapeHtml(post.postContent || "")
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p>`)
    .join("");
  return `<header class="post-header">
    <span class="post-tag">${escapeHtml(humanTag(post.postTag))}</span>
    <h1>${title}</h1>
    <p class="post-deck">${deck}</p>
    <div class="post-author"><span class="avatar">CC</span><div><strong>Campus Chronicle writer</strong><span>${formatDate(post.createdAt)} · Community story</span></div></div>
  </header><article class="article-body">${content}</article>`;
}

function commentMarkup(comment) {
  const author = comment.commentAuthor?.username || "Campus reader";
  return `<article class="comment"><div class="comment-byline"><span class="avatar">${escapeHtml(initials(author))}</span><strong>${escapeHtml(author)}</strong><span class="comment-date">· ${formatDate(comment.createdAt)}</span></div><p class="comment-content">${escapeHtml(comment.content || "")}</p></article>`;
}

async function initializePostPage() {
  const postTarget = document.querySelector("[data-post-content]");
  const commentsTarget = document.querySelector("[data-comment-list]");
  const commentArea = document.querySelector("[data-comment-area]");
  if (!postTarget) return;
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) {
    postTarget.innerHTML = `<div class="error-state"><h2>Story not found</h2><p>This link does not include a post ID.</p><a class="button small" href="/">Back to stories</a></div>`;
    if (commentArea) commentArea.remove();
    return;
  }
  try {
    const post = await api(endpoints.post(id));
    postTarget.innerHTML = postMarkup(post);
    document.title = `${post.postName || "Story"} — Campus Chronicle`;
    initializeComments(id, commentsTarget, commentArea);
  } catch (error) {
    postTarget.innerHTML = `<div class="error-state"><h2>We couldn't open this story</h2><p>${escapeHtml(error.message)}</p><a class="button small" href="/">Back to stories</a></div>`;
    if (commentArea) commentArea.remove();
  }
}

async function loadComments(id, target) {
  if (!target) return;
  try {
    const comments = await api(endpoints.comments(id));
    target.innerHTML =
      Array.isArray(comments) && comments.length
        ? comments.map(commentMarkup).join("")
        : `<p class="trending-byline">No responses yet. Start the conversation.</p>`;
  } catch (error) {
    target.innerHTML = `<p class="trending-byline">Responses could not be loaded: ${escapeHtml(error.message)}</p>`;
  }
}

function initializeComments(id, target, area) {
  loadComments(id, target);
  if (!area) return;
  const user = currentUser();
  const form = area.querySelector("form");
  const gate = area.querySelector("[data-comment-login]");
  if (!user) {
    form?.classList.add("hidden");
    gate?.classList.remove("hidden");
    gate
      ?.querySelector("a")
      ?.setAttribute(
        "href",
        `/login/?next=${encodeURIComponent(`/post/?id=${id}`)}`
      );
    return;
  }
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const textarea = form.querySelector("textarea");
    const submit = form.querySelector("button[type=submit]");
    const status = form.querySelector("[data-form-status]");
    const content = textarea.value.trim();
    if (!content)
      return setStatus(
        status,
        "Write a response before publishing it.",
        "error"
      );
    setButtonLoading(submit, true, "Publishing…");
    setStatus(status, "");
    try {
      await api(endpoints.createComment(id), {
        method: "POST",
        body: JSON.stringify({ content }),
        authRequired: true,
      });
      textarea.value = "";
      setStatus(status, "Response published.", "success");
      await loadComments(id, target);
    } catch (error) {
      setStatus(status, error.message, "error");
    } finally {
      setButtonLoading(submit, false);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindSharedControls();
  bindTopicFilters();
  initializeHome();
  bindLoginForm();
  bindSignupForm();
  initializeWritePage();
  initializePostPage();
});
