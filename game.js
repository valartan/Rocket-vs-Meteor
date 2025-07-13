
(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const rejouerBtn = document.getElementById("rejouer");
  const gameOverText = document.getElementById("gameOverText");
  const distanceDisplay = document.getElementById("distance");
  const highScoreInput = document.getElementById("highScoreInput");
  const playerNameInput = document.getElementById("playerName");
  const submitScoreBtn = document.getElementById("submitScore");
  const leaderboard = document.getElementById("leaderboard");
  const leaderboardList = leaderboard.querySelector("ol");
  const menu = document.getElementById("menu");
  const playButton = document.getElementById("playButton");
  const shareBtn = document.getElementById("shareScore");
  const rocketImg = new Image();
  rocketImg.src = 'rocket.png';

  let width, height;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resize);
  resize();

  const player = {
    x: 150,
    y: height / 2,
    radius: 25,
    velocityY: 0,
    gravityUp: -0.8,   // moins fort pour monter
    gravityDown: 0.9,  // plus fort pour descendre
    maxSpeed: 6,       // vitesse max verticale
  };
  let pressing = false;
  window.addEventListener("keydown", e => { if (e.code === "Space") pressing = true; });
  window.addEventListener("keyup", e => { if (e.code === "Space") pressing = false; });
  window.addEventListener("touchstart", () => { pressing = true; }, { passive: true });
  window.addEventListener("touchend", () => { pressing = false; }, { passive: true });

  let bubbles = [];
  let frameCount = 0;
  let gameOver = false;
  let distance = 0;
  let startTime = 0;

  const maxDifficultyTime = 40;

  const stars = [];
  const numStars = 150;
  for (let i = 0; i < numStars; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.5 + 0.2,
      speed: Math.random() * 0.6 + 0.2,
    });
  }

  function createBubble(speed) {
    const radius = 15 + Math.random() * 25;
    const y = radius + Math.random() * (height - 2 * radius);
    const craters = [];
    for (let i = 0; i < 3; i++) {
      craters.push({
        offsetX: (Math.random() - 0.5) * radius,
        offsetY: (Math.random() - 0.5) * radius,
        size: radius * 0.2,
      });
    }
    bubbles.push({
      x: width + radius,
      y,
      radius,
      speed,
      direction: Math.random() < 0.5 ? 1 : -1,
      floatSpeed: 1 + Math.random() * 2,
      craters,
    });
  }

  function isColliding(c, b) {
    const dx = c.x - b.x;
    const dy = c.y - b.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < c.radius + b.radius;
  }

  class Particle {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.radius = Math.random() * 3 + 2;
      this.color = 'orange';
      this.speedX = (Math.random() - 0.5) * 5;
      this.speedY = (Math.random() - 0.5) * 5;
      this.alpha = 1;
    }
    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      this.alpha -= 0.02;
    }
    draw() {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.beginPath();
      ctx.fillStyle = this.color;
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  let particles = [];

  function createExplosion(x, y) {
    for (let i = 0; i < 30; i++) {
      particles.push(new Particle(x, y));
    }
  }

  function drawFlame(x, y) {
    const flameLength = 40;
    const flameWidth = 20;

    const gradient = ctx.createLinearGradient(x, y, x - flameLength, y);
    gradient.addColorStop(0, 'white');
    gradient.addColorStop(0.3, 'orange');
    gradient.addColorStop(1, 'red');

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y - flameWidth / 2);
    ctx.quadraticCurveTo(x - flameLength / 2, y, x - flameLength, y);
    ctx.quadraticCurveTo(x - flameLength / 2, y, x, y + flameWidth / 2);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();
  }

  function drawRocket(x, y, radius) {
    const width = radius * 2;
    const height = radius * 2;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(player.angle || 0);
    ctx.drawImage(rocketImg, -width / 2, -height / 2, width, height);
    ctx.restore();
  }

  function drawMeteorite(bubble) {
    const { x, y, radius, craters } = bubble;
    ctx.fillStyle = "#aaa";
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#666";
    craters.forEach(c => {
      ctx.beginPath();
      ctx.arc(x + c.offsetX, y + c.offsetY, c.size, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawStars() {
    ctx.fillStyle = "#001122";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "white";
    stars.forEach(star => {
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();

      star.x -= star.speed;
      if (star.x < 0) {
        star.x = width;
        star.y = Math.random() * height;
        star.radius = Math.random() * 1.5 + 0.2;
        star.speed = Math.random() * 0.6 + 0.2;
      }
    });
  }

  function getHighScores() {
    let stored = localStorage.getItem("highScores");
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(s => s.name && typeof s.distance === "number");
    } catch {
      return [];
    }
  }

  function saveHighScore(name, distance) {
    let scores = getHighScores();
    scores.push({ name, distance });
    scores.sort((a, b) => b.distance - a.distance);
    scores = scores.slice(0, 5);
    localStorage.setItem("highScores", JSON.stringify(scores));
  }

  function checkIfHighScore(distance) {
    const scores = getHighScores();
    if (scores.length < 5) return true;
    return distance > Math.min(...scores.map(s => s.distance));
  }

  function displayLeaderboard() {
    const scores = getHighScores();
    if (scores.length === 0) {
      leaderboard.style.display = "none";
      return;
    }
    leaderboardList.innerHTML = scores.map(s =>
      `<li>${s.name}: ${Math.floor(s.distance)} m</li>`
    ).join('');
    leaderboard.style.display = "block";
  }

  function resetGame() {
    bubbles = [];
    particles = [];
    frameCount = 0;
    gameOver = false;
    distance = 0;
    startTime = performance.now();
    player.y = height / 2;
    player.velocityY = 0;
    rejouerBtn.style.display = "none";
    gameOverText.style.display = "none";
    leaderboard.style.display = "none";
    highScoreInput.style.display = "none";
    playerNameInput.value = "";
    shareBtn.style.display = "none";
  }

  submitScoreBtn.onclick = () => {
    const name = playerNameInput.value.trim() || "Anonyme";
    if (name) {
      saveHighScore(name, Math.floor(distance));
      highScoreInput.style.display = "none";
      displayLeaderboard();
      rejouerBtn.style.display = "block";
      shareBtn.style.display = "block";
    }
  };

  playButton.onclick = () => {
    menu.style.display = "none";
    resetGame();
    requestAnimationFrame(gameLoop);
  };

  rejouerBtn.onclick = () => {
    resetGame();
    requestAnimationFrame(gameLoop);
  };

  function shareScore(score) {
    const text = `J'ai fait ${Math.floor(score)} m dans Ballon Esquive ! Peux-tu faire mieux ? 🚀🎮`;
    const url = window.location.href;

    if (navigator.share) {
      navigator.share({
        title: "Ballon Esquive - Mon score",
        text,
        url,
      }).catch(console.error);
    } else {
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        text + " " + url
      )}`;
      window.open(twitterUrl, "_blank");
    }
  }

  shareBtn.onclick = () => shareScore(distance);

  menu.style.display = "block";

  function gameLoop(timestamp) {
    drawStars();

    const elapsed = (timestamp - startTime) / 1000;
    let baseSpeed = elapsed < maxDifficultyTime ? 10 + (elapsed / maxDifficultyTime) * 10 : 20;

    if (frameCount % 15 === 0 && bubbles.length < 30 && !gameOver) {
      createBubble(baseSpeed);
    }

    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      b.x -= b.speed;
      b.y += b.direction * b.floatSpeed;
      if (b.y > height - b.radius || b.y < b.radius) b.direction *= -1;
      if (b.x + b.radius < 0) bubbles.splice(i, 1);
    }

    if (!gameOver) {
      player.velocityY += pressing ? player.gravityDown : player.gravityUp;
      
      // Limit vertical speed
      if (player.velocityY > player.maxSpeed) player.velocityY = player.maxSpeed;
      if (player.velocityY < -player.maxSpeed) player.velocityY = -player.maxSpeed;

      player.y += player.velocityY;

      // Amortissement de la vitesse pour plus de fluidité
      player.velocityY *= 0.87;

      if (player.y < player.radius) {
        player.y = player.radius;
        player.velocityY = 0;
      } else if (player.y > height - player.radius) {
        player.y = height - player.radius;
        player.velocityY = 0;
      }
      distance += baseSpeed / 60;
      distanceDisplay.textContent = `Distance: ${Math.floor(distance)} m`;

      for (let i = 0; i < bubbles.length; i++) {
        if (isColliding(player, bubbles[i])) {
          createExplosion(player.x, player.y);
          gameOver = true;
          gameOverText.style.display = "block";

          if (checkIfHighScore(distance)) {
            highScoreInput.style.display = "block";
            playerNameInput.focus();
          } else {
            rejouerBtn.style.display = "block";
            displayLeaderboard();
            shareBtn.style.display = "block";
          }
          break;
        }
      }
    }

    particles.forEach(p => {
      p.update();
      p.draw();
    });
    particles = particles.filter(p => p.alpha > 0);

    if (!gameOver) {
      drawFlame(player.x - player.radius, player.y);
      drawRocket(player.x, player.y, player.radius);
    }

    bubbles.forEach(drawMeteorite);

    frameCount++;
    if (!gameOver) {
      requestAnimationFrame(gameLoop);
    }
  }
})();
