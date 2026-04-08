document.querySelectorAll('[data-size-chart]').forEach((chart) => {
  const buttons = chart.querySelectorAll('.size-chart-unit-btn');
  const table = chart.querySelector('table');
  if (!table) return;

  // Find which column indices are "size" columns (case-insensitive)
  const sizeColIndices = new Set();
  table.querySelectorAll('thead th').forEach((th, i) => {
    if (th.textContent.trim().toLowerCase() === 'size') {
      sizeColIndices.add(i);
    }
  });

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const unit = btn.dataset.unit;

      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      table.querySelectorAll('tbody tr').forEach((row) => {
        row.querySelectorAll('td[data-inches]').forEach((cell) => {
          if (sizeColIndices.has(cell.cellIndex)) return;

          const inches = parseFloat(cell.dataset.inches);
          if (isNaN(inches)) return;

          if (unit === 'cm') {
            cell.textContent = (inches * 2.54).toFixed(1);
          } else {
            cell.textContent = cell.dataset.inches;
          }
        });
      });
    });
  });
});
