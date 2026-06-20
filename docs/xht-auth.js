// XHT Logout — clear all cookies
function xhtLogout() {
  const cookies = ['xht_session', 'xht_plan', 'xht_user', 'xht_method', 'xht_contact'];
  cookies.forEach(name => {
    document.cookie = `${name}=; path=/; max-age=0`;
    document.cookie = `${name}=; path=/; domain=.xhardtech.com; max-age=0`;
  });
  window.location.href = '/';
}

// XHT Auth UI — include trên mọi trang
// Tự động: ẩn đăng nhập khi đã login, hiện tên + Pro badge + logout
(function() {
  const cookies = document.cookie;
  const userMatch = cookies.match(/xht_user=([^;]+)/);
  if (!userMatch) return; // Chưa login — giữ nguyên

  const rawUserName = decodeURIComponent(userMatch[1]);
  const userName = rawUserName.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const isPro = cookies.includes('xht_plan=pro');
  const methodMatch = cookies.match(/xht_method=([^;]+)/);
  const contactMatch = cookies.match(/xht_contact=([^;]+)/);
  const method = methodMatch ? methodMatch[1] : 'email';
  const contact = contactMatch ? decodeURIComponent(contactMatch[1]) : '';

  const proBadge = '<span style="background:linear-gradient(135deg,#ffd700,#f59e0b,#d97706);color:#000;padding:3px 8px;border-radius:10px;font-size:0.6rem;font-weight:800;letter-spacing:1px;margin-right:6px;box-shadow:0 2px 8px rgba(245,158,11,0.4);text-shadow:0 0 4px rgba(255,215,0,0.3);">PRO</span>';

  // 1. Nav: hide login button, show user name + logout
  const navLogin = document.getElementById('navLogin');
  const navUser = document.getElementById('navUser');

  if (navLogin) {
    if (isPro) {
      navLogin.style.display = 'none';
    } else {
      navLogin.textContent = 'Nâng cấp Pro';
    }
  }

  if (navUser) {
    navUser.innerHTML = isPro ? proBadge + userName : userName;
    navUser.style.display = 'inline';

    // Add logout link after navUser
    if (navUser.parentNode && !document.getElementById('navLogout')) {
      const logoutLink = document.createElement('a');
      logoutLink.id = 'navLogout';
      logoutLink.href = '#'; logoutLink.onclick = function() { xhtLogout(); return false; };
      logoutLink.textContent = 'Đăng xuất';
      logoutLink.style.cssText = 'color:var(--text-muted);font-size:0.65rem;margin-left:4px;';
      navUser.parentNode.appendChild(logoutLink);
    }
  }

  // 2. Bottom auth section (homepage)
  const bottomAuth = document.getElementById('bottomAuth');
  if (bottomAuth) {
    if (isPro) {
      bottomAuth.innerHTML = `
        <p style="font-size: 0.9rem; font-weight: 700; margin-bottom: 8px;">${proBadge} ${userName}</p>
        <a href="/dashboard.html" class="btn btn-primary" style="width: 100%; justify-content: center; text-decoration: none; padding: 10px; font-size: 0.85rem;">Bộ sưu tập</a>
      `;
    } else {
      const methodText = method === 'zalo' ? 'ZALO ' + contact : method === 'sms' ? 'SMS ' + contact : contact;
      bottomAuth.innerHTML = `
        <p style="font-size: 0.9rem; font-weight: 700; margin-bottom: 8px;">Chào ${userName}</p>
        <p style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 16px;">Nâng cấp Pro: CK <strong>XHT PRO ${methodText}</strong></p>
        <a href="/login.html" class="btn btn-primary" style="width: 100%; justify-content: center; text-decoration: none; padding: 10px; font-size: 0.85rem;">Nâng cấp Pro — 10k/tháng</a>
      `;
    }
  }

  // 3. Save gate on result page
  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn && saveBtn.textContent.includes('Đăng nhập')) {
    saveBtn.textContent = 'Lưu vào bộ sưu tập';
    const saveText = saveBtn.closest('.save-gate-card')?.querySelector('.save-text');
    if (saveText) saveText.innerHTML = '<strong>Lưu vào Bộ sưu tập</strong> để theo dõi khi cuộc đua có kết quả';
  }

  // 4. QR instruction — update based on method
  const qrInst = document.getElementById('qrInstruction');
  if (qrInst && !isPro) {
    const methodText = method === 'zalo' ? 'ZALO ' + contact : method === 'sms' ? 'SMS ' + contact : contact || '[email/SĐT của bạn]';
    qrInst.innerHTML = `Quét QR chuyển 10.000đ<br>Nội dung CK: <strong>XHT PRO ${methodText}</strong>`;
  }

  // 5. Support banner — hide "Đăng nhập" text if logged in
  document.querySelectorAll('.support-btn-primary, .support-btn-secondary').forEach(btn => {
    if (btn.textContent.includes('Đăng nhập')) {
      btn.textContent = btn.textContent.replace('Đăng nhập', 'Nâng cấp Pro');
    }
  });
})();
