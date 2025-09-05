/* Expected server endpoints:
   - Upload/update profile info:  POST /users/update
   - Create post:                 POST /posts/create
   - Delete post:                 DELETE /posts/:id   (preferred)
                                  POST /posts/delete/:id (fallback)
   - Like post:                   POST /posts/:id/like
   - Comment on post:             POST /posts/:id/comment
   - Share post:                  POST /posts/:id/share
*/

// === Global Click Handler ===
document.addEventListener("click", async (e) => {
  // --- Toggle 3-dots menu ---
  const dotsBtn = e.target.closest(".three-dots");
  if (dotsBtn) {
    e.preventDefault();
    e.stopPropagation();
    const id = dotsBtn.getAttribute("data-menu-for");
    const menu = document.getElementById(`menu-${id}`);

    document.querySelectorAll(".menu").forEach((m) => {
      if (m !== menu) m.classList.remove("show");
    });

    menu?.classList.toggle("show");
    return;
  }

  // --- Close menus if click outside ---
  if (!e.target.closest(".menu")) {
    document
      .querySelectorAll(".menu")
      .forEach((m) => m.classList.remove("show"));
  }

  // --- Delete post ---
  const deleteBtn = e.target.closest(".delete-post");
  if (deleteBtn) {
    const postId = deleteBtn.getAttribute("data-id");
    if (postId) confirmDelete(postId);
  }

  // --- Open Create Post modal ---
  if (e.target.closest("#openCreate")) {
    document.getElementById("createPostModal")?.classList.add("show");
  }

  // --- Close Create Post modal ---
  if (e.target.closest("#closeCreate")) {
    document.getElementById("createPostModal")?.classList.remove("show");
  }

  // --- Like post ---
  const likeBtn = e.target.closest(".like-btn");
  if (likeBtn) {
    const postId = likeBtn.closest(".post").dataset.id;
    try {
      const res = await fetch(`/posts/${postId}/like`, { method: "POST" });
      const data = await res.json();
      if (data.likes !== undefined) {
        likeBtn.querySelector(".like-count").textContent = data.likes;
        likeBtn.classList.toggle("liked"); // toggle CSS highlight
      }
    } catch (err) {
      console.error("Error liking post:", err);
    }
  }

  // --- Toggle comment section ---
  const commentBtn = e.target.closest(".comment-btn");
  if (commentBtn) {
    const section = commentBtn
      .closest(".post")
      .querySelector(".comments-section");
    // if (section) {
    //   section.style.display =
    //     section.style.display === "none" ? "block" : "none";
    // }
    if (section.style.display === "none" || !section.style.display) {
      section.style.display = "block";
    } else {
      section.style.display = "none";
    }
  }

  // --- Share post ---
  const shareBtn = e.target.closest(".share-btn");
  if (shareBtn) {
    const postId = shareBtn.closest(".post").dataset.id;
    try {
      const res = await fetch(`/posts/${postId}/share`, { method: "POST" });
      const data = await res.json();
      if (data.shares !== undefined) {
        shareBtn.querySelector(".share-count").textContent = data.shares;
        alert("Post shared!");
      }
    } catch (err) {
      console.error("Error sharing post:", err);
    }
  }
});

// === Delete Handler ===
async function confirmDelete(postId) {
  const ok = window.confirm("Delete this post?");
  if (!ok) return;

  try {
    const res = await fetch(`/posts/${postId}`, {
      method: "DELETE",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) throw new Error("Failed");

    document.getElementById(`post-${postId}`)?.remove();
  } catch (err) {
    console.warn("DELETE /posts/:id failed, trying fallback…", err);
    try {
      const form = document.createElement("form");
      form.method = "POST";
      form.action = `/posts/delete/${postId}`;
      document.body.appendChild(form);
      form.submit();
    } catch (_e) {
      alert("Could not delete post. Please refresh and try again.");
    }
  }
}

// === Create Post Submit ===
document.addEventListener("submit", async (e) => {
  if (e.target.matches("#postForm")) {
    e.preventDefault();

    const formData = new FormData(e.target);

    const text = formData.get("content")?.trim();
    const hasImage = e.target.querySelector("input[name='images']")?.files
      .length;
    const hasVideo = e.target.querySelector("input[name='videos']")?.files
      .length;

    if (!text && !hasImage && !hasVideo) {
      alert("Please add text, images, or videos before posting.");
      return;
    }

    try {
      const res = await fetch("/posts/create", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to create post");

      const newPost = await res.text(); // server should return rendered HTML
      document
        .querySelector(".feed")
        ?.insertAdjacentHTML("afterbegin", newPost);

      e.target.reset();
      document.getElementById("createPostModal")?.classList.remove("show");
      alert("Post created successfully!");
    } catch (err) {
      alert("Error creating post. Try again.");
      console.error(err);
    }
  }

  // === Comment form submit ===
  if (e.target.matches(".comment-form")) {
    e.preventDefault();
    const form = e.target;
    const input = form.querySelector("input");
    const content = input.value.trim();
    if (!content) return;

    const postId = form.closest(".post").dataset.id;

    try {
      const res = await fetch(`/posts/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const comment = await res.json();

      if (comment.error) {
        alert(comment.error);
        return;
      }

      // Append new comment
      const list = form
        .closest(".comments-section")
        .querySelector(".comments-list");
      const div = document.createElement("div");
      div.classList.add("comment");
      div.innerHTML = `
        <img src="${
          comment.user.profilePicture || "/uploads/avatar.jpg"
        }" class="avatar-xs" />
        <span><strong>${comment.user.name}</strong> ${comment.content}</span>
      `;
      list.appendChild(div);

      // Update counter
      const counter = form.closest(".post").querySelector(".comment-count");
      counter.textContent = parseInt(counter.textContent) + 1;

      input.value = "";
    } catch (err) {
      console.error("Error posting comment:", err);
    }
  }
});

// === Profile Edit Toggle ===
document.addEventListener("DOMContentLoaded", () => {
  const editBtn = document.getElementById("editProfileBtn");
  const profileDisplay = document.getElementById("profileDisplay");
  const editForm = document.getElementById("editProfileForm");
  const cancelBtn = document.getElementById("cancelEdit");

  if (editBtn && profileDisplay && editForm) {
    // Switch to edit mode
    editBtn.addEventListener("click", () => {
      profileDisplay.style.display = "none";
      editForm.style.display = "block";
    });

    // Cancel edit
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => {
        editForm.style.display = "none";
        profileDisplay.style.display = "block";
      });
    }

    // After submit, switch back
    editForm.addEventListener("submit", () => {
      setTimeout(() => {
        editForm.style.display = "none";
        profileDisplay.style.display = "block";

        const nameInput = editForm.querySelector("input[name='name']");
        const bioInput = editForm.querySelector("textarea[name='bio']");
        if (nameInput && bioInput) {
          profileDisplay.querySelector(".name").childNodes[0].textContent =
            nameInput.value + " ";
          profileDisplay.querySelector(".bio").textContent =
            bioInput.value || "No bio yet";
        }
      }, 300);
    });
  }
});
