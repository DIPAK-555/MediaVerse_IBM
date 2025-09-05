// =========================
// Toast Notification Helper
// =========================
function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast ${type} show`;

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000); // hide after 3s
}

// =========================
// Helper: build post HTML from JSON (for newly created posts)
// =========================
const postHTML = (p) => {
  const likeActive = (p.likes || []).includes(String(window.CURRENT_USER_ID))
    ? "active"
    : "";
  const images = (p.images || [])
    .map((src) => `<img src="${src}" alt="post image"/>`)
    .join("");
  const videos = (p.videos || [])
    .map((src) => `<video src="${src}" controls></video>`)
    .join("");
  const comments = (p.comments || [])
    .map(
      (c) => `
    <div class="comment">
      <img class="avatar-xs" src="${
        (c.user && c.user.profilePicture) ||
        "/uploads/images/default-profile.png"
      }"/>
      <div class="comment__bubble">
        <strong>${c.user ? c.user.name : "User"}</strong>
        <span>${c.content || ""}</span>
      </div>
    </div>`
    )
    .join("");

  const me = String(p.user && p.user._id) === String(window.CURRENT_USER_ID);

  return `
  <article class="post card" id="post-${p._id}">
    <header class="post__header">
      <div class="userline">
        <img class="avatar-sm" src="${
          (p.user && p.user.profilePicture) ||
          "/uploads/images/default-profile.png"
        }" alt="avatar"/>
        <div>
          <div class="author">${p.user ? p.user.name : "User"}</div>
          <div class="meta">${new Date(
            p.createdAt || Date.now()
          ).toLocaleString()}</div>
        </div>
      </div>

      <div class="menu-wrap">
        <button class="icon three" data-post="${
          p._id
        }"><i class="fa-solid fa-ellipsis"></i></button>
        <div class="menu">
          ${
            me
              ? `<button class="menu__item delete-post" data-id="${p._id}"><i class="fa-solid fa-trash"></i> Delete</button>`
              : ``
          }
        </div>
      </div>
    </header>

    ${p.content ? `<p class="post__text">${p.content}</p>` : ``}
    ${images ? `<div class="media-grid">${images}</div>` : ``}
    ${videos ? `<div class="media-col">${videos}</div>` : ``}

    <footer class="actions">
      <button class="act like-btn ${likeActive}" data-id="${p._id}">
        <i class="fa-regular fa-heart"></i> <span class="like-count">${
          (p.likes || []).length
        }</span>
      </button>
      <button class="act comment-toggle" data-id="${p._id}">
        <i class="fa-regular fa-comment"></i> <span class="comment-count">${
          (p.comments || []).length
        }</span>
      </button>
      <button class="act share-btn" data-id="${p._id}">
        <i class="fa-solid fa-share"></i> <span class="share-count">${
          (p.shares || []).length
        }</span>
      </button>
    </footer>

    <section class="comments" id="comments-${p._id}" hidden>
      <div class="comments__list">${comments}</div>
      <form class="comment-form" data-id="${p._id}">
        <input type="text" placeholder="Write a comment..." required/>
        <button type="submit" class="btn btn-ghost">Post</button>
      </form>
    </section>
  </article>`;
};

// =========================
// Main DOMContentLoaded Logic
// =========================
document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.getElementById("sidebar");
  const layout = document.querySelector(".layout");
  const hamburger = document.getElementById("hamburger");
  const avatarWrap = document.getElementById("avatarWrap");
  const avatarDropdown = document.getElementById("avatarDropdown");
  const profileAvatar = document.getElementById("profileAvatar");
  const createBtn = document.getElementById("createBtn");
  const composer = document.getElementById("composer");
  const postForm = document.getElementById("postForm");
  const feedList = document.getElementById("feedList");

  // Sidebar toggle
  hamburger?.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
    layout.classList.toggle("collapsed");
  });

  // Avatar: open dropdown + click avatar navigates to /profile
  profileAvatar?.addEventListener("click", (e) => {
    e.stopPropagation();
    avatarWrap.classList.toggle("open");
  });
  document.addEventListener("click", () => avatarWrap.classList.remove("open"));
  avatarDropdown?.addEventListener("click", (e) => e.stopPropagation());
  document.getElementById("profileAvatar")?.addEventListener("dblclick", () => {
    window.location.href = "/profile";
  });

  // Create -> focus composer
  createBtn?.addEventListener("click", () => {
    composer.scrollIntoView({ behavior: "smooth", block: "center" });
    composer.querySelector(".composer__input")?.focus();
  });

  // =========================
  // Media Selection Feedback + Preview
  // =========================
  const imageInput = postForm?.querySelector('input[name="images"]');
  const videoInput = postForm?.querySelector('input[name="videos"]');

  const previewBox = document.createElement("div");
  previewBox.classList.add("preview-box");
  postForm?.appendChild(previewBox);

  function updatePreview(input, type) {
    previewBox.innerHTML = "";
    [...input.files].forEach((file) => {
      const url = URL.createObjectURL(file);
      if (type === "image") {
        previewBox.innerHTML += `<img src="${url}" class="preview-thumb"/>`;
      } else if (type === "video") {
        previewBox.innerHTML += `<video src="${url}" class="preview-thumb" controls></video>`;
      }
    });
  }

  imageInput?.addEventListener("change", () => {
    if (imageInput.files.length > 0) {
      showToast(
        `${imageInput.files.length} image(s) selected successfully`,
        "success"
      );
      updatePreview(imageInput, "image");
    }
  });

  videoInput?.addEventListener("change", () => {
    if (videoInput.files.length > 0) {
      showToast(
        `${videoInput.files.length} video(s) selected successfully`,
        "success"
      );
      updatePreview(videoInput, "video");
    }
  });

  // =========================
  // Create Post (AJAX upload)
  // =========================
  postForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(postForm);
    const res = await fetch("/posts/create", {
      method: "POST",
      body: fd,
      headers: { Accept: "application/json" },
    });
    const out = await res.json();

    if (!res.ok || !out?.post) {
      showToast(out?.error || "Failed to upload post", "error");
      return;
    }

    feedList.insertAdjacentHTML("afterbegin", postHTML(out.post));
    postForm.reset();
    previewBox.innerHTML = "";

    showToast("Post uploaded successfully!", "success");
  });

  // =========================
  // Event delegation for dynamic posts
  // =========================
  document.body.addEventListener("click", async (e) => {
    const likeBtn = e.target.closest(".like-btn");
    const cmtTgl = e.target.closest(".comment-toggle");
    const shareBtn = e.target.closest(".share-btn");
    const delBtn = e.target.closest(".delete-post");
    const dots = e.target.closest(".three");

    if (dots) {
      const wrap = dots.closest(".menu-wrap");
      wrap.classList.toggle("open");
      document.addEventListener("click", function close(ev) {
        if (!wrap.contains(ev.target)) {
          wrap.classList.remove("open");
          document.removeEventListener("click", close);
        }
      });
    }

    // if (likeBtn) {
    //   const id = likeBtn.dataset.id;
    //   const r = await fetch(`/posts/${id}/like`, { method: "POST" });
    //   const d = await r.json();
    //   likeBtn.querySelector(".like-count").textContent = d.likes ?? 0;
    //   likeBtn.classList.toggle("active");
    //   showToast("You liked a post", "success");
    // }
    if (likeBtn) {
      const id = likeBtn.dataset.id;
      const r = await fetch(`/posts/${id}/like`, { method: "POST" });
      const d = await r.json();

      likeBtn.querySelector(".like-count").textContent = d.likes ?? 0;

      // toggle visual state
      const activeNow = likeBtn.classList.toggle("active");

      // swap outline ↔ solid heart
      const icon = likeBtn.querySelector("i");
      if (icon) {
        if (activeNow) {
          icon.classList.remove("fa-regular");
          icon.classList.add("fa-solid");
        } else {
          icon.classList.remove("fa-solid");
          icon.classList.add("fa-regular");
        }
      }

      showToast(activeNow ? "You liked a post" : "Like removed", "success");
    }

    // if (shareBtn) {
    //   const id = shareBtn.dataset.id;
    //   const r = await fetch(`/posts/${id}/share`, { method: "POST" });
    //   const d = await r.json();
    //   shareBtn.querySelector(".share-count").textContent = d.shares ?? 0;
    //   showToast("Post shared!", "success");
    // }
    if (shareBtn) {
      const id = shareBtn.dataset.id;
      const url = `${location.origin}/posts/${id}`;
      try {
        // 1. Update DB counter
        const r = await fetch(`/posts/${id}/share`, { method: "POST" });
        const d = await r.json();
        shareBtn.querySelector(".share-count").textContent = d.shares ?? 0;

        // 2. Open native share sheet if available
        if (navigator.share) {
          await navigator.share({
            title: "Media Verse",
            text: "Check out this post!",
            url,
          });
        } else {
          // fallback: copy link
          await navigator.clipboard.writeText(url);
          showToast("Link copied to clipboard", "success");
        }
      } catch (err) {
        console.error("Share failed:", err);
        showToast("Share failed", "error");
      }
    }

    if (cmtTgl) {
      const id = cmtTgl.dataset.id;
      const sec = document.getElementById(`comments-${id}`);
      if (sec) sec.hidden = !sec.hidden;
    }

    if (delBtn) {
      const id = delBtn.dataset.id;
      if (!confirm("Delete this post?")) return;
      const r = await fetch(`/posts/${id}`, { method: "DELETE" });
      if (r.ok) {
        document.getElementById(`post-${id}`)?.remove();
        showToast("Post deleted", "success");
      } else {
        const d = await r.json().catch(() => ({}));
        showToast(d.error || "Failed to delete", "error");
      }
    }
  });

  // =========================
  // Submit a new comment
  // =========================
  document.body.addEventListener("submit", async (e) => {
    const form = e.target.closest(".comment-form");
    if (!form) return;
    e.preventDefault();
    const id = form.dataset.id;
    const input = form.querySelector("input");
    const content = input.value.trim();
    if (!content) return;

    const r = await fetch(`/posts/${id}/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const c = await r.json();

    const list = form.parentElement.querySelector(".comments__list");
    list.insertAdjacentHTML(
      "beforeend",
      `
      <div class="comment">
        <img class="avatar-xs" src="${
          (c.user && c.user.profilePicture) ||
          "/uploads/images/default-profile.png"
        }"/>
        <div class="comment__bubble"><strong>${
          c.user ? c.user.name : "User"
        }</strong> <span>${c.content}</span></div>
      </div>
    `
    );

    const countEl = form.closest(".post").querySelector(".comment-count");
    if (countEl)
      countEl.textContent = String(
        1 + parseInt(countEl.textContent || "0", 10)
      );
    input.value = "";

    showToast("Comment added!", "success");
  });

  // =========================
  // Search + Popup Modal
  // =========================
  const searchInput = document.getElementById("searchInput");
  const searchResults = document.getElementById("searchResults");
  const profileModal = document.getElementById("profileModal");
  const modalBody = document.getElementById("modalBody");
  const closeModal = document.getElementById("closeModal");

  searchInput?.addEventListener("input", async () => {
    const q = searchInput.value.trim();
    if (!q) {
      searchResults.innerHTML = "";
      return;
    }

    const res = await fetch(`/search?q=${encodeURIComponent(q)}`);
    const out = await res.json();

    searchResults.innerHTML = "";

    if (out.users?.length) {
      out.users.forEach((u) => {
        const div = document.createElement("div");
        div.className = "search-item";
        div.innerHTML = `
          <img src="${
            u.profilePicture || "/uploads/images/default-profile.png"
          }" class="avatar-xs"/>
          <span>${u.name}</span>
        `;
        div.addEventListener("click", () => {
          modalBody.innerHTML = `
    <div class="profile-popup">
      <img src="${
        u.profilePicture || "/uploads/images/default-profile.png"
      }" class="avatar-lg"/>
      <h2>${u.name}</h2>
      <p>${u.email || ""}</p>
      <div class="pop-actions">
         <button class="btn btn-primary" id="viewProfileBtn">View Profile</button> 
      </div>
    </div>
  `;
          profileModal.hidden = false;

          // attach button click -> go to profile page
          // const viewBtn = document.getElementById("viewProfileBtn");
          // viewBtn?.addEventListener("click", () => {
          //   window.location.href = `/profile/${u._id}`;
          // });
          // viewBtn?.addEventListener("click", () => {
          //   // optional: close the modal first so it feels instant
          //   profileModal.hidden = true;
          //   window.location.href = "/profile/" + encodeURIComponent(u._id);
          // });
        });

        searchResults.appendChild(div);
      });
    }

    // if (out.posts?.length) {
    //   out.posts.forEach((p) => {
    //     const div = document.createElement("div");
    //     div.className = "search-item";
    //     div.innerHTML = `<i class="fa-regular fa-file-lines"></i> ${p.content}`;
    //     div.addEventListener("click", () => {
    //       const el = document.getElementById(`post-${p._id}`);
    //       if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    //     });
    //     searchResults.appendChild(div);
    //   });
    // }

    // if (out.posts?.length) {
    //   out.posts.forEach((p) => {
    //     const div = document.createElement("div");
    //     div.className = "search-item";
    //     div.innerHTML = `<i class="fa-regular fa-file-lines"></i> ${p.content}`;
    //     div.addEventListener("click", () => {
    //       modalBody.innerHTML = `
    //     <div class="post-popup">
    //       <div class="userline">
    //         <img src="${
    //           p.user?.profilePicture || "/uploads/images/default-profile.png"
    //         }" class="avatar-sm"/>
    //         <span>${p.user?.name}</span>
    //       </div>
    //       <p>${p.content}</p>
    //     </div>
    //   `;
    //       profileModal.hidden = false;
    //     });
    //     searchResults.appendChild(div);
    //   });
    // }
    if (out.posts?.length) {
      out.posts.forEach((p) => {
        const div = document.createElement("div");
        div.className = "search-item";
        div.innerHTML = `<i class="fa-regular fa-file-lines"></i> ${p.content}`;
        div.addEventListener("click", () => {
          const el = document.getElementById(`post-${p._id}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            searchResults.innerHTML = ""; // clear after clicking
            searchInput.value = ""; // reset input
          }
        });
        searchResults.appendChild(div);
      });
    }
  });

  closeModal?.addEventListener("click", () => {
    profileModal.hidden = true;
  });

  window.addEventListener("click", (e) => {
    if (e.target === profileModal) profileModal.hidden = true;
  });

  // Close search results when clicking outside
  document.addEventListener("click", (e) => {
    if (!searchResults.contains(e.target) && e.target !== searchInput) {
      searchResults.innerHTML = "";
    }
  });
  /*xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx*/
  // document.addEventListener("click", (e) => {
  //   // toggle when clicking the 3-dots
  //   const btn = e.target.closest(".menu-wrap .three");
  //   if (btn) {
  //     const wrap = btn.closest(".menu-wrap");
  //     document.querySelectorAll(".menu-wrap.open").forEach((w) => {
  //       if (w !== wrap) w.classList.remove("open");
  //     });
  //     wrap.classList.toggle("open");
  //     return;
  //   }
  //   // close when clicking elsewhere
  //   if (!e.target.closest(".menu-wrap")) {
  //     document
  //       .querySelectorAll(".menu-wrap.open")
  //       .forEach((w) => w.classList.remove("open"));
  //   }
  // });
  // Image modal functionality
  const imageModal = document.getElementById("imageModal");
  const modalImg = document.getElementById("modalImg");
  const closeModalBtn = imageModal.querySelector(".close");

  document.body.addEventListener("click", (e) => {
    const img = e.target.closest(".media-grid img");
    if (img) {
      modalImg.src = img.src;
      imageModal.hidden = false;
    }
  });

  closeModalBtn?.addEventListener("click", () => {
    imageModal.hidden = true;
  });

  imageModal.addEventListener("click", (e) => {
    if (e.target === imageModal) {
      imageModal.hidden = true;
    }
  });
});
