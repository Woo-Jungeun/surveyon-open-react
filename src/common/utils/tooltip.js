document.addEventListener("mouseover", (e) => {
    const icon = e.target.closest(".info-icon");
    if (!icon) return;
  
    const tooltipText = icon.getAttribute("data-tooltip");
    if (!tooltipText) return;
  
    // 기존 툴팁 제거
    document.querySelector(".floating-tooltip")?.remove();
  
    // title|body 구조 분리
    const [title, body] = tooltipText.split("|");
  
    // 새 툴팁 생성
    const tooltip = document.createElement("div");
    tooltip.className = "floating-tooltip";
  
    // ✅ body가 없으면 tooltip-body 생략 (불필요한 여백 방지)
    tooltip.innerHTML = `
      <div class="tooltip-title">${title || ""}</div>
      ${
        body && body.trim()
          ? `<div class="tooltip-body">${body.replace(/\n/g, "<br/>")}</div>`
          : ""
      }
    `;
    document.body.appendChild(tooltip);
  
    // 위치 계산
    const rect = icon.getBoundingClientRect();
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const scrollX = window.scrollX || document.documentElement.scrollLeft;
  
    // 기본 위치: 아이콘 위쪽
    let top = rect.top + scrollY - tooltip.offsetHeight - 10;
    let left = rect.left + scrollX + rect.width / 2;
  
    // 화면 짤림 방지 (좌우)
    const rightOverflow = left + tooltip.offsetWidth / 2 > window.innerWidth - 10;
    const leftOverflow = left - tooltip.offsetWidth / 2 < 10;
    if (rightOverflow) left = window.innerWidth - tooltip.offsetWidth / 2 - 15;
    if (leftOverflow) left = tooltip.offsetWidth / 2 + 15;
  
    // ✅ 위로 뜰 공간이 부족하면 아래로 표시
    if (rect.top < tooltip.offsetHeight + 20) {
      top = rect.bottom + scrollY + 12; // 아이콘 아래쪽
      tooltip.classList.add("tooltip-bottom");
    }
  
    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  });
  
  document.addEventListener("mouseout", () => {
    document.querySelector(".floating-tooltip")?.remove();
  });
  