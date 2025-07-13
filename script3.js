const historyEl = document.getElementById('history');
const performanceChart = document.getElementById('performanceChart');
let trades = JSON.parse(localStorage.getItem('beastTrades')) || [];

function saveTrade() {
  const pair = document.getElementById('pair').value;
  const desc = document.getElementById('description').value;
  const pl = parseFloat(document.getElementById('pl').value);
  const file = document.getElementById('screenshot').files[0];
  const tradeDateInput = document.getElementById('trade-date').value;

  if (!desc || isNaN(pl) || !file) {
    alert('Please complete all fields and attach a screenshot.');
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const trade = {
      id: Date.now(),
      pair,
      description: desc,
      pl,
      image: e.target.result,
      date: tradeDateInput || new Date().toLocaleDateString()
    };

    trades.unshift(trade);
    localStorage.setItem('beastTrades', JSON.stringify(trades));
    renderTrades();
    updateChart();
    clearForm();
  };

  reader.readAsDataURL(file);
}

function renderTrades(filterDate = null) {
  historyEl.innerHTML = '';
  const filteredTrades = filterDate
    ? trades.filter(trade => trade.date === filterDate)
    : trades;

  if (filteredTrades.length === 0) {
    historyEl.innerHTML = "<p>No trades found for this date.</p>";
    return;
  }

  filteredTrades.forEach(trade => {
    const div = document.createElement('div');
    div.className = 'entry';
    div.innerHTML = `
      <strong>${trade.pair}</strong> — 
      <span style="color: ${trade.pl >= 0 ? 'limegreen' : 'tomato'};">
        ${trade.pl >= 0 ? '+' : ''}${trade.pl}
      </span>
      <p>${trade.description}</p>
      <img src="${trade.image}" alt="Trade Screenshot" />
      <small>Date: ${trade.date}</small>
    `;
    historyEl.appendChild(div);
  });
}

function updateChart() {
  const ctx = performanceChart.getContext('2d');
  const labels = trades.map((_, i) => `#${trades.length - i}`);
  const data = trades.map(t => t.pl).reverse();

  if (window.tradeChart) {
    window.tradeChart.destroy();
  }

  window.tradeChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Profit / Loss',
        data,
        borderColor: 'limegreen',
        backgroundColor: 'rgba(50, 205, 50, 0.2)',
        fill: true,
        tension: 0.3,
        pointRadius: 2
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: false
        }
      }
    }
  });
}

function resetJournal() {
  const confirmReset = confirm('Are you sure you want to clear all trade records?');
  if (confirmReset) {
    trades = [];
    localStorage.removeItem('beastTrades');
    renderTrades();
    updateChart();
  }
}

function filterByDate() {
  const filterDate = document.getElementById('filter-date').value;
  if (filterDate) {
    renderTrades(filterDate);
  }
}

function clearFilter() {
  document.getElementById('filter-date').value = '';
  renderTrades();
}

function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  const btn = document.querySelector('.toggle-mode');
  btn.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
}

function clearForm() {
  document.getElementById('description').value = '';
  document.getElementById('pl').value = '';
  document.getElementById('screenshot').value = '';
  document.getElementById('trade-date').value = '';
}

// Initial Load
renderTrades();
updateChart();


function exportToCSV() {
  const headers = ['Pair', 'Profit/Loss', 'Description', 'Date'];
  const rows = trades.map(t => [t.pair, t.pl, `"${t.description}"`, t.date]);

  let csvContent = 'data:text/csv;charset=utf-8,'
    + headers.join(',') + '\n'
    + rows.map(e => e.join(',')).join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', 'beast_trades.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}



function exportToPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');
  const margin = 15;
  const pageWidth = 210;
  const maxImgWidth = pageWidth - margin * 2;
  let y = 20;

  // 🔍 Get selected date from filter
  const selectedDate = document.getElementById('filter-date').value;
  const filteredTrades = selectedDate
    ? trades.filter(t => t.date === selectedDate)
    : trades;

  if (filteredTrades.length === 0) {
    alert('No trades found for selected date.');
    return;
  }

  // 📊 Totals for filtered trades
  const totalTrades = filteredTrades.length;
  const totalProfit = filteredTrades.reduce((sum, t) => t.pl >= 0 ? sum + t.pl : sum, 0);
  const totalLoss = filteredTrades.reduce((sum, t) => t.pl < 0 ? sum + t.pl : sum, 0);
  const netPL = filteredTrades.reduce((sum, t) => sum + t.pl, 0);

  const logoImg = new Image();
  logoImg.src = 'Scar Capitals lg.png';

  logoImg.onload = () => {
    doc.addImage(logoImg, 'PNG', margin, y, 50, 20);
    y += 30;

    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text("My Fx Journal", margin, y);
    y += 10;

    doc.setFont("courier", "normal");
    doc.setFontSize(12);
    doc.text(`Exported on: ${new Date().toLocaleDateString()}`, margin, y);
    y += 10;

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total Trades : ${totalTrades}`, margin, y); y += 6;

    doc.setTextColor(0, 150, 0);
    doc.text(`Total Profit : +${totalProfit}`, margin, y); y += 6;

    doc.setTextColor(200, 0, 0);
    doc.text(`Total Loss   : ${totalLoss}`, margin, y); y += 6;

    doc.setTextColor(netPL >= 0 ? 0 : 200, netPL >= 0 ? 150 : 0, 0);
    doc.text(`Net P/L      : ${netPL >= 0 ? '+' : ''}${netPL}`, margin, y); y += 10;

    doc.setDrawColor(0);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // 📅 Group filtered trades by date
    const grouped = {};
    filteredTrades.forEach(t => {
      if (!grouped[t.date]) grouped[t.date] = [];
      grouped[t.date].push(t);
    });

    const dates = Object.keys(grouped).sort().reverse();

    dates.forEach(date => {
      doc.setFontSize(13);
      doc.setTextColor(0, 0, 120);
      doc.setFont("helvetica", "bold");
      doc.text(`Date: ${date}`, margin, y);
      y += 8;

      grouped[date].forEach((t, i) => {
        doc.setFontSize(12);
        doc.setFont("courier", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text(`${t.pair}`, margin, y);

        doc.setTextColor(t.pl >= 0 ? 0 : 200, t.pl >= 0 ? 150 : 0, 0);
        doc.text(`P/L: ${t.pl >= 0 ? '+' : ''}${t.pl}`, margin + 100, y);
        y += 6;

        doc.setFontSize(10);
        doc.setTextColor(80);
        doc.text(`Reason: ${t.description}`, margin, y);
        y += 6;

        if (t.image) {
          try {
            doc.addImage(t.image, 'PNG', margin, y, maxImgWidth, 60);
            y += 65;
          } catch {
            doc.setTextColor(255, 0, 0);
            doc.text("⚠️ Image failed to load", margin, y);
            y += 10;
          }
        }

        y += 4;

        if (y > 270) {
          doc.addPage();
          y = 20;
        }
      });

      y += 6;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    // Footer on all pages
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(160);
      doc.setFont("helvetica", "italic");
      doc.text("My Fx Journal — Powered by Beast Mode Trading Guide", pageWidth / 2, 292, { align: 'center' });
    }

    doc.save("my_fx_journal.pdf");
  };
}
