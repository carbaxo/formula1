
    const canvas = document.getElementById("game");
    const ctx = canvas.getContext("2d");

    const speedEl = document.getElementById("speed");
    const lapEl = document.getElementById("lap");
    const timeEl = document.getElementById("time");
    const bestEl = document.getElementById("best");
    const subtitleEl = document.getElementById("subtitle");
    const restartBtn = document.getElementById("restart");
    const btnUp = document.getElementById("btn-up");
    const btnDown = document.getElementById("btn-down");
    const btnLeft = document.getElementById("btn-left");
    const btnRight = document.getElementById("btn-right");
    const buttonMap = {
      up: btnUp,
      down: btnDown,
      left: btnLeft,
      right: btnRight
    };

    const keys = new Set();
    const controlKeys = new Set([
      "KeyW", "KeyA", "KeyS", "KeyD",
      "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
      "Space", "KeyR"
    ]);
    const inputState = {
      up: false,
      down: false,
      left: false,
      right: false
    };
    const lapsToWin = 3;

    const world = {
      width: 3200,
      height: 3200
    };

    const track = {
      roadWidth: 180,
      waypoints: [
        { x: 1400, y: 2850 }, { x: 2000, y: 2850 }, { x: 2600, y: 2850 }, // Start/Finish Straight
        { x: 3000, y: 2650 }, { x: 3050, y: 2400 }, // T1-T2 (Elf)
        { x: 2900, y: 1900 }, { x: 2600, y: 1600 }, { x: 2000, y: 1450 }, // T3 (Curvone)
        { x: 1600, y: 1400 }, { x: 1450, y: 1200 }, // T4-T5 (Repsol/Seat)
        { x: 1550, y: 900 },  { x: 1800, y: 600 },  // T7-T8
        { x: 2300, y: 550 },  { x: 2800, y: 600 },  // T9 (Campsa) + Back Straight
        { x: 3000, y: 800 },  { x: 2900, y: 1100 }, // T10 (La Caixa)
        { x: 2500, y: 1300 }, { x: 2100, y: 1600 }, // Stadium Section
        { x: 1800, y: 2000 }, { x: 1400, y: 2300 }, { x: 800, y: 2500 }, // Final Sector
        { x: 400, y: 2650 },  { x: 600, y: 2850 }  // Final Turn
      ]
    };

    const checkpoints = [
      { x: 2600, y: 2850 },
      { x: 2600, y: 1600 },
      { x: 1800, y: 600 },
      { x: 2900, y: 1100 },
      { x: 1400, y: 2300 }
    ];

    const startGate = {
      a: { x: 1400, y: 2750 },
      b: { x: 1400, y: 2950 }
    };
    const trackStartAngle = 0;

    const player = createCar(1300, 2810, 0, "#ff003c", "Jugador");
    
    const ais = [
      createCar(1200, 2890, 0, "#f7d64a", "Rival A"),
      createCar(1100, 2810, 0, "#00f0ff", "Rival B"),
      createCar(1000, 2890, 0, "#1e41ff", "Rival C"),
      createCar(900, 2810, 0, "#ff8700", "Rival D"),
      createCar(800, 2890, 0, "#00aa00", "Rival E")
    ];
    ais.forEach(ai => ai.isAI = true);

    const particles = [];
    class Particle {
      constructor(x, y, vx, vy, color, life, size) {
        this.x = x; this.y = y; this.vx = vx; this.vy = vy;
        this.color = color; this.startLife = life; this.life = life;
        this.size = size;
      }
      update(dt) {
        this.x += this.vx * dt; this.y += this.vy * dt;
        this.life -= dt;
      }
      draw(ctx) {
        const s = worldToScreen(this.x, this.y);
        ctx.globalAlpha = Math.max(0, this.life / this.startLife);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, this.size * viewport.scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    let viewport = { x: 0, y: 0, scale: 1 };
    let last = performance.now();
    let totalTime = 0;
    let lapStartTime = 0;
    let bestLap = Infinity;
    let completedLaps = 0;
    let messageTimer = 0;
    let message = "Pasa todos los puntos de control para contar una vuelta.";

    function createCar(x, y, angle, color, name = "Piloto") {
      return {
        x,
        y,
        angle,
        speed: 0,
        color,
        name,
        width: 36,
        length: 64,
        nextCheckpoint: 0,
        lapReady: false,
        lap: 0,
        aiIndex: 0,
        aiTargetSpeed: 0,
        lastLapTime: 0,
        lapStartTime: 0,
        finished: false
      };
    }

    function resize() {
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      canvas.width = Math.floor(canvas.clientWidth * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function getGridPos(index) {
      const col = index % 2;
      const row = Math.floor(index / 2);
      return {
        x: 1300 - row * 160,
        y: 2810 + col * 80,
        angle: 0
      };
    }

    function resetGame() {
      const pData = getGridPos(0);
      Object.assign(player, createCar(pData.x, pData.y, pData.angle, "#ff003c", "Jugador"));
      player.lapStartTime = 0;

      const aiData = [
        { color: "#f7d64a", name: "Rival A" },
        { color: "#00f0ff", name: "Rival B" },
        { color: "#1e41ff", name: "Rival C" },
        { color: "#ff8700", name: "Rival D" },
        { color: "#00aa00", name: "Rival E" }
      ];

      const newAis = aiData.map((data, i) => {
        const p = getGridPos(i + 1);
        const car = createCar(p.x, p.y, p.angle, data.color, data.name);
        car.isAI = true;
        car.lapStartTime = 0;
        return car;
      });

      ais.length = 0;
      ais.push(...newAis);

      totalTime = 0;
      lapStartTime = 0;
      bestLap = Infinity;
      completedLaps = 0;
      message = "Pasa todos los puntos de control para contar una vuelta.";
      messageTimer = 0;
      updateHud();
    }

    function setControl(action, isDown) {
      inputState[action] = isDown;
      const button = buttonMap[action];
      if (button) button.classList.toggle("is-held", isDown);
    }

    function registerKey(e, isDown) {
      const code = e.code || "";
      const key = (e.key || "").toLowerCase();
      if (controlKeys.has(code) || ["w", "a", "s", "d", "r", " ", "spacebar", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        e.preventDefault();
      }

      if (isDown) {
        if (code === "KeyR" || key === "r") {
          resetGame();
          return;
        }
        if (code) keys.add(code);
        if (key) keys.add(key);
      } else {
        if (code) keys.delete(code);
        if (key) keys.delete(key);
      }

      if (code === "KeyW" || key === "w" || code === "ArrowUp" || key === "arrowup") setControl("up", isDown);
      if (code === "Space" || key === " " || key === "spacebar") setControl("up", isDown);
      if (code === "KeyS" || key === "s" || code === "ArrowDown" || key === "arrowdown") setControl("down", isDown);
      if (code === "KeyA" || key === "a" || code === "ArrowLeft" || key === "arrowleft") setControl("left", isDown);
      if (code === "KeyD" || key === "d" || code === "ArrowRight" || key === "arrowright") setControl("right", isDown);
    }

    function updateHud() {
      speedEl.innerHTML = `${Math.max(0, Math.round(player.speed * 1.8))} <span style="font-size: 14px; color: var(--muted);">km/h</span>`;
      lapEl.textContent = `${completedLaps} / ${lapsToWin}`;
      timeEl.textContent = `${totalTime.toFixed(2)} s`;
      bestEl.textContent = Number.isFinite(bestLap) ? `${bestLap.toFixed(2)} s` : "--";

      // Update Leaderboard
      const allCars = [player, ...ais];
      allCars.sort((a, b) => {
        if (a.lap !== b.lap) return b.lap - a.lap;
        if (a.nextCheckpoint !== b.nextCheckpoint) return b.nextCheckpoint - a.nextCheckpoint;
        
        // Secondary sort: distance to next checkpoint
        const nextCpA = checkpoints[a.nextCheckpoint];
        const nextCpB = checkpoints[b.nextCheckpoint];
        const distA = nextCpA ? distance(a.x, a.y, nextCpA.x, nextCpA.y) : 0;
        const distB = nextCpB ? distance(b.x, b.y, nextCpB.x, nextCpB.y) : 0;
        return distA - distB;
      });

      const lbContainer = document.getElementById("leaderboard-content");
      lbContainer.innerHTML = "";
      allCars.slice(0, 4).forEach((car, i) => { // show top 4
        const row = document.createElement("div");
        row.className = "leader-row";
        if (car === player) {
          row.style.color = "var(--text)";
          row.style.textShadow = "0 0 8px rgba(255,255,255,0.5)";
        } else {
          row.style.color = "var(--muted)";
        }
        
        row.innerHTML = `
          <div style="width: 16px; opacity: 0.7;">${i + 1}</div>
          <div class="leader-color" style="background: ${car.color};"></div>
          <div class="leader-name">${car.name} ${car.finished ? '<span style="font-size: 10px; color: var(--accent-2);">[FIN]</span>' : ''}</div>
        `;
        lbContainer.appendChild(row);
      });
    }

    function clamp(v, min, max) {
      return Math.max(min, Math.min(max, v));
    }

    function lerp(a, b, t) {
      return a + (b - a) * t;
    }

    function distance(ax, ay, bx, by) {
      return Math.hypot(ax - bx, ay - by);
    }

    function distanceToSegmentSquared(px, py, ax, ay, bx, by) {
      const abx = bx - ax;
      const aby = by - ay;
      const apx = px - ax;
      const apy = py - ay;
      const abLenSq = abx * abx + aby * aby;
      const t = abLenSq === 0 ? 0 : clamp((apx * abx + apy * aby) / abLenSq, 0, 1);
      const x = ax + abx * t;
      const y = ay + aby * t;
      return {
        x,
        y,
        distSq: (px - x) ** 2 + (py - y) ** 2,
        t
      };
    }

    function nearestTrackInfo(x, y) {
      const pts = track.waypoints;
      let best = { distSq: Infinity, seg: 0, x, y, t: 0 };
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        const info = distanceToSegmentSquared(x, y, a.x, a.y, b.x, b.y);
        if (info.distSq < best.distSq) {
          best = { ...info, seg: i };
        }
      }
      return best;
    }

    function worldToScreen(x, y) {
      return {
        x: (x - viewport.x) * viewport.scale,
        y: (y - viewport.y) * viewport.scale
      };
    }

    function screenToWorld(x, y) {
      return {
        x: x / viewport.scale + viewport.x,
        y: y / viewport.scale + viewport.y
      };
    }

    function updateViewport() {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      viewport.scale = clamp(Math.min(w / 1200, h / 900), 0.72, 1.15);
      viewport.x = player.x - (w / viewport.scale) / 2;
      viewport.y = player.y - (h / viewport.scale) / 2;
      viewport.x = clamp(viewport.x, 0, world.width - w / viewport.scale);
      viewport.y = clamp(viewport.y, 0, world.height - h / viewport.scale);
    }

    function lineCrossesGate(px, py, x, y, gate) {
      const side1 = Math.sign((gate.b.x - gate.a.x) * (py - gate.a.y) - (gate.b.y - gate.a.y) * (px - gate.a.x));
      const side2 = Math.sign((gate.b.x - gate.a.x) * (y - gate.a.y) - (gate.b.y - gate.a.y) * (x - gate.a.x));
      return side1 !== 0 && side2 !== 0 && side1 !== side2;
    }

    function updateCar(car, dt, controls) {
      const onTrack = nearestTrackInfo(car.x, car.y).distSq <= (track.roadWidth * 0.5) ** 2;
      const grip = onTrack ? 1 : 0.55;
      const maxSpeed = onTrack ? 420 : 250;
      const acceleration = onTrack ? 250 : 120;
      const braking = 340;
      const friction = onTrack ? 82 : 48;

      if (controls) {
        if (controls.up) car.speed += acceleration * dt;
        if (controls.down) car.speed -= braking * dt;
        const turn = (controls.left ? -1 : 0) + (controls.right ? 1 : 0);
        const steerPower = 2.5 + Math.min(3.5, Math.abs(car.speed) / 70);
        car.angle += turn * steerPower * dt * (car.speed >= 0 ? 1 : -1);
      }

      car.speed -= Math.sign(car.speed) * friction * dt;
      const isDriving = (controls && (controls.up || controls.down)) || (car.isAI && !car.finished);
      if (!isDriving && Math.abs(car.speed) < 5) {
        car.speed = 0;
      }
      car.speed = clamp(car.speed, -90, maxSpeed);

      car.x += Math.cos(car.angle) * car.speed * dt * grip;
      car.y += Math.sin(car.angle) * car.speed * dt * grip;
      car.x = clamp(car.x, 40, world.width - 40);
      car.y = clamp(car.y, 40, world.height - 40);

      if (!onTrack) {
        car.speed *= 0.985;
        if (Math.abs(car.speed) > 50 && Math.random() > 0.5) {
          particles.push(new Particle(car.x, car.y, (Math.random()-0.5)*40, (Math.random()-0.5)*40, "rgba(255,255,255,0.4)", 0.6, 5));
        }
      } else if (Math.abs(car.speed) > 280 && Math.random() > 0.92) {
         particles.push(new Particle(car.x, car.y, (Math.random()-0.5)*20, (Math.random()-0.5)*20, "rgba(200,200,200,0.15)", 0.4, 3));
      }
    }

    function updateAI(car, dt) {
      if (car.finished) {
        car.speed *= 0.95;
        updateCar(car, dt, null);
        return;
      }
      const target = track.waypoints[car.aiIndex];
      const dx = target.x - car.x;
      const dy = target.y - car.y;
      const targetAngle = Math.atan2(dy, dx);
      let diff = targetAngle - car.angle;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      car.angle += clamp(diff, -2.8 * dt, 2.8 * dt);

      const targetSpeed = 290;
      if (car.speed < targetSpeed) car.speed += 190 * dt;
      else car.speed -= 70 * dt;
      car.speed = clamp(car.speed, 0, 320);

      updateCar(car, dt, null);

      if (distance(car.x, car.y, target.x, target.y) < 72) {
        car.aiIndex = (car.aiIndex + 1) % track.waypoints.length;
      }
    }

    function updateCheckpoints(car) {
      const next = checkpoints[car.nextCheckpoint];
      if (distance(car.x, car.y, next.x, next.y) < 70) {
        if (car.nextCheckpoint === checkpoints.length - 1) {
          car.lapReady = true;
        }
        car.nextCheckpoint = (car.nextCheckpoint + 1) % checkpoints.length;
      }
    }

    function updateLap(car, prevX, prevY) {
      if (car.finished) return;

      if (car.lapReady && lineCrossesGate(prevX, prevY, car.x, car.y, startGate)) {
        car.lap += 1;
        const lapTime = totalTime - car.lapStartTime;
        car.lastLapTime = lapTime;
        car.lapStartTime = totalTime;
        car.lapReady = false;

        if (car === player) {
          completedLaps = car.lap;
          if (lapTime > 0.2) {
            bestLap = Math.min(bestLap, lapTime);
          }
          message = `Vuelta ${car.lap} completada en ${lapTime.toFixed(2)} s`;
          messageTimer = 4;
        }

        if (car.lap >= lapsToWin) {
          car.finished = true;
          car.speed = 0;
          if (car === player) {
            message = "Carrera terminada. Pulsa Reiniciar para volver a empezar.";
            messageTimer = 999;
          }
        }
      }
        function drawBackground() {
      ctx.fillStyle = "#1a3c26"; 
      ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

      const gridSize = 120 * viewport.scale;
      const startX = -((viewport.x * viewport.scale) % gridSize);
      const startY = -((viewport.y * viewport.scale) % gridSize);
      
      ctx.fillStyle = "#122b1b";
      for (let x = startX; x < canvas.clientWidth; x += gridSize) {
        for (let y = startY; y < canvas.clientHeight; y += gridSize) {
          ctx.beginPath();
          ctx.arc(x + gridSize/2, y + gridSize/2, 2 * viewport.scale, 0, Math.PI*2);
          ctx.fill();
        }
      }
    }

    function drawTrack() {
      const pts = track.waypoints;
      const scale = viewport.scale;
      ctx.save();
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      // Gravel / Runoff
      ctx.strokeStyle = "#d4b483";
      ctx.lineWidth = (track.roadWidth + 100) * scale;
      ctx.beginPath();
      pts.forEach((p, i) => {
        const s = worldToScreen(p.x, p.y);
        if (i === 0) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y);
      });
      const first = worldToScreen(pts[0].x, pts[0].y);
      ctx.lineTo(first.x, first.y);
      ctx.stroke();

      // Track Border
      ctx.strokeStyle = "#1a1e24";
      ctx.lineWidth = (track.roadWidth + 12) * scale;
      ctx.beginPath();
      pts.forEach((p, i) => {
        const s = worldToScreen(p.x, p.y);
        if (i === 0) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y);
      });
      ctx.lineTo(first.x, first.y);
      ctx.stroke();

      // Surface
      ctx.strokeStyle = "#2a2e35";
      ctx.lineWidth = track.roadWidth * scale;
      ctx.beginPath();
      pts.forEach((p, i) => {
        const s = worldToScreen(p.x, p.y);
        if (i === 0) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y);
      });
      ctx.lineTo(first.x, first.y);
      ctx.stroke();

      // Kerbs
      ctx.lineWidth = 14 * scale;
      ctx.setLineDash([30 * scale, 30 * scale]);
      ctx.strokeStyle = "#ffffff";
      ctx.beginPath();
      pts.forEach((p, i) => {
        const s = worldToScreen(p.x, p.y);
        if (i === 0) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y);
      });
      ctx.lineTo(first.x, first.y);
      ctx.stroke();
      
      ctx.lineDashOffset = 30 * scale;
      ctx.strokeStyle = "#e62117";
      ctx.stroke();
      ctx.setLineDash([]);

      // Start gate / Finish Line
      const ga = worldToScreen(startGate.a.x, startGate.a.y);
      const gb = worldToScreen(startGate.b.x, startGate.b.y);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 8 * scale;
      ctx.beginPath();
      ctx.moveTo(ga.x, ga.y);
      ctx.lineTo(gb.x, gb.y);
      ctx.stroke();

      // Checkpoints
      checkpoints.forEach((cp, index) => {
        const p = worldToScreen(cp.x, cp.y);
        ctx.fillStyle = index === player.nextCheckpoint ? "var(--accent-2)" : "rgba(255,255,255,0.2)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 12 * scale, 0, Math.PI * 2);
        ctx.fill();
        if (index === player.nextCheckpoint) {
          ctx.strokeStyle = "var(--accent-2)";
          ctx.lineWidth = 2 * scale;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 20 * scale + Math.sin(totalTime*5)*4*scale, 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      // Grid markings
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 2 * scale;
      for (let i = 0; i < 6; i++) {
        const pos = getGridPos(i);
        const s = worldToScreen(pos.x, pos.y);
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(pos.angle);
        ctx.strokeRect(-25 * scale, -45 * scale, 50 * scale, 90 * scale);
        ctx.restore();
      }
      ctx.restore();
    }

    const carImageCache = {};

    function getCarImage(color) {
      if (carImageCache[color]) return carImageCache[color];

      const svgString = `
<svg width="200" height="100" viewBox="-100 -50 200 100" xmlns="http://www.w3.org/2000/svg">
  <!-- Suspension -->
  <g stroke="#111" stroke-width="3" stroke-linecap="round">
    <path d="M 30,-15 L 55,-35 M 45,-10 L 55,-35" />
    <path d="M 30,15 L 55,35 M 45,10 L 55,35" />
    <path d="M -40,-15 L -60,-35 M -50,-10 L -60,-35" />
    <path d="M -40,15 L -60,35 M -50,10 L -60,35" />
  </g>

  <!-- Wheels -->
  <rect x="40" y="-44" width="30" height="16" rx="4" fill="#151515" />
  <rect x="42" y="-42" width="26" height="12" rx="2" fill="#222" />
  <rect x="40" y="28" width="30" height="16" rx="4" fill="#151515" />
  <rect x="42" y="30" width="26" height="12" rx="2" fill="#222" />
  <rect x="-75" y="-46" width="34" height="20" rx="4" fill="#151515" />
  <rect x="-73" y="-44" width="30" height="16" rx="2" fill="#222" />
  <rect x="-75" y="26" width="34" height="20" rx="4" fill="#151515" />
  <rect x="-73" y="28" width="30" height="16" rx="2" fill="#222" />

  <!-- Underbody/Floor -->
  <path d="M -80,-30 L -20,-38 L 20,-25 L 20,25 L -20,38 L -80,30 Z" fill="#111" />
  <path d="M -70,-28 L -20,-34 L 10,-22 L 10,22 L -20,34 L -70,28 Z" fill="#1a1a1a" />

  <!-- Sidepods -->
  <path d="M -55,-22 L 0,-28 L 20,-12 L 20,12 L 0,28 L -55,22 Z" fill="${color}" />
  <path d="M -45,-16 L 0,-22 L 15,-10 L 15,10 L 0,22 L -45,16 Z" fill="#000" fill-opacity="0.2" />
  
  <!-- Intakes -->
  <rect x="18" y="-18" width="10" height="12" rx="2" fill="#050505" />
  <rect x="18" y="6" width="10" height="12" rx="2" fill="#050505" />

  <!-- Main Chassis / Nose -->
  <path d="M -60,-8 L 65,-8 L 88,-4 L 88,4 L 65,8 L -60,8 Z" fill="${color}" />
  <path d="M -50,-4 L 60,-4 L 80,-2 L 80,2 L 60,4 L -50,4 Z" fill="#fff" fill-opacity="0.1" />
  <path d="M -60,-10 L -30,-10 L -30,10 L -60,10 Z" fill="${color}" />

  <!-- Engine Fin -->
  <path d="M -75,-2 L -10,-3 L -10,3 L -75,2 Z" fill="#050505" />

  <!-- Front Wing -->
  <path d="M 75,-45 L 85,-48 L 95,-12 L 95,12 L 85,48 L 75,45 Z" fill="${color}" />
  <path d="M 72,-42 L 82,-42 L 88,-12 L 88,12 L 82,42 L 72,42 Z" fill="#1a1a1a" />
  <path d="M 78,-40 L 86,-40 L 92,-12 L 92,12 L 86,40 L 78,40 Z" fill="#222" />
  <path d="M 80,-15 L 94,-5 L 94,5 L 80,15 Z" fill="${color}" />

  <!-- Rear Wing -->
  <path d="M -85,-35 L -75,-35 L -75,35 L -85,35 Z" fill="${color}" />
  <path d="M -83,-32 L -77,-32 L -77,32 L -83,32 Z" fill="#1a1a1a" />
  <path d="M -80,-30 L -78,-30 L -78,30 L -80,30 Z" fill="#333" />
  <path d="M -80,-4 L -60,-2 L -60,2 L -80,4 Z" fill="#111" />

  <!-- Cockpit & Halo -->
  <path d="M -10,-12 L 15,-10 L 15,10 L -10,12 Z" fill="#0a0a0a" />
  <circle cx="2" cy="0" r="5" fill="#f0f0f0" />
  <circle cx="3" cy="0" r="3" fill="#ffaa00" />
  <path d="M 7,-1 L 18,-1 L 18,1 L 7,1 Z" fill="#222" />
  <path d="M -5,-12 L 12,-10 L 12,10 L -5,12" fill="none" stroke="#222" stroke-width="2.5" />
</svg>`.trim();

      const img = new Image();
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);
      carImageCache[color] = img;
      return img;
    }

    function drawCar(car) {
      const pos = worldToScreen(car.x, car.y);
      const scale = viewport.scale;
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(car.angle);

      // Shadow
      ctx.shadowBlur = 12 * scale;
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowOffsetX = 4 * scale;
      ctx.shadowOffsetY = 4 * scale;

      const img = getCarImage(car.color);
      const w = 110 * scale; // Adjusting dimensions to map to old box
      const h = 55 * scale;
      
      if (img.complete) {
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
      }

      ctx.shadowBlur = 0;

      // Exhaust Glow
      if (car.speed > 100) {
        ctx.shadowBlur = 10 * scale;
        ctx.shadowColor = "rgba(255, 100, 0, 0.8)";
        ctx.fillStyle = "#ff4400";
        roundRect(-w / 2 * 0.85, -2 * scale, 6 * scale, 4 * scale, 2 * scale);
        ctx.fill();
      }
      ctx.restore();
    }

    function roundRect(x, y, w, h, r) {
      const rr = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.arcTo(x + w, y, x + w, y + h, rr);
      ctx.arcTo(x + w, y + h, x, y + h, rr);
      ctx.arcTo(x, y + h, x, y, rr);
      ctx.arcTo(x, y, x + w, y, rr);
      ctx.closePath();
    }

    function drawOverlay() {
      if (messageTimer > 0) {
        ctx.save();
        ctx.fillStyle = "rgba(11, 15, 25, 0.75)";
        ctx.fillRect(0, canvas.height/2 - 50, canvas.width, 100);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 24px Outfit";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(message, canvas.width/2, canvas.height/2);
        ctx.restore();
      }
    }

    function tick(now) {
      const dt = Math.min(0.06, (now - last) / 1000);
      last = now;
      totalTime += dt;
      if (messageTimer > 0 && messageTimer < 900) messageTimer = Math.max(0, messageTimer - dt);

      updateViewport();

      const prevX = player.x;
      const prevY = player.y;

      updateCar(player, dt, {
        up: inputState.up,
        down: inputState.down,
        left: inputState.left,
        right: inputState.right
      });
      updateCheckpoints(player);
      updateLap(player, prevX, prevY);

      ais.forEach(ai => {
        const apX = ai.x;
        const apY = ai.y;
        updateAI(ai, dt);
        updateCheckpoints(ai);
        updateLap(ai, apX, apY);
      });

      // Update Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update(dt);
        if (particles[i].life <= 0) particles.splice(i, 1);
      }

      drawBackground();
      drawTrack();
      
      particles.forEach(p => p.draw(ctx));
      
      ais.forEach(ai => drawCar(ai));
      drawCar(player);
      drawOverlay();

      updateHud();
      requestAnimationFrame(tick);
    }

    window.addEventListener("resize", resize);
    document.addEventListener("keydown", (e) => registerKey(e, true), { passive: false });
    document.addEventListener("keyup", (e) => registerKey(e, false), { passive: false });
    window.addEventListener("blur", () => {
      keys.clear();
      inputState.up = false;
      inputState.down = false;
      inputState.left = false;
      inputState.right = false;
    });
    canvas.tabIndex = 0;
    canvas.addEventListener("pointerdown", () => canvas.focus());
    restartBtn.addEventListener("click", resetGame);

    function bindHoldButton(button, action) {
      const down = (e) => {
        e.preventDefault();
        e.stopPropagation();
        canvas.focus();
        if (button.setPointerCapture && e.pointerId !== undefined) {
          try {
            button.setPointerCapture(e.pointerId);
          } catch {}
        }
        setControl(action, true);
      };
      const up = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setControl(action, false);
      };
      button.addEventListener("pointerdown", down);
      button.addEventListener("pointerup", up);
      button.addEventListener("pointerleave", up);
      button.addEventListener("pointercancel", up);
      button.addEventListener("mousedown", down);
      button.addEventListener("mouseup", up);
      button.addEventListener("touchstart", down, { passive: false });
      button.addEventListener("touchend", up, { passive: false });
      button.addEventListener("touchcancel", up, { passive: false });
      button.addEventListener("contextmenu", (e) => e.preventDefault());
    }

    bindHoldButton(btnUp, "up");
    bindHoldButton(btnDown, "down");
    bindHoldButton(btnLeft, "left");
    bindHoldButton(btnRight, "right");

    subtitleEl.textContent += " (build 2026-04-05 b2)";

    resize();
    resetGame();
    requestAnimationFrame(tick);
  