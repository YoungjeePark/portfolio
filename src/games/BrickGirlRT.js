import React, { useRef, useEffect, useState } from 'react';
import { playSound, stopBGM, sounds } from './sounds';

const BrickGirlRT = () => {
    const canvasRef = useRef(null);
    const spriteRef = useRef(null);
    const [canvasSize, setCanvasSize] = useState({ width: 480, height: 240 });
    const [spriteLoaded, setSpriteLoaded] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [gameClear, setGameClear] = useState(false);
    const keys = useRef({ up: false, down: false });

    // 스프라이트 관련 설정
    const frameWidth = 335;
    const frameHeight = 512;
    const scale = 0.2;
    const numCols = 3;
    const frameX = useRef(0);
    const frameCount = useRef(0);

    // 캐릭터 위치 및 상태
    const girlWorldX = useRef(0); // 실제 월드 상 위치
    const girlTargetScreenX = 120; // 화면 중앙 고정값
    const girlY = useRef(0);
    const velocityY = useRef(0);
    const gravity = 0.6;
    const maxFallSpeed = 15;
    const jumpCount = useRef(0);
    const maxJumps = 2;
    const girlSpeed = useRef(2);

    // 벽돌 상태 관리
    const projectiles = useRef([]);   // 날아가는 벽돌 리스트

    // 카메라 및 게임 상태
    const cameraX = useRef(0);
    const stuckFrames = useRef(0);
    const wasOnGround = useRef(true);

    // 지형 데이터
    const tileSize = 50;
    const levelData = [
        // 평지 시작
        { x: 0, y: 350 }, { x: 50, y: 350 }, { x: 100, y: 350 },
        { x: 150, y: 350 }, { x: 200, y: 350 }, { x: 250, y: 350 },
        { x: 300, y: 350 }, { x: 350, y: 350 },

        // 점프 구간
        { x: 450, y: 250, type: 'box' },
        { x: 500, y: 250, type: 'question' },
        { x: 550, y: 250, type: 'box' },
        { x: 600, y: 250, type: 'platform' },

        // 낭떠러지
        // (650 ~ 700 없음)

        // 다시 착지
        { x: 700, y: 350 }, { x: 750, y: 350 },
        { x: 800, y: 350 }, { x: 850, y: 350 },

        // 🆕 계단식 상승 구간
        { x: 900, y: 350 },
        { x: 950, y: 320 },
        { x: 1000, y: 290 },
        { x: 1050, y: 260 },
        { x: 1100, y: 230 }, // 정상부

        // 🆕 계단식 하강 구간
        { x: 1150, y: 260 }, { x: 1200, y: 290 },
        { x: 1250, y: 320 }, { x: 1300, y: 350 },

        // 2층 평지
        { x: 1400, y: 200, type: 'floating' },
        { x: 1450, y: 200, type: 'floating' },
        { x: 1500, y: 200, type: 'floating' },

        { x: 1650, y: 150, type: 'floating' },
        { x: 1700, y: 150, type: 'floating' },
        { x: 1750, y: 150, type: 'floating' },

        // 계속 평지 이어가기
        { x: 1350, y: 350 },
        { x: 1400, y: 350 }, { x: 1450, y: 350 },
        { x: 1500, y: 350 }, { x: 1550, y: 350 },
        { x: 1600, y: 350 }, { x: 1650, y: 350 },
        { x: 1700, y: 350 }, { x: 1750, y: 350 }
    ];

    const groundTiles = useRef([]);
    const nextTileIndex = useRef(levelData.length);

    // ⭐ 상태 변수
    const starCount = useRef(0); // 현재 별 개수 (예: 적 처치 시 증가 등)

    const starPositions = [
        { x: 150, y: 270 }, { x: 200, y: 270 }, { x: 250, y: 270 },
        { x: 750, y: 270 }, { x: 800, y: 270 }, { x: 850, y: 270 },

        { x: 1000, y: 210 }, { x: 1050, y: 180 }, { x: 1100, y: 150 }, { x: 1150, y: 180 }, { x: 1200, y: 210 },

        { x: 1400, y: 120 }, { x: 1450, y: 120 }, { x: 1500, y: 120 },
        { x: 1650, y: 70 }, { x: 1700, y: 70 }, { x: 1750, y: 70 },
        // 필요한 만큼 추가 가능
    ];

    const starTiles = useRef([]);

    // 적
    const flyingEnemies = useRef([]); // 날아다니는 적 👾
    const walkingEnemies = useRef([]); // 평지에서 걷는 적 👽

    // 전체 사운드 제어
    const [muted, setMuted] = useState(false);
    const toggleMute = () => {
        const newMuted = !muted;
        setMuted(newMuted);
        Howler.mute(newMuted);
    };

    // 모바일 터치 이벤트
    const handleTouch = (e) => {
        const touchX = e.touches[0].clientX;
        const screenMid = window.innerWidth / 2;

        // 👉 게임오버 또는 클리어 시 터치로 재시작
        // if (gameOver || gameClear) {
        //     window.location.reload();
        //     return;
        // }

        // 오른쪽 터치 → 점프
        if (touchX > screenMid && jumpCount.current < maxJumps) {
            velocityY.current = -14 * (jumpCount.current === 1 ? 1.2 : 1);
            jumpCount.current++;
            // 왼쪽 터치 → 벽돌 던지기
        } else {
            projectiles.current.push({
                x: girlWorldX.current + frameWidth * scale,
                y: girlY.current + frameHeight * scale / 2,
                vx: 6,
                vy: -6,
                gravity: 0.3
            });
        }
    };

    // 착지 여부 확인
    const isOnGround = () => {
        const left = girlWorldX.current + 20;
        const right = girlWorldX.current + frameWidth * scale - 20;
        const feetY = girlY.current + frameHeight * scale;
        return groundTiles.current.some(tile => {
            const withinX = right > tile.x && left < tile.x + tileSize;
            const nextY = feetY + velocityY.current;
            const touching = (feetY < tile.y && nextY >= tile.y) || (feetY >= tile.y && feetY <= tile.y + 20);
            return withinX && touching && velocityY.current >= 0;
        });
    };

    // 수평 벽 충돌 체크
    const isBlockedHorizontally = () => {
        const paddingTop = 6;     // 위에서 6px 여유
        const paddingBottom = 10; // 아래에서 10px 여유

        const charRight = girlWorldX.current + frameWidth * scale;
        const charLeft = girlWorldX.current;
        const charTop = girlY.current + paddingTop;
        const charBottom = girlY.current + frameHeight * scale - paddingBottom;
        const nextCharRight = charRight + girlSpeed.current;

        return groundTiles.current.some(tile => {
            const tileLeft = tile.x;
            const tileRight = tile.x + tileSize;
            const tileTop = tile.y;
            const tileBottom = tile.y + tileSize;

            const horizontalTouch = nextCharRight > tileLeft && charLeft < tileRight;
            const verticalOverlap = charBottom > tileTop && charTop < tileBottom;

            return horizontalTouch && verticalOverlap;
        });
    };

    // 낙하 중 앞이 '공중'인지 확인
    const isAirAhead = () => {
        const aheadX = girlWorldX.current + frameWidth * scale + 2;
        const feetY = girlY.current + frameHeight * scale + 1;

        return !groundTiles.current.some(tile => {
            return (
                aheadX > tile.x &&
                aheadX < tile.x + tileSize &&
                feetY >= tile.y &&
                feetY <= tile.y + tileSize
            );
        });
    };

    useEffect(() => {
        // 초기화
        groundTiles.current = levelData.map(t => ({ ...t }));
        spriteRef.current = new Image();
        spriteRef.current.src = process.env.PUBLIC_URL + '/brickgirl_sprite.png';
        spriteRef.current.onload = () => {
            setSpriteLoaded(true);
            const firstTile = groundTiles.current[0];
            girlY.current = firstTile.y - frameHeight * scale - 4;
            girlWorldX.current = girlTargetScreenX;
        };

        // ⭐ 초기 배치된 별 추가
        starTiles.current = [...starPositions];

    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let raf;

        const handleKey = e => {
            if (e.code === 'ArrowUp' && jumpCount.current < maxJumps) {
                velocityY.current = -12 * (jumpCount.current === 1 ? 1.2 : 1);  // 점프 높이 -숫자 값이 커질 수록 높아짐
                jumpCount.current++;
            }

            // 🧱 스페이스바 = 벽돌 발사
            if (e.code === 'Space') {
                projectiles.current.push({
                    x: girlWorldX.current + frameWidth * scale,
                    y: girlY.current + frameHeight * scale / 2,
                    vx: 6,       // 수평 속도
                    vy: -6,      // 초기 수직 속도 (위로 올라가게)
                    gravity: 0.3 // 중력값; 벽돌 떨어지는 속도
                });
            };

        };

        const updateFrame = () => {
            if (++frameCount.current % 10 === 0) frameX.current = (frameX.current + 1) % numCols;
        };

        window.addEventListener('keydown', handleKey);
        window.addEventListener("touchstart", handleTouch, { passive: false });

        const draw = () => {
            if (!spriteLoaded) {
                raf = requestAnimationFrame(draw);
                return;
            }

            // ✅ 게임오버 or 클리어 상태에서는 게임 로직을 실행하지 않음
            if (gameOver || gameClear) {
                raf = requestAnimationFrame(draw); // 계속 루프 유지
                return;
            }

            // 게임 종료 처리
            // if (gameOver || gameClear) {
            //     const centerX = canvas.width / 2;
            //     const centerY = canvas.height / 2;
            //     ctx.font = "24px 'Press Start 2P'";
            //     ctx.textAlign = "center";
            //     ctx.fillStyle = "white";
            //     ctx.fillText(gameOver ? "😥 GAME OVER" : "🎉 MISSION COMPLETE!", centerX, centerY - 20);
            //     ctx.font = "18px 'Press Start 2P'";
            //     ctx.fillStyle = "#93c5fd";
            //     ctx.fillText("Tap or Press R to Restart", centerX, centerY + 20);
            //     return; // draw 중단
            // }

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 카메라 스크롤 처리
            cameraX.current = girlWorldX.current - girlTargetScreenX;

            // 스크롤용 지형 타일 추가
            const last = groundTiles.current[groundTiles.current.length - 1];
            if (last.x - cameraX.current < canvas.width) {
                const d = levelData[nextTileIndex.current % levelData.length];
                const nextTileX = last.x + tileSize;

                groundTiles.current.push({ x: nextTileX, y: d.y });

                // ⭐ 5칸마다 별 랜덤 추가
                if (nextTileIndex.current % 5 === 0) {
                    const numStars = Math.floor(Math.random() * 3) + 1; // 1~5개 랜덤
                    let currentX = nextTileX + tileSize / 2;

                    for (let i = 0; i < numStars; i++) {
                        const gap = Math.floor(Math.random() * 16) + 20; // 12~27px 랜덤 간격
                        starTiles.current.push({
                            x: currentX,
                            y: d.y - 40
                        });
                        currentX += gap;
                    }
                }

                nextTileIndex.current++;
            }

            // 적 등장: 👾 날아다니는 적
            if (Math.random() < 0.01) {
                flyingEnemies.current.push({ x: cameraX.current + canvas.width + 50, y: 100 });
            }
            flyingEnemies.current.forEach(e => { e.x -= 2; });

            // 적 등장: 👽 걷는 적
            if (Math.random() < 0.008) {
                const enemyX = cameraX.current + canvas.width + 50;
                // 현재 적 위치에 해당하는 지형 타일 찾기
                const tile = groundTiles.current.find(t =>
                    enemyX >= t.x && enemyX < t.x + tileSize
                );

                const enemyY = tile ? tile.y - tileSize : 350; // tileSize는 적의 높이 정도로 사용

                walkingEnemies.current.push({ x: enemyX, y: enemyY, dir: -1 });
            }
            // 이동 처리
            walkingEnemies.current.forEach(e => {
                e.x += e.dir * 1;
            });

            walkingEnemies.current.forEach(e => {
                const nextX = e.x + e.dir * 1;

                // 1. 벽 충돌 체크
                const wallAhead = groundTiles.current.some(t =>
                    nextX + tileSize > t.x &&
                    nextX < t.x + tileSize &&
                    e.y + tileSize > t.y && // 수직 충돌
                    e.y < t.y + tileSize
                );

                // 2. 바닥 체크 (다음 칸 아래가 공중인지)
                const footX = nextX + tileSize / 2;
                const groundBelow = groundTiles.current.some(t =>
                    footX > t.x &&
                    footX < t.x + tileSize &&
                    e.y + tileSize === t.y
                );

                if (wallAhead || !groundBelow) {
                    e.dir *= -1; // 방향 반전
                }

                // 이동
                e.x += e.dir * 1;
            });

            // 적 그리기
            ctx.font = '28px Arial';
            ctx.fillStyle = 'lime';
            flyingEnemies.current.forEach(e => ctx.fillText('👾', e.x - cameraX.current, e.y));
            walkingEnemies.current.forEach(e => ctx.fillText('👽', e.x - cameraX.current, e.y));

            // 지형 그리기
            groundTiles.current.forEach(t => {
                const screenX = t.x - cameraX.current;
                ctx.fillStyle = 'saddlebrown';
                ctx.fillRect(screenX, t.y, tileSize, tileSize);
            });

            // 착지 상태 확인
            const onGround = isOnGround();

            if (onGround) {
                // 벽 충돌 체크
                if (isBlockedHorizontally()) {
                    girlSpeed.current = 0;
                    stuckFrames.current++;
                } else {
                    girlSpeed.current = 4;
                    stuckFrames.current = 0;
                    girlWorldX.current += girlSpeed.current;
                }

                if (velocityY.current >= 0) {
                    const left = girlWorldX.current + 20;
                    const right = girlWorldX.current + frameWidth * scale - 20;
                    const feetY = girlY.current + frameHeight * scale;

                    // 착지 후보 수집
                    const candidates = [...groundTiles.current, ...levelData.filter(t => t.type === 'floating')].filter(
                        t => right > t.x && left < t.x + tileSize &&
                            feetY <= t.y && feetY + velocityY.current >= t.y // 하강 중 아래에 있는 지형만
                    );

                    // 가장 발에 가까운(= feetY와 y 차이가 작은) 지형을 선택
                    const land = candidates.reduce((closest, tile) => {
                        const dist = tile.y - feetY;
                        return (!closest || dist < (closest.y - feetY)) ? tile : closest;
                    }, null);

                    if (land) {
                        girlY.current = land.y - frameHeight * scale - 4;
                        velocityY.current = 0;
                        jumpCount.current = 0;
                    }
                }

            } else {
                // ✅ 낙하 중일 때는 벽 무시하고 '앞이 공중일 때만' 전진
                if (isAirAhead()) {
                    girlWorldX.current += 2.0; // 낙하 중 수평 속도
                }

                velocityY.current = Math.min(velocityY.current + gravity, maxFallSpeed);
                girlY.current += velocityY.current;

                if (girlY.current > canvas.height) {
                    playSound('defeat');
                    setGameOver(true);
                    return;
                }
            }

            // 이전 프레임 착지 상태 저장
            wasOnGround.current = onGround;

            // 벽돌 vs 적 충돌 처리
            projectiles.current.forEach((p, pi) => {
                // 걷는 적과 충돌 체크
                walkingEnemies.current = walkingEnemies.current.filter(e => {
                    const isHit =
                        p.x + 10 > e.x &&
                        p.x < e.x + tileSize &&
                        p.y + 10 > e.y &&
                        p.y < e.y + tileSize;
                    if (isHit) {
                        playSound('tap');
                        projectiles.current.splice(pi, 1); // 벽돌 삭제
                    }
                    return !isHit;
                });

                // 날아다니는 적과 충돌 체크
                flyingEnemies.current = flyingEnemies.current.filter(e => {
                    const isHit =
                        p.x + 10 > e.x &&
                        p.x < e.x + tileSize &&
                        p.y + 10 > e.y &&
                        p.y < e.y + tileSize;
                    if (isHit) {
                        playSound('metalhit');
                        projectiles.current.splice(pi, 1); // 벽돌 삭제
                    }
                    return !isHit;
                });
            });

            // 🧱 브릭걸 vs 적 충돌 : 게임 오버
            const hitboxTopPadding = 40;   // 머리 아래부터 시작
            const hitboxHeight = 60;       // 몸통만 커버
            const hitboxSidePadding = 14;  // 좌우 여유

            const girlLeft = girlWorldX.current + hitboxSidePadding;
            const girlRight = girlWorldX.current + frameWidth * scale - hitboxSidePadding;
            const girlTop = girlY.current + hitboxTopPadding;
            const girlBottom = girlTop + hitboxHeight;

            const isEnemyColliding = [...walkingEnemies.current, ...flyingEnemies.current].some(enemy => {
                const isFlying = flyingEnemies.current.some(f => f === enemy || (f.x === enemy.x && f.y === enemy.y));

                const enemyLeft = enemy.x + 10;
                const enemyRight = enemy.x + tileSize - 20;

                let enemyTop = enemy.y + 10;
                let enemyBottom = enemy.y + tileSize - 25;  // ✅ 하단 여유 더 줌 (기존 -10 → -25)

                if (!isFlying) {
                    // 걷는 적은 범위 보통
                    enemyTop = enemy.y + 20;
                    enemyBottom = enemy.y + tileSize - 20;
                }

                const horizontallyOverlapping = girlRight > enemyLeft && girlLeft < enemyRight;
                const verticallyOverlapping = girlBottom > enemyTop && girlTop < enemyBottom;

                // // 충돌 박스 그리기 (디버깅용)
                // ctx.strokeStyle = "red";
                // ctx.strokeRect(
                //     girlLeft - cameraX.current,
                //     girlTop,
                //     girlRight - girlLeft,
                //     hitboxHeight
                // );

                // ctx.strokeStyle = "lime";
                // ctx.strokeRect(
                //     enemyLeft - cameraX.current,
                //     enemyTop,
                //     enemyRight - enemyLeft,
                //     enemyBottom - enemyTop
                // );

                return horizontallyOverlapping && verticallyOverlapping;
            });

            if (isEnemyColliding) {
                playSound('defeat');
                setGameOver(true);
                return;
            }

            // 좌측 벽 충돌 시 게임 오버
            const girlScreenX = girlWorldX.current - cameraX.current;
            if (isBlockedHorizontally() && girlScreenX <= 0) {
                setGameOver(true);
                return;
            }

            // 캐릭터 그리기
            updateFrame();
            ctx.drawImage(
                spriteRef.current,
                frameX.current * frameWidth,
                0,
                frameWidth,
                frameHeight,
                girlScreenX,
                girlY.current + 8,  // 캐릭터 y축 위치; +로 커질수록 아래로 이동
                frameWidth * scale,
                frameHeight * scale
            );

            // 🧱 벽돌 이동
            projectiles.current.forEach(p => {
                p.x += p.vx;
                p.vy += p.gravity; // 중력 적용
                p.y += p.vy;
            });

            // 🧱 화면 밖 벽돌 삭제
            projectiles.current = projectiles.current.filter(
                p => p.x - cameraX.current < canvas.width && p.y < canvas.height
            );

            // 🧱 벽돌 그리기
            ctx.font = '20px Arial'; // 이모지 크기 설정
            ctx.textBaseline = 'top'; // 기준점 맞춤
            // ctx.fillStyle = 'orangered';
            projectiles.current.forEach(p => {
                const screenX = p.x - cameraX.current;
                ctx.fillText('🧱', screenX, p.y);
                // ctx.fillRect(screenX, p.y, 12, 6); // 너비 12, 높이 6의 빨간 벽돌
            });

            // ⭐ 그리기
            starTiles.current.forEach(star => {
                const screenX = star.x - cameraX.current;
                ctx.font = "24px Arial";
                ctx.fillStyle = "gold";
                ctx.fillText("⭐", screenX, star.y);
            });

            // ⭐ 충돌 체크 및 수집
            starTiles.current = starTiles.current.filter(star => {
                const starLeft = star.x;
                const starRight = star.x + tileSize;
                const starTop = star.y;
                const starBottom = star.y + tileSize;

                const girlLeft = girlWorldX.current;
                const girlRight = girlWorldX.current + frameWidth * scale;
                const girlTop = girlY.current;
                const girlBottom = girlY.current + frameHeight * scale;

                const isColliding = (
                    girlRight > starLeft &&
                    girlLeft < starRight &&
                    girlBottom > starTop &&
                    girlTop < starBottom
                );

                if (isColliding) {
                    starCount.current++;

                    // ⭐ 50개 획득 시 게임 클리어
                    if (starCount.current === 50) {
                        playSound('victory');
                        setGameClear(true);
                        return false; // 별 제거
                    }

                    playSound('jumpcoin');
                    return false; // 별 제거
                }

                return true; // 남겨둠
            });

            // ⭐ 점수판 표시 (좌측 상단)
            ctx.font = "16px 'Press Start 2P'";
            ctx.fillStyle = "white";
            ctx.textAlign = "left";
            ctx.fillText(`⭐ ${starCount.current}/50`, 12, 26);

            raf = requestAnimationFrame(draw);
        }

        draw();

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('keydown', handleKey);
            window.removeEventListener("touchstart", handleTouch);
        };
    }, [spriteLoaded, gameOver, gameClear]);

    // 키보드 이벤트
    window.addEventListener("keydown", (e) => {
        if (["ArrowUp", "ArrowDown", " "].includes(e.key)) {
            e.preventDefault(); // 스크롤 방지
        }

        if (e.key === "ArrowUp") keys.current.up = true;
        if (e.key === "ArrowDown") keys.current.down = true;

        // if ((e.key === "r" || e.key === "R") && (gameOver || gameClear)) {
        //     window.location.reload();
        // }
    });

    // 페이지 진입 시 GA 이벤트 전송
    useEffect(() => {
    if (window.gtag) {
        window.gtag('event', 'page_view', {
        page_title: 'BrickGirlRT',
        page_location: window.location.href,
        page_path: window.location.hash.replace(/^#/, '') || '/'
        });
    }
    }, []);

    return (
        <div className="flex flex-col items-center mt-6 relative">
            <h2 className="font-press font-bold mb-4 text-rose-400">Brick Girl:Run & Throw</h2>
            <div className="relative" style={{ width: canvasSize.width, height: canvasSize.height }}>
                <canvas
                    ref={canvasRef}
                    width={800}
                    height={400}
                    className="bg-black rounded shadow-md touch-none"
                    style={{ width: '100%', maxWidth: "480px", display: 'block' }}
                />
                <button
                    onClick={toggleMute}
                    className={`absolute top-2 right-2 z-10 w-9 h-9 rounded-full
                                flex items-center justify-center font-press text-xl
                                ${muted ? 'bg-gray-600/50' : 'bg-rose-500/50'}
                                text-white hover:brightness-110 backdrop-blur-sm transition`}
                    aria-label="Toggle Sound"
                >
                    <span className="-translate-y-[3px] opacity-50">{muted ? '🔇' : '🔊'}</span>
                </button>
                <p className="text-xs text-center mt-4 text-gray-500 dark:text-gray-400 font-press">
                    SPACE BAR 🧱 • ⬆️ Jump
                </p>
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none" style={{ backgroundColor: (gameOver || gameClear) ? 'rgba(0,0,0,0.4)' : 'transparent' }}>
                    {(gameOver || gameClear) && (
                        <>
                            <p className="text-xl font-press text-white text-center">
                                {gameOver ? "😢 GAME OVER" : "🎉MISSION COMPLETE!"}
                            </p>
                            <button
                                onClick={() => window.location.reload()}
                                className="font-press mt-4 px-4 py-2 bg-white text-black rounded-lg text-sm pointer-events-auto"
                            >
                                Restart
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BrickGirlRT;