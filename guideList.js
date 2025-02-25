$(document).ready(function () {
  // Load guides on page load
  loadGuides();

  // View button click handler
  $(document).on('click', '.view-btn', function () {
    const guideId = $(this).data('id');
    // Redirect to guide view page
    window.location.href = `guide.html?id=${guideId}`;
  });

  // Bind event handlers for rename and delete buttons
  $(document).on('click', '.edit-btn', function () {
    const guideId = $(this).data('id').toString();
    renameGuide(guideId);
  });

  $(document).on('click', '.delete-btn', function () {
    const guideId = $(this).data('id').toString();
    deleteGuide(guideId);
  });
});

// Load guides from Chrome storage
window.loadGuides = function () {
  // Check if DataTable is already initialized
  let table;
  if ($.fn.DataTable.isDataTable('#guidesTable')) {
    table = $('#guidesTable').DataTable();
  } else {
    // Initialize DataTable if not already initialized
    table = $('#guidesTable').DataTable({
      language: {
        emptyTable: '<div class="empty-state"><div class="empty-state-icon">📚</div><h3>No guides yet</h3><p>Create your first guide to get started!</p></div>'
      },
      responsive: true,
      columnDefs: [
        { targets: 2, orderable: false }
      ],
      order: [[1, 'desc']], // Sort by date descending
      dom: '<"top"lf>rt<"bottom"ip>',
      lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "All"]]
    });
  }

  chrome.storage.local.get(null, function (data) {
    // Clear existing data
    table.clear();

    // Filter out non-guide entries and convert to array
    const guides = Object.keys(data)
      .filter(key => data[key].name && data[key].dateCreated) // Ensure it's a guide
      .map(id => ({
        id: id,
        name: data[id].name,
        date: data[id].dateCreated,
        data: data[id]
      }));

    // Add data to table
    guides.forEach(guide => {
      const formattedDate = new Date(guide.date).toLocaleDateString();
      const actions = `
          <div class="action-btn-group">
            <button class="btn btn-sm btn-primary view-btn" data-id="${guide.id}"><i class="fas fa-eye"></i></button>
            <button class="btn btn-sm btn-warning edit-btn" data-id="${guide.id}"><i class="fas fa-pencil-alt"></i></button>
            <button class="btn btn-sm btn-danger delete-btn" data-id="${guide.id}"><i class="fas fa-trash"></i></button>
          </div>
        `;

      table.row.add([guide.name, formattedDate, actions]);
    });

    // Draw the table
    table.draw();

    // Show empty state if no guides
    if (guides.length === 0) {
      $('#emptyState').show();
    } else {
      $('#emptyState').hide();
    }
  });
}

// Global function to rename a guide
window.renameGuide = function (id) {
  if (id === '') {
    console.error('Invalid guide ID');
    return;
  }

  chrome.storage.local.get([id], function (result) {
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
        chrome.storage.local.get([id], function (data) {
          if (data[id]) {
            data[id].name = newName;
            chrome.storage.local.set({ [id]: data[id] }, function () {
              Swal.fire({
                title: 'Guide Renamed',
                text: 'Guide renamed successfully',
                icon: 'success',
              });
              loadGuides(); // Reload guides instead of page refresh
            });
          }
        });
      }
    });
  });
};

// Global function to delete a guide
window.deleteGuide = function (id) {
  if (id === '') {
    console.error('Invalid guide ID');
    return;
  }

  chrome.storage.local.get([id], function (result) {
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
        chrome.storage.local.remove(id, function () {
          Swal.fire('Guide deleted successfully');
          loadGuides(); // Reload guides instead of page refresh
        });
      }
    });
  });
};