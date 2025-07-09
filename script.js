// 게임 상태
const root = document.getElementById('game-root');
const audioSuccess = document.getElementById('audio-success');
const audioFail = document.getElementById('audio-fail');
const audioCoupon = document.getElementById('audio-coupon');

let state = {
  scene: 'start', // start, quiz, fail, coupon
  streak: 0,
  answer: 0,
  timer: null,
  timerLeft: 5,
  input: '',
  a: 0,
  b: 0,
  failReason: '',
};

function render() {
  root.innerHTML = '';
  if (state.scene === 'start') renderStart();
  else if (state.scene === 'quiz') renderQuiz();
  else if (state.scene === 'fail') renderFail();
  else if (state.scene === 'coupon') renderCoupon();
}

function renderStart() {
  const el = document.createElement('div');
  el.className = 'scene';
  el.innerHTML = `
    <h1>🧮 더하기 빨리 계산하기!🧮</h1>
    <div style="margin:16px 0 8px 0;font-size:1.1rem;">
      <div>👉 5초 안에 문제를 풀고 정답을 입력하세요!</div>
      <div>3문제 연속 정답 시 음료수 쿠폰이 지급됩니다!</div>
      <div>준비되면 시작 버튼을 눌러주세요!</div>
    </div>
    <button class="button" id="start-btn">시작하기 ▶️</button>
    <div style="margin-top:32px;">
      <svg width="60" height="60" viewBox="0 0 60 60">
        <circle cx="30" cy="30" r="28" stroke="#4f8cff" stroke-width="4" fill="none"/>
        <path d="M30 30 L30 10" stroke="#4f8cff" stroke-width="4" stroke-linecap="round"/>
        <circle cx="30" cy="30" r="6" fill="#4f8cff"/>
      </svg>
    </div>
  `;
  root.appendChild(el);
  document.getElementById('start-btn').onclick = startQuiz;
}

function startQuiz() {
  state.streak = 0;
  nextProblem();
}

function nextProblem() {
  state.a = rand(10, 50);
  state.b = rand(10, 50);
  state.answer = state.a + state.b;
  state.input = '';
  state.timerLeft = 5;
  state.scene = 'quiz';
  render();
  startTimer();
}

function renderQuiz() {
  const el = document.createElement('div');
  el.className = 'scene';
  el.innerHTML = `
    <div style="font-size:1.2rem;margin-bottom:8px;">연속 정답: <b>${state.streak}/3</b></div>
    <div style="font-size:2.2rem;font-weight:bold;">${state.a} + ${state.b} = ?</div>
    <div class="timer-bar"><div class="timer-bar-inner" id="timer-bar-inner" style="width:100%"></div></div>
    <div class="input-box" id="input-box">${state.input || '&nbsp;'}</div>
    <div class="keypad">
      ${[1,2,3,4,5,6,7,8,9,0].map(n=>`<button class="keypad-btn" data-num="${n}">${n}</button>`).join('')}
      <button class="keypad-btn" data-action="del">⌫</button>
      <button class="keypad-btn" data-action="ok">확인</button>
    </div>
  `;
  root.appendChild(el);
  // 키패드 이벤트
  document.querySelectorAll('.keypad-btn').forEach(btn => {
    btn.onclick = (e) => {
      const num = btn.getAttribute('data-num');
      const action = btn.getAttribute('data-action');
      if (num !== null) {
        if (state.input.length < 3) state.input += num;
      } else if (action === 'del') {
        state.input = state.input.slice(0, -1);
      } else if (action === 'ok') {
        checkAnswer();
        return;
      }
      document.getElementById('input-box').innerHTML = state.input || '&nbsp;';
    };
  });
}

function startTimer() {
  clearInterval(state.timer);
  const bar = () => {
    const el = document.getElementById('timer-bar-inner');
    if (el) el.style.width = (state.timerLeft * 20) + '%';
  };
  bar();
  state.timer = setInterval(() => {
    state.timerLeft -= 0.1;
    bar();
    if (state.timerLeft <= 0) {
      clearInterval(state.timer);
      fail('시간 초과!');
    }
  }, 100);
}

function checkAnswer() {
  clearInterval(state.timer);
  if (parseInt(state.input) === state.answer) {
    state.streak++;
    playSound('success');
    showMessage('🎯 정답입니다!');
    if (state.streak >= 3) {
      setTimeout(() => {
        state.scene = 'coupon';
        render();
        playSound('coupon');
      }, 1000);
    } else {
      setTimeout(nextProblem, 1000);
    }
  } else {
    fail('오답!');
  }
}

function fail(reason) {
  state.scene = 'fail';
  state.failReason = reason;
  render();
  playSound('fail');
  showGGG();
  setTimeout(() => {
    state.streak = 0;
    nextProblem();
  }, 1500);
}

function renderFail() {
  const el = document.createElement('div');
  el.className = 'scene';
  el.innerHTML = `
    <div style="font-size:2rem;color:#ff4f4f;">❌ ${state.failReason}</div>
    <div style="margin:16px 0;">다시 도전해보세요!</div>
    <button class="button" id="retry-btn">다시 하기 🔁</button>
    <button class="button" id="home-btn">홈으로 🏠</button>
  `;
  root.appendChild(el);
  document.getElementById('retry-btn').onclick = nextProblem;
  document.getElementById('home-btn').onclick = () => { state.scene = 'start'; render(); };
}

function renderCoupon() {
  const el = document.createElement('div');
  el.className = 'scene';
  el.innerHTML = `
    <div class="celebration">🎉</div>
    <div style="font-size:1.5rem;font-weight:bold;">축하합니다!<br>3문제를 연속 정답하셨어요!</div>
    <canvas id="coupon-canvas" class="coupon-canvas" width="320" height="180"></canvas>
    <button class="button" id="save-coupon">쿠폰 저장하기 💾</button>
    <button class="button" id="home-btn">홈으로 🏠</button>
  `;
  root.appendChild(el);
  drawCoupon();
  document.getElementById('save-coupon').onclick = saveCoupon;
  document.getElementById('home-btn').onclick = () => { state.scene = 'start'; render(); };
}

function drawCoupon() {
  const canvas = document.getElementById('coupon-canvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,320,180);
  ctx.fillStyle = '#fffbe7';
  ctx.fillRect(0,0,320,180);
  ctx.strokeStyle = '#ffe082';
  ctx.lineWidth = 4;
  ctx.strokeRect(8,8,304,164);
  ctx.font = 'bold 28px Nanum Gothic';
  ctx.fillStyle = '#4f8cff';
  ctx.fillText('🥤 음료수 1잔 무료 쿠폰', 32, 80);
  ctx.font = '18px Nanum Gothic';
  ctx.fillStyle = '#333';
  ctx.fillText('더하기 빨리 계산하기!', 32, 120);
  ctx.fillText('축하합니다!', 32, 150);
}

function saveCoupon() {
  const canvas = document.getElementById('coupon-canvas');
  const link = document.createElement('a');
  link.download = 'coupon.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function playSound(type) {
  if (type === 'success') audioSuccess.currentTime = 0, audioSuccess.play();
  if (type === 'fail') audioFail.currentTime = 0, audioFail.play();
  if (type === 'coupon') audioCoupon.currentTime = 0, audioCoupon.play();
}

function showMessage(msg) {
  const el = document.createElement('div');
  el.className = 'celebration';
  el.innerText = msg;
  root.appendChild(el);
  setTimeout(()=>el.remove(), 900);
}

function showGGG() {
  const img = document.createElement('img');
  img.src = 'assets/ggg.png';
  img.className = 'ggg-fly';
  root.appendChild(img);
  setTimeout(()=>img.remove(), 4000);
}

function rand(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

render(); 