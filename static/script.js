const LOCAL_API = '/api/posts';
const LOCAL_NOTES_API = '/api/notes';

async function fetchPosts() {
  try {
    const response = await fetch(LOCAL_API);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    displayPosts(data.posts || []);
  } catch (error) {
    console.error('Failed to fetch posts:', error);
  }
}

function displayPosts(posts) {
  const featuredContainer = document.getElementById('featured-container');
  const latestContainer = document.getElementById('latest-container');
  const archiveContainer = document.getElementById('archive-container');
  const collaborationsContainer = document.getElementById('collaborations-container');

  if (posts.length === 0) {
    featuredContainer.innerHTML = '<p>No posts available.</p>';
    if (collaborationsContainer) {
      collaborationsContainer.innerHTML = '<p>No collaborations yet.</p>';
    }
    return;
  }

  const isCollaboration = post => {
    const bylines = post.publishedBylines || post.authors || [];
    if (Array.isArray(bylines) && bylines.length > 1) return true;
    const lowerTitle = (post.title || '').toLowerCase();
    const lowerSubtitle = (post.subtitle || '').toLowerCase();
    return lowerTitle.includes('collab') || lowerTitle.includes('collaboration') ||
           lowerSubtitle.includes('collab') || lowerSubtitle.includes('collaboration');
  };

  const featuredPost = posts[0];
  const latestPosts = posts.slice(0, 5);
  const archivePosts = posts;
  const collaborationPosts = posts.filter(isCollaboration);

  featuredContainer.innerHTML = generatePostHTML(featuredPost, true);
  latestContainer.innerHTML = '';
  archiveContainer.innerHTML = '';
  if (collaborationsContainer) collaborationsContainer.innerHTML = '';

  latestPosts.forEach(post => {
    latestContainer.innerHTML += generatePostHTML(post, false);
  });

  archivePosts.forEach(post => {
    archiveContainer.innerHTML += generatePostHTML(post, false);
  });

  if (collaborationsContainer) {
    if (collaborationPosts.length === 0) {
      collaborationsContainer.innerHTML = '<p>No collaborations yet.</p>';
    } else {
      collaborationPosts.forEach(post => {
        collaborationsContainer.innerHTML += generatePostHTML(post, false);
      });
    }
  }
}

function generatePostHTML(post, isFeatured) {
  const imageUrl = post.cover_image || post.cover_photo_url || '/static/images/default.png';
  const date = (post.post_date || post.content_date)
    ? new Date(post.post_date || post.content_date).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric'
      })
    : 'Unknown date';
  let author = 'Unknown author';
  if (post.publishedBylines && post.publishedBylines.length > 0) {
    author = post.publishedBylines.map(a => a.name).join(', ');
  } else if (post.authors && post.authors.length > 0) {
    author = Array.isArray(post.authors)
      ? post.authors.join(', ')
      : post.authors;
  }

  return `
    <a class="post-card" href="${post.canonical_url || post.web_url || '#'}" target="_blank" rel="noopener noreferrer">
      <div class="post-image">
        <img src="${imageUrl}" alt="${post.title}" onerror="this.src='images/default.png'">
      </div>
      <div class="post-content">
        <div class="post-title">${post.title || 'Untitled'}</div>
        <div class="post-description">${post.subtitle || ''}</div>
        <div class="post-meta">${date} | ${author}</div>
      </div>
    </a>
  `;
}

async function fetchNotes() {
  try {
    const response = await fetch(LOCAL_NOTES_API);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    const notes = data.notes?.items || [];
    notes.sort((a, b) => {
      const dateA = new Date(a.comment?.date || a.context?.timestamp || 0);
      const dateB = new Date(b.comment?.date || b.context?.timestamp || 0);
      return dateB - dateA;
    });
    displayNotes(notes);
  } catch (error) {
    console.error('Failed to fetch notes:', error);
    const notesTab = document.getElementById('notes-tab');
    if (notesTab) {
      notesTab.innerHTML = `<section><h2>Notes</h2><p>Failed to load notes.</p></section>`;
    }
  }
}

function displayNotes(notes) {
  const notesTab = document.getElementById('notes-tab');
  if (!notesTab) return;
  if (!notes.length) {
    notesTab.innerHTML = `<section><h2>Notes</h2><p>No notes available.</p></section>`;
    return;
  }

  let html = `<section><h2>Notes</h2><div class="notes-list">`;
  notes.forEach(item => {
    if (item.type === 'comment' && item.comment) {
      const noteUser = item.comment.name || 'Unknown user';
      const noteHandle = (item.comment.handle || '').toLowerCase();
      const isMainAuthor = ['rohit shukla', 'flocknation'].includes(noteUser.trim().toLowerCase()) ||
                           ['dmvdrive', 'flocknation'].includes(noteHandle);
      const noteDate = item.comment.date
        ? new Date(item.comment.date).toLocaleString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })
        : 'Unknown date';
      const noteBody = item.comment.body || '';
      const avatarUrl = item.comment.photo_url || 'images/default.png';

      let attachmentImages = '';
      if (Array.isArray(item.comment.attachments)) {
        item.comment.attachments.forEach(att => {
          if (att.type === "post" && att.post) {
            const postCover = att.post.cover_image || att.post.cover_photo_url || (att.publication && att.publication.logo_url);
            if (postCover) {
              attachmentImages += `
                <div class="note-image">
                  <img src="${postCover}" alt="Post cover image" style="max-width:100%;max-height:300px;border-radius:10px;margin-top:0.5rem;">
                </div>
              `;
            }
          } else if (att.type === "image" && (att.imageUrl || att.url)) {
            const imageUrl = att.imageUrl || att.url;
            attachmentImages += `
              <div class="note-image">
                <img src="${imageUrl}" alt="Note image" style="max-width:100%;max-height:300px;border-radius:10px;margin-top:0.5rem;">
              </div>
            `;
          }
        });
      }

      html += `
        <div class="note-card">
          <div class="note-header">
            <img src="${avatarUrl}" alt="${noteUser}" class="note-avatar" onerror="this.src='images/default.png'">
            <span class="note-user">${noteUser}</span>
            <span class="note-date">${noteDate}</span>
          </div>
          <div class="note-body">${noteBody}</div>
          ${attachmentImages}
          ${!isMainAuthor ? `<div class="note-restacked">Note restacked by an author</div>` : ''}
        </div>
      `;
    }
  });
  html += `</div></section>`;
  notesTab.innerHTML = html;
}

window.addEventListener('DOMContentLoaded', () => {
  fetchPosts();
  fetchNotes();
});
