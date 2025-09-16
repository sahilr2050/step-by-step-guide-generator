import StorageManager from './storage-manager.js';

// Load guides from Chrome storage
function loadGuides() {
  let table;
  if ($.fn.DataTable.isDataTable('#guidesTable')) {
    table = $('#guidesTable').DataTable();
  } else {
    table = $('#guidesTable').DataTable({
      language: {
        emptyTable: '<div class="empty-state"><div class="empty-state-icon">📚</div><h3>No guides yet</h3><p>Create your first guide to get started!</p></div>'
      },
      responsive: true,
      columnDefs: [{ targets: 2, orderable: false }],
      order: [[1, 'desc']], 
      dom: '<"top"lf>rt<"bottom"ip>',
      lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "All"]]
    });
  }

  chrome.storage.local.get(null, function(data) {
    table.clear();
    
    const guides = Object.keys(data)
      .filter(key => data[key].name && data[key].dateCreated)
      .map(id => ({
        id: id,
        name: data[id].name,
        date: data[id].dateCreated,
        data: data[id]
      }));

    guides.forEach(guide => {
      const formattedDate = new Date(guide.date).toLocaleDateString();
      const tagsText = guide.data.tags && guide.data.tags.length > 0 ? `<div class='guide-tags'>${guide.data.tags.join(', ')}</div>` : '';
      const actions = `
        <div class="action-btn-group">
          <button class="btn btn-sm btn-primary view-btn" data-id="${guide.id}"><i class="fas fa-eye"></i></button>
          <button class="btn btn-sm btn-success resume-btn" data-id="${guide.id}"><i class="fas fa-play"></i></button>
          <button class="btn btn-sm btn-warning edit-btn" data-id="${guide.id}"><i class="fas fa-pencil-alt"></i></button>
          <button class="btn btn-sm btn-danger delete-btn" data-id="${guide.id}"><i class="fas fa-trash"></i></button>
        </div>
      `;

      table.row.add([guide.name + tagsText, formattedDate, actions]);
    });

    table.draw();

    if (guides.length === 0) {
      $('#emptyState').show();
    } else {
      $('#emptyState').hide();
    }
  });
}

// Rename a guide
function renameGuide(id) {
  if (id === '') {
    console.error('Invalid guide ID');
    return;
  }

  chrome.storage.local.get([id], function(result) {
    const data = result || {};
    const currentName = data[id] ? data[id].name : '';

    Swal.fire({
      title: 'Enter New Guide Name',
      input: 'text',
      inputValue: currentName,
      showCancelButton: true,
      confirmButtonText: 'Rename',
      preConfirm: (newName) => {
        if (!newName) {
          Swal.showValidationMessage('Guide name cannot be empty');
          return false;
        }
        return newName;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const newName = result.value;
        chrome.storage.local.get([id], function(data) {
          if (data[id]) {
            data[id].name = newName;
            chrome.storage.local.set({ [id]: data[id] }, function() {
              Swal.fire({
                title: 'Guide Renamed',
                text: 'Guide renamed successfully',
                icon: 'success',
              });
              loadGuides();
            });
          }
        });
      }
    });
  });
}

// Delete a guide
function deleteGuide(id) {
  if (id === '') {
    console.error('Invalid guide ID');
    return;
  }

  chrome.storage.local.get([id], function(result) {
    const data = result || {};
    const guideName = data[id] ? data[id].name : 'this guide';

    Swal.fire({
      title: 'Confirm Deletion',
      text: `Are you sure you want to delete "${guideName}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc3545'
    }).then((result) => {
      if (result.isConfirmed) {
        chrome.storage.local.remove(id, function() {
          StorageManager.deleteGuideScreenshots(id)
            .then(() => {
              Swal.fire({
                title: 'Guide Deleted',
                text: 'Guide deleted successfully',
                icon: 'success',
              });
              loadGuides();
            })
            .catch(error => {
              console.error('Error deleting screenshots:', error);
              Swal.fire({
                title: 'Partial Deletion',
                text: 'Guide data deleted but some screenshots may remain',
                icon: 'warning'
              });
              loadGuides();
            });
        });
      }
    });
  });
}

// Event handlers
document.addEventListener('DOMContentLoaded', function() {
  loadGuides();

  document.addEventListener('click', function(event) {
    const target = event.target.closest('.view-btn, .resume-btn, .edit-btn, .delete-btn');
    if (!target) return;
    
    const guideId = target.dataset.id.toString();
    
    if (target.classList.contains('view-btn')) {
      window.location.href = `guide.html?id=${guideId}`;
    } else if (target.classList.contains('resume-btn')) {
      chrome.runtime.sendMessage({
        action: 'openPopupToResume',
        guideId: guideId
      });
    } else if (target.classList.contains('edit-btn')) {
      renameGuide(guideId);
    } else if (target.classList.contains('delete-btn')) {
      deleteGuide(guideId);
    }
  });
});

// Export functions for external use
export { loadGuides, renameGuide, deleteGuide };