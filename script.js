const STORAGE_KEY = "stockTradingJournalLogs";
const SETTINGS_KEY = "stockTradingJournalSettings";

const state = {
  logs: [],
  selectedDate: null,
  currentMonth: new Date(),
  editingId: null,
  activeTag: "실적",
  searchQuery: "",
  startingCapital: 0,
  hasSavedCapital: false
};

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  initializeWeekdays();
  setToday();
  bindEvents();
  loadLogs();
  loadSettings();
  render();
});

function cacheElements() {
  const ids = [
    "formCard",
    "formOverlay",
    "formPopupClose",
    "capitalForm",
    "tradeForm",
    "tradeDate",
    "market",
    "stockName",
    "ticker",
    "tradeType",
    "quantity",
    "buyPrice",
    "sellPrice",
    "fees",
    "tax",
    "profit",
    "profitRate",
    "strategy",
    "mood",
    "reason",
    "memo",
    "imageUrl",
    "autoCalc",
    "submitButton",
    "resetFormBtn",
    "prevMonthBtn",
    "nextMonthBtn",
    "calendarQuickAdd",
    "calendarTitle",
    "calendarGrid",
    "calendarWeekdays",
    "detailTitle",
    "detailProfit",
    "detailMeta",
    "detailTrades",
    "bestDayValue",
    "worstDayValue",
    "avgDayValue",
    "todayProfit",
    "todayTradesMeta",
    "weekProfit",
    "weekMeta",
    "monthProfit",
    "monthMeta",
    "winRate",
    "winRateMeta",
    "avgWinValue",
    "avgLossValue",
    "bestTickerValue",
    "bestStrategyValue",
    "profitTradeCount",
    "progressFill",
    "tradeTableBody",
    "searchInput",
    "mobileFormToggle",
    "mobileTradeList",
    "exportBtn",
    "importBtn",
    "importFileInput",
    "clearAllBtn",
    "todayProfitValue",
    "monthProfitValue",
    "cumulativeRateValue",
    "startingCapitalValue",
    "currentCapitalValue",
    "startingCapitalInput",
    "capitalInputWrap",
    "capitalSubmitButton",
    "tagOptions"
  ];

  ids.forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function initializeWeekdays() {
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  els.calendarWeekdays.innerHTML = weekdays.map((day) => `<span>${day}</span>`).join("");
}

function bindEvents() {
  els.formOverlay.addEventListener("click", closeTradePopup);
  els.formPopupClose.addEventListener("click", closeTradePopup);
  els.capitalForm.addEventListener("submit", handleCapitalSubmit);
  els.tradeForm.addEventListener("submit", handleSubmit);
  els.mobileFormToggle.addEventListener("click", toggleMobileForm);
  els.calendarQuickAdd.addEventListener("click", () => openTradePopup(state.selectedDate || formatDateInput(new Date())));
  els.resetFormBtn.addEventListener("click", resetForm);
  els.prevMonthBtn.addEventListener("click", () => moveMonth(-1));
  els.nextMonthBtn.addEventListener("click", () => moveMonth(1));
  els.searchInput.addEventListener("input", (event) => {
    state.searchQuery = event.target.value.trim().toLowerCase();
    renderTradeTable();
  });
  els.exportBtn.addEventListener("click", exportLogs);
  els.importBtn.addEventListener("click", () => els.importFileInput.click());
  els.importFileInput.addEventListener("change", importLogs);
  els.clearAllBtn.addEventListener("click", clearAllLogs);

  [els.quantity, els.buyPrice, els.sellPrice, els.fees, els.tax].forEach((input) => {
    input.addEventListener("input", handleAutoCalculation);
  });

  els.autoCalc.addEventListener("change", handleAutoCalculation);

  els.tagOptions.addEventListener("click", (event) => {
    const chip = event.target.closest(".tag-chip");
    if (!chip) return;

    state.activeTag = chip.dataset.tag;
    [...els.tagOptions.querySelectorAll(".tag-chip")].forEach((item) => {
      item.classList.toggle("active", item === chip);
    });
  });
}

function toggleMobileForm() {
  els.formCard.classList.toggle("mobile-open");
  const isOpen = els.formCard.classList.contains("mobile-open");
  els.mobileFormToggle.textContent = isOpen ? "기록 입력 닫기" : "기록 입력 열기";
}

function openTradePopup(date = null) {
  if (date) {
    els.tradeDate.value = date;
  }
  els.formCard.classList.add("popup-open");
  els.formOverlay.classList.add("active");
  document.body.style.overflow = "hidden";
  els.stockName.focus();
}

function closeTradePopup() {
  els.formCard.classList.remove("popup-open");
  els.formOverlay.classList.remove("active");
  document.body.style.overflow = "";
}

function handleCapitalSubmit(event) {
  event.preventDefault();
  if (state.hasSavedCapital && els.capitalForm.classList.contains("is-collapsed")) {
    els.capitalForm.classList.remove("is-collapsed");
    els.startingCapitalInput.focus();
    els.capitalSubmitButton.textContent = "저장";
    return;
  }

  state.startingCapital = Number(els.startingCapitalInput.value) || 0;
  state.hasSavedCapital = true;
  persistSettings();
  syncCapitalFormState();
  renderSummary();
}

function setToday() {
  const today = formatDateInput(new Date());
  els.tradeDate.value = today;
  state.selectedDate = today;
}

function moveMonth(delta) {
  state.currentMonth = new Date(
    state.currentMonth.getFullYear(),
    state.currentMonth.getMonth() + delta,
    1
  );
  renderCalendar();
}

function handleAutoCalculation() {
  if (!els.autoCalc.checked) return;

  const quantity = Number(els.quantity.value) || 0;
  const buyPrice = Number(els.buyPrice.value) || 0;
  const sellPrice = Number(els.sellPrice.value) || 0;
  const fees = Number(els.fees.value) || 0;
  const tax = Number(els.tax.value) || 0;

  if (!quantity || !buyPrice) {
    els.profit.value = "";
    els.profitRate.value = "";
    return;
  }

  const gross = (sellPrice - buyPrice) * quantity;
  const profit = gross - fees - tax;
  const investment = buyPrice * quantity;
  const rate = investment ? (profit / investment) * 100 : 0;

  if (sellPrice) {
    els.profit.value = Math.round(profit);
    els.profitRate.value = rate.toFixed(2);
  }
}

function handleSubmit(event) {
  event.preventDefault();

  const trade = buildTradePayload();
  if (!trade) return;

  if (state.editingId) {
    state.logs = state.logs.map((log) => (log.id === state.editingId ? { ...trade, id: state.editingId } : log));
  } else {
    state.logs.unshift(trade);
  }

  persistLogs();
  state.selectedDate = trade.date;
  state.currentMonth = new Date(`${trade.date}T00:00:00`);
  resetForm();
  closeTradePopup();
  render();
}

function buildTradePayload() {
  const date = els.tradeDate.value;
  const stockName = els.stockName.value.trim();
  const ticker = els.ticker.value.trim().toUpperCase();
  const quantity = Number(els.quantity.value) || 0;
  const buyPrice = Number(els.buyPrice.value) || 0;
  const sellPrice = Number(els.sellPrice.value) || 0;
  const fees = Number(els.fees.value) || 0;
  const tax = Number(els.tax.value) || 0;
  const profitInput = els.profit.value === "" ? null : Number(els.profit.value);
  const profitRateInput = els.profitRate.value === "" ? null : Number(els.profitRate.value);

  if (!date || !stockName || !quantity || !buyPrice) {
    alert("거래일, 종목명, 수량, 매수 단가는 꼭 입력해주세요.");
    return null;
  }

  const hasExitPrice = sellPrice > 0;
  const inferredProfit = hasExitPrice ? (sellPrice - buyPrice) * quantity - fees - tax : 0;
  const investment = buyPrice * quantity;
  const inferredRate = hasExitPrice && investment ? (inferredProfit / investment) * 100 : 0;

  return {
    id: Date.now(),
    date,
    market: els.market.value,
    stockName,
    ticker,
    tradeType: els.tradeType.value,
    quantity,
    buyPrice,
    sellPrice,
    fees,
    tax,
    profit: profitInput ?? Math.round(inferredProfit),
    profitRate: profitRateInput ?? Number(inferredRate.toFixed(2)),
    strategy: els.strategy.value,
    tag: state.activeTag,
    mood: els.mood.value,
    reason: els.reason.value.trim(),
    memo: els.memo.value.trim(),
    imageUrl: els.imageUrl.value.trim(),
    createdAt: new Date().toISOString()
  };
}

function resetForm() {
  els.tradeForm.reset();
  setToday();
  state.editingId = null;
  state.activeTag = "실적";
  [...els.tagOptions.querySelectorAll(".tag-chip")].forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.tag === state.activeTag);
  });
  els.submitButton.textContent = "거래 저장";
  els.autoCalc.checked = true;
  els.market.value = "KOSPI";
  els.tradeType.value = "BUY";
  els.strategy.value = "돌파매매";
  els.mood.value = "침착";
}

function loadLogs() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    state.logs = saved.sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (error) {
    console.error(error);
    state.logs = [];
  }
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
    state.startingCapital = Number(saved.startingCapital) || 0;
    state.hasSavedCapital = Boolean(saved.hasSavedCapital);
    if (els.startingCapitalInput) {
      els.startingCapitalInput.value = state.startingCapital ? String(state.startingCapital) : "";
    }
    syncCapitalFormState();
  } catch (error) {
    console.error(error);
    state.startingCapital = 0;
    state.hasSavedCapital = false;
  }
}

function persistLogs() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.logs));
}

function persistSettings() {
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({
      startingCapital: state.startingCapital,
      hasSavedCapital: state.hasSavedCapital
    })
  );
}

function syncCapitalFormState() {
  const locked = state.hasSavedCapital;
  els.startingCapitalInput.disabled = false;
  els.capitalForm.classList.toggle("is-collapsed", locked);
  els.capitalSubmitButton.textContent = locked ? "수정" : "저장";
}

function render() {
  renderSummary();
  renderCalendar();
  renderAnalytics();
  renderTradeTable();
  renderSelectedDateDetail();
}

function renderSummary() {
  const today = formatDateInput(new Date());
  const startOfWeek = getStartOfWeek(new Date());
  const endOfWeek = addDays(startOfWeek, 6);
  const monthKey = getYearMonthKey(state.currentMonth);

  const todayLogs = state.logs.filter((log) => log.date === today);
  const weekLogs = state.logs.filter((log) => isDateBetween(log.date, startOfWeek, endOfWeek));
  const monthLogs = state.logs.filter((log) => log.date.startsWith(monthKey));
  const profitLogs = state.logs.filter((log) => Number(log.profit) > 0);

  const todayProfit = sumProfit(todayLogs);
  const weekProfit = sumProfit(weekLogs);
  const monthProfit = sumProfit(monthLogs);
  const winRate = state.logs.length ? (profitLogs.length / state.logs.length) * 100 : 0;

  const monthDaily = buildDailyProfitMap(monthLogs);
  const gainDays = Object.values(monthDaily).filter((value) => value > 0).length;
  const lossDays = Object.values(monthDaily).filter((value) => value < 0).length;

  setMoneyText(els.todayProfit, todayProfit);
  setMoneyText(els.weekProfit, weekProfit);
  setMoneyText(els.monthProfit, monthProfit);
  els.winRate.textContent = `${winRate.toFixed(1)}%`;

  els.todayTradesMeta.textContent = `오늘 거래 ${todayLogs.length}건`;
  els.weekMeta.textContent = `이번 주 거래 ${weekLogs.length}건`;
  els.monthMeta.textContent = `수익일 ${gainDays}일 / 손실일 ${lossDays}일`;
  els.winRateMeta.textContent = `수익 거래 ${profitLogs.length}건`;

  setMoneyText(els.todayProfitValue, todayProfit);
  setMoneyText(els.monthProfitValue, monthProfit);

  const invested = state.logs.reduce((sum, log) => sum + (Number(log.buyPrice) * Number(log.quantity) || 0), 0);
  const cumulativeProfit = sumProfit(state.logs);
  const cumulativeRate = invested ? (cumulativeProfit / invested) * 100 : 0;
  els.cumulativeRateValue.textContent = `${cumulativeRate.toFixed(2)}%`;

  const currentCapital = state.startingCapital + cumulativeProfit;
  setMoneyText(els.startingCapitalValue, state.startingCapital);
  setMoneyText(els.currentCapitalValue, currentCapital);
}

function renderCalendar() {
  const year = state.currentMonth.getFullYear();
  const month = state.currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();
  const totalCells = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7;
  const dailyMap = buildDailyAggregateMap(state.logs);

  els.calendarTitle.textContent = `${year}년 ${month + 1}월`;
  els.calendarGrid.innerHTML = "";

  for (let index = 0; index < totalCells; index += 1) {
    const cellDate = new Date(year, month, index - startOffset + 1);
    const dateKey = formatDateInput(cellDate);
    const aggregate = dailyMap[dateKey] || { profit: 0, count: 0 };
    const inMonth = cellDate.getMonth() === month;

    const button = document.createElement("button");
    button.type = "button";
    button.className = `calendar-day ${inMonth ? getProfitClass(aggregate.profit) : "muted"} ${
      state.selectedDate === dateKey ? "selected" : ""
    }`;
    button.innerHTML = `
      <div class="day-number">${cellDate.getDate()}</div>
      <div class="day-profit">${aggregate.count ? formatMoney(aggregate.profit) : "기록 없음"}</div>
      <span class="day-count">${aggregate.count ? `${aggregate.count}건` : "-"}</span>
    `;
    button.addEventListener("click", () => {
      state.selectedDate = dateKey;
      els.tradeDate.value = dateKey;
      renderCalendar();
      renderSelectedDateDetail();
    });
    els.calendarGrid.appendChild(button);
  }

  const monthLogs = state.logs.filter((log) => {
    const date = new Date(`${log.date}T00:00:00`);
    return date.getFullYear() === year && date.getMonth() === month;
  });

  updateCalendarSummary(monthLogs);
}

function updateCalendarSummary(monthLogs) {
  const grouped = buildDailyProfitMap(monthLogs);
  const entries = Object.entries(grouped);

  if (!entries.length) {
    els.bestDayValue.textContent = "없음";
    els.worstDayValue.textContent = "없음";
    els.avgDayValue.textContent = "₩0";
    return;
  }

  const bestEntries = entries.filter(([, value]) => value > 0);
  const worstEntries = entries.filter(([, value]) => value < 0);
  const best = bestEntries.length
    ? bestEntries.reduce((max, entry) => (entry[1] > max[1] ? entry : max), bestEntries[0])
    : null;
  const worst = worstEntries.length
    ? worstEntries.reduce((min, entry) => (entry[1] < min[1] ? entry : min), worstEntries[0])
    : null;
  const average = entries.reduce((sum, [, value]) => sum + value, 0) / entries.length;

  els.bestDayValue.textContent = best ? `${best[0].slice(8)}일 · ${formatMoney(best[1])}` : "";
  els.worstDayValue.textContent = worst ? `${worst[0].slice(8)}일 · ${formatMoney(worst[1])}` : "";
  els.avgDayValue.textContent = formatMoney(Math.round(average));
}

function renderSelectedDateDetail() {
  if (!state.selectedDate) {
    els.detailTitle.textContent = "날짜를 선택해보세요";
    els.detailProfit.textContent = "₩0";
    els.detailProfit.className = "detail-profit neutral";
    els.detailMeta.textContent = "달력에서 날짜를 누르면 그날의 거래와 메모를 볼 수 있어요.";
    els.detailTrades.innerHTML = "아직 선택된 날짜가 없습니다.";
    return;
  }

  const dayLogs = state.logs
    .filter((log) => log.date === state.selectedDate)
    .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
  const dayProfit = sumProfit(dayLogs);

  els.detailTitle.textContent = `${formatDateKorean(state.selectedDate)} 거래 복기`;
  els.detailProfit.textContent = formatMoney(dayProfit);
  els.detailProfit.className = `detail-profit ${getProfitClass(dayProfit)}`;
  els.detailMeta.textContent = dayLogs.length
    ? `총 ${dayLogs.length}건의 거래가 기록되어 있어요.`
    : "이 날짜에는 아직 기록된 거래가 없습니다.";

  if (!dayLogs.length) {
    els.detailTrades.innerHTML = `<div class="empty-detail">거래를 추가하면 이곳에 일별 복기가 표시됩니다.</div>`;
    return;
  }

  els.detailTrades.innerHTML = dayLogs
    .map(
      (log) => `
        <article class="detail-trade-item">
          <div class="detail-topline">
            <div>
              <div class="detail-name">${escapeHtml(log.stockName)}${log.ticker ? ` <span class="detail-sub">(${escapeHtml(log.ticker)})</span>` : ""}</div>
              <div class="detail-sub">${tradeTypeLabel(log.tradeType)} · ${escapeHtml(log.strategy)} · ${escapeHtml(log.tag || "-")}</div>
            </div>
            <strong class="profit-text ${getProfitClass(log.profit)}">${formatMoney(log.profit)}</strong>
          </div>
          <div class="detail-sub">수량 ${Number(log.quantity).toLocaleString()}주 · 매수 ${formatMoney(log.buyPrice)} · 매도 ${formatMoney(log.sellPrice || 0)} · 수익률 ${formatPercent(log.profitRate)}</div>
          ${log.reason ? `<div class="detail-note">${formatMultilineText(log.reason)}</div>` : ""}
          ${log.memo ? `<div class="detail-note">${formatMultilineText(log.memo)}</div>` : ""}
        </article>
      `
    )
    .join("");
}

function renderAnalytics() {
  const wins = state.logs.filter((log) => Number(log.profit) > 0);
  const losses = state.logs.filter((log) => Number(log.profit) < 0);
  const avgWin = wins.length ? sumProfit(wins) / wins.length : 0;
  const avgLoss = losses.length ? sumProfit(losses) / losses.length : 0;

  setMoneyText(els.avgWinValue, Math.round(avgWin));
  setMoneyText(els.avgLossValue, Math.round(avgLoss));

  const tickerMap = new Map();
  const strategyMap = new Map();
  state.logs.forEach((log) => {
    tickerMap.set(log.ticker, (tickerMap.get(log.ticker) || 0) + Number(log.profit || 0));
    strategyMap.set(log.strategy, (strategyMap.get(log.strategy) || 0) + 1);
  });

  const bestTicker = [...tickerMap.entries()].sort((a, b) => b[1] - a[1])[0];
  const bestStrategy = [...strategyMap.entries()].sort((a, b) => b[1] - a[1])[0];

  els.bestTickerValue.textContent = bestTicker ? `${bestTicker[0]} · ${formatMoney(bestTicker[1])}` : "-";
  els.bestStrategyValue.textContent = bestStrategy ? `${bestStrategy[0]} · ${bestStrategy[1]}건` : "-";

  els.profitTradeCount.textContent = `${wins.length} / ${state.logs.length}`;
  const progress = state.logs.length ? (wins.length / state.logs.length) * 100 : 0;
  els.progressFill.style.width = `${progress}%`;
}

function renderTradeTable() {
  const filtered = state.logs.filter((log) => {
    if (!state.searchQuery) return true;
    const source = `${log.stockName} ${log.ticker}`.toLowerCase();
    return source.includes(state.searchQuery);
  });

  if (!filtered.length) {
    els.tradeTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-row">검색 결과가 없어요.</td>
      </tr>
    `;
    els.mobileTradeList.innerHTML = `<div class="empty-row">검색 결과가 없어요.</div>`;
    return;
  }

  els.tradeTableBody.innerHTML = filtered
    .map(
      (log) => `
        <tr>
          <td>${log.date}</td>
          <td>
            <div class="ticker-cell">
              <span class="ticker-name">${escapeHtml(log.stockName)}</span>
              <span class="ticker-code">${log.ticker ? `${escapeHtml(log.ticker)} · ` : ""}${escapeHtml(log.market)}</span>
            </div>
          </td>
          <td><span class="pill ${tradeTypeClass(log.tradeType)}">${tradeTypeLabel(log.tradeType)}</span></td>
          <td>${escapeHtml(log.strategy)}</td>
          <td><span class="profit-text ${getProfitClass(log.profit)}">${formatMoney(log.profit)}</span></td>
          <td>${formatPercent(log.profitRate)}</td>
          <td>
            <div class="row-actions">
              <button type="button" data-action="edit" data-id="${log.id}">수정</button>
              <button type="button" data-action="delete" data-id="${log.id}">삭제</button>
            </div>
          </td>
        </tr>
      `
    )
    .join("");

  els.tradeTableBody.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.id);
      if (button.dataset.action === "edit") {
        startEdit(id);
      } else {
        deleteLog(id);
      }
    });
  });

  els.mobileTradeList.innerHTML = filtered
    .map(
      (log) => `
        <article class="mobile-trade-card">
          <div class="mobile-card-head">
            <div>
              <div class="ticker-name">${escapeHtml(log.stockName)}</div>
              <div class="ticker-code">${log.ticker ? `${escapeHtml(log.ticker)} · ` : ""}${escapeHtml(log.market)}</div>
            </div>
            <strong class="profit-text ${getProfitClass(log.profit)}">${formatMoney(log.profit)}</strong>
          </div>
          <div class="mobile-card-meta">
            <span class="pill ${tradeTypeClass(log.tradeType)}">${tradeTypeLabel(log.tradeType)}</span>
            <span class="pill">${escapeHtml(log.strategy)}</span>
          </div>
          <div class="mobile-card-grid">
            <div><span>날짜</span><strong>${log.date}</strong></div>
            <div><span>수익률</span><strong>${formatPercent(log.profitRate)}</strong></div>
          </div>
          <div class="mobile-card-foot">
            <div class="detail-sub">${log.reason ? escapeHtml(log.reason).slice(0, 50) : "기록 메모 없음"}</div>
            <div class="row-actions">
              <button type="button" data-action="edit" data-id="${log.id}">수정</button>
              <button type="button" data-action="delete" data-id="${log.id}">삭제</button>
            </div>
          </div>
        </article>
      `
    )
    .join("");

  els.mobileTradeList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.id);
      if (button.dataset.action === "edit") {
        startEdit(id);
      } else {
        deleteLog(id);
      }
    });
  });
}

function startEdit(id) {
  const log = state.logs.find((item) => item.id === id);
  if (!log) return;

  state.editingId = id;
  els.tradeDate.value = log.date;
  els.market.value = log.market;
  els.stockName.value = log.stockName;
  els.ticker.value = log.ticker;
  els.tradeType.value = log.tradeType;
  els.quantity.value = log.quantity;
  els.buyPrice.value = log.buyPrice;
  els.sellPrice.value = log.sellPrice || "";
  els.fees.value = log.fees || "";
  els.tax.value = log.tax || "";
  els.profit.value = log.profit;
  els.profitRate.value = log.profitRate;
  els.strategy.value = log.strategy;
  els.mood.value = log.mood;
  els.reason.value = log.reason;
  els.memo.value = log.memo;
  els.imageUrl.value = log.imageUrl || "";
  state.activeTag = log.tag || "실적";
  [...els.tagOptions.querySelectorAll(".tag-chip")].forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.tag === state.activeTag);
  });
  els.submitButton.textContent = "수정 완료";
  if (window.innerWidth <= 820) {
    els.formCard.classList.add("mobile-open");
    els.mobileFormToggle.textContent = "기록 입력 닫기";
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteLog(id) {
  const log = state.logs.find((item) => item.id === id);
  if (!log) return;

  const confirmed = window.confirm(`${log.stockName} 거래를 삭제할까요?`);
  if (!confirmed) return;

  state.logs = state.logs.filter((item) => item.id !== id);
  persistLogs();
  render();
}

function clearAllLogs() {
  if (!state.logs.length) return;
  const confirmed = window.confirm("저장된 거래 기록을 모두 삭제할까요?");
  if (!confirmed) return;

  state.logs = [];
  state.selectedDate = formatDateInput(new Date());
  persistLogs();
  render();
}

function exportLogs() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    logs: state.logs
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const today = formatDateInput(new Date());
  link.href = url;
  link.download = `stock-journal-backup-${today}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function importLogs(event) {
  const [file] = event.target.files || [];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || "{}"));
      const importedLogs = Array.isArray(parsed) ? parsed : parsed.logs;

      if (!Array.isArray(importedLogs)) {
        throw new Error("logs 배열을 찾지 못했습니다.");
      }

      const normalizedLogs = importedLogs
        .filter((item) => item && item.date && item.stockName)
        .map((item) => ({
          ...item,
          ticker: String(item.ticker || "").trim().toUpperCase(),
          id: Number(item.id) || Date.now() + Math.floor(Math.random() * 10000),
          quantity: Number(item.quantity) || 0,
          buyPrice: Number(item.buyPrice) || 0,
          sellPrice: Number(item.sellPrice) || 0,
          fees: Number(item.fees) || 0,
          tax: Number(item.tax) || 0,
          profit: Number(item.profit) || 0,
          profitRate: Number(item.profitRate) || 0,
          createdAt: item.createdAt || new Date().toISOString()
        }));

      state.logs = normalizedLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
      persistLogs();
      render();
      alert(`백업 복원이 완료됐어요. ${normalizedLogs.length}건의 거래를 불러왔습니다.`);
    } catch (error) {
      console.error(error);
      alert("복원에 실패했어요. JSON 백업 파일인지 확인해주세요.");
    } finally {
      els.importFileInput.value = "";
    }
  };

  reader.readAsText(file, "utf-8");
}

function buildDailyAggregateMap(logs) {
  return logs.reduce((acc, log) => {
    if (!acc[log.date]) {
      acc[log.date] = { profit: 0, count: 0 };
    }
    acc[log.date].profit += Number(log.profit || 0);
    acc[log.date].count += 1;
    return acc;
  }, {});
}

function buildDailyProfitMap(logs) {
  return logs.reduce((acc, log) => {
    acc[log.date] = (acc[log.date] || 0) + Number(log.profit || 0);
    return acc;
  }, {});
}

function sumProfit(logs) {
  return logs.reduce((sum, log) => sum + Number(log.profit || 0), 0);
}

function setMoneyText(element, value) {
  element.textContent = formatMoney(value);
  element.classList.remove("profit", "loss", "neutral");
  element.classList.add(getProfitClass(value));
}

function formatMoney(value) {
  const amount = Number(value || 0);
  const sign = amount > 0 ? "+" : "";
  return `${sign}₩${Math.round(amount).toLocaleString("ko-KR")}`;
}

function formatPercent(value) {
  const amount = Number(value || 0);
  const sign = amount > 0 ? "+" : "";
  return `${sign}${amount.toFixed(2)}%`;
}

function getProfitClass(value) {
  if (Number(value) > 0) return "profit";
  if (Number(value) < 0) return "loss";
  return "neutral";
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateKorean(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function getYearMonthKey(date) {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`;
}

function getStartOfWeek(date) {
  const copy = new Date(date);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function isDateBetween(dateString, startDate, endDate) {
  const target = new Date(`${dateString}T00:00:00`);
  return target >= startDate && target <= endDate;
}

function tradeTypeLabel(type) {
  const labels = {
    BUY: "매수",
    SELL: "매도",
    PARTIAL_SELL: "부분매도",
    FULL_SELL: "전량매도"
  };
  return labels[type] || type;
}

function tradeTypeClass(type) {
  const labels = {
    BUY: "buy",
    SELL: "sell",
    PARTIAL_SELL: "partial_sell",
    FULL_SELL: "full_sell"
  };
  return labels[type] || "buy";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatMultilineText(value) {
  return escapeHtml(value).replaceAll("\n", "<br>");
}
