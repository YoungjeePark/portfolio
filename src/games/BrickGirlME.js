// BrickGirlMazeEscape.jsx
import React, { useRef, useEffect, useState } from 'react';

const TILE_SIZE = 40;
const VIEW_COLS = 10;
const VIEW_ROWS = 7;
const INITIAL_TIME = 60;

const createMaze = () => {
    const raw = [
        "WWWWWWWWWWWWWWWWWWWWWW",
        "WS  W    W    WBW   WW",
        "WWW WBWW W WW   W W WW",
        "W W WW     WWWWWW W WW",
        "W W    W WW     W W WW",
        "W WWWW W BW W W W W WW",
        "W    W WWWW W W W W  W",
        "WW W W      W W W WW W",
        "WW W   WWWWWWBW W W  W",
        "WW  WWW      WW   W WW",
        "WBW WBW WWWW W WWWW WW",
        "W     W W BW W       W",
        "WWWWWWW   WW W WWWWW W",
        "W       WWWW W W     W",
        "W WWWWWW       W WWWWW",
        "W W   W  WWWWWWB     W",
        "W   W W W     WWWWWW W",
        "WWWWW W W WWW W    W W",
        "W     WBW WBW W WW W W",
        "W WWWWWWW W W   WW WWW",
        "W           WWWWWW  EW",
        "WWWWWWWWWWWWWWWWWWWWWW"
    ];
    return raw.map(row => row.split(''));
};

export default function BrickGirlMazeEscape() {
    const canvasRef = useRef(null);
    const [canvasSize] = useState({ width: VIEW_COLS * TILE_SIZE, height: VIEW_ROWS * TILE_SIZE });
    const [grid, setGrid] = useState(createMaze);
    const [position, setPosition] = useState({ x: 1, y: 1 });
    const [keysCollected, setKeysCollected] = useState(0);
    const [totalKeysGiven, setTotalKeysGiven] = useState(0);
    const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
    const [gameOver, setGameOver] = useState(false);
    const [gameClear, setGameClear] = useState(false);

    const spriteRef = useRef(null);
    const [spriteLoaded, setSpriteLoaded] = useState(false);
    const frameX = useRef(0);
    const numCols = 3;
    const frameWidth = 335;
    const frameHeight = 512;
    const scale = 0.12;

    const boxSprite = useRef(null);
    const [floatEffects, setFloatEffects] = useState([]);

    // 모바일용 버추얼 조이스틱
    const joystickRef = useRef(null);
    const [joystickCenter, setJoystickCenter] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const moveDirection = useRef(null);
    const moveTimer = useRef(null);

    const handleTouchStart = (e) => {
        if (!joystickRef.current) return;
        const rect = joystickRef.current.getBoundingClientRect();
        setJoystickCenter({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
        setDragging(true);

        // 시작 시 기본 방향으로 움직이게 만들기 위해 추가
        const touch = e.touches[0];
        const dx = touch.clientX - (rect.left + rect.width / 2);
        const dy = touch.clientY - (rect.top + rect.height / 2);
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        let newDirection = null;
        if (absX > 20 || absY > 20) {
            if (absX > absY) newDirection = dx > 0 ? 'right' : 'left';
            else newDirection = dy > 0 ? 'down' : 'up';
        }

        if (newDirection) {
            moveDirection.current = newDirection;
            if (moveTimer.current) clearInterval(moveTimer.current);
            startMoving(newDirection);
        }
    };

    const startMoving = (direction) => {
        if (moveTimer.current) return;

        moveTimer.current = setInterval(() => {
            if (direction === 'up') move(0, -1);
            if (direction === 'down') move(0, 1);
            if (direction === 'left') move(-1, 0);
            if (direction === 'right') move(1, 0);
        }, 200);
    };

    const handleTouchMove = (e) => {
        if (!dragging) return;
        const touch = e.touches[0];
        detectAndStartMoving(touch.clientX, touch.clientY);
    };

    const detectAndStartMoving = (clientX, clientY) => {
        const dx = clientX - joystickCenter.x;
        const dy = clientY - joystickCenter.y;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        let newDirection = null;
        if (absX > 20 || absY > 20) {
            if (absX > absY) newDirection = dx > 0 ? 'right' : 'left';
            else newDirection = dy > 0 ? 'down' : 'up';
        }

        if (newDirection) {
            if (moveDirection.current !== newDirection || !moveTimer.current) {
                moveDirection.current = newDirection;
                if (moveTimer.current) clearInterval(moveTimer.current);
                startMoving(newDirection);
            }
        }
    };

    const handleTouchEnd = () => {
        setDragging(false);
        if (moveTimer.current) {
            clearInterval(moveTimer.current);
            moveTimer.current = null;
        }
    };

    useEffect(() => {
        const sprite = new Image();
        sprite.src = process.env.PUBLIC_URL + '/brickgirl_sprite.png';
        sprite.onload = () => setSpriteLoaded(true);
        spriteRef.current = sprite;

        const box = new Image();
        box.src = process.env.PUBLIC_URL + '/mazebox.png';
        boxSprite.current = box;
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            frameX.current = (frameX.current + 1) % numCols;
        }, 200);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setFloatEffects(prev => prev.filter(e => now - e.timestamp < 1000));
        }, 200);
        return () => clearInterval(interval);
    }, []);

    const addEffect = (x, y, result) => {
        const textMap = {
            'K': '🔑+1',
            'H': '🕒+10',
            'T': '🕒-5',
            'O': '💨'
        };
        const floatText = textMap[result] || '❔';
        setFloatEffects(prev => [...prev, { x, y, text: floatText, timestamp: Date.now() }]);
    };

    const getBoxItem = () => {
        const items = ['K', 'H', 'T', 'O'];
        const chance = Math.random();
        if (totalKeysGiven < 3 && chance < 0.5) {
            setTotalKeysGiven(prev => prev + 1);
            return 'K';
        }
        if (chance < 0.7) return 'H';
        if (chance < 0.9) return 'T';
        return 'O';
    };

    const move = (dx, dy) => {
        if (gameOver || gameClear) return;
        const newX = position.x + dx;
        const newY = position.y + dy;
        if (newY < 0 || newY >= grid.length || newX < 0 || newX >= grid[0].length) return;

        const updatedGrid = grid.map(row => [...row]);
        let targetCell = updatedGrid[newY][newX];

        if (targetCell === 'W') return;

        if (targetCell === 'B') {
            const result = getBoxItem();
            updatedGrid[newY][newX] = result;
            setGrid(updatedGrid);
            addEffect(newX, newY, result);
            targetCell = result;
        }

        if (targetCell === 'K') {
            setKeysCollected(prev => prev + 1);
            updatedGrid[newY][newX] = 'O';
        }
        if (targetCell === 'T') {
            updatedGrid[newY][newX] = 'O';
            setTimeLeft(prev => {
                const newTime = Math.max(0, prev - 5);
                if (newTime === 0) setGameOver(true);
                return newTime;
            });
        }
        if (targetCell === 'H') {
            setTimeLeft(prev => prev + 10);
            updatedGrid[newY][newX] = 'O';
        }
        if (targetCell === 'E') {
            if (keysCollected >= 3) setGameClear(true);
            else return;
        }

        setPosition({ x: newX, y: newY });
        setGrid(updatedGrid);
    };

    useEffect(() => {
        if (timeLeft <= 0 && !gameOver && !gameClear) {
            setGameOver(true);
        }
        if (gameOver || gameClear) return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                const newTime = Math.max(0, prev - 1);
                if (newTime === 0) setGameOver(true);
                return newTime;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [timeLeft, gameOver, gameClear]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowUp') move(0, -1);
            if (e.key === 'ArrowDown') move(0, 1);
            if (e.key === 'ArrowLeft') move(-1, 0);
            if (e.key === 'ArrowRight') move(1, 0);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [position, grid, keysCollected, gameOver, gameClear]);

    useEffect(() => {
        const ctx = canvasRef.current.getContext('2d');
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, VIEW_COLS * TILE_SIZE, VIEW_ROWS * TILE_SIZE);

        const startX = Math.max(0, position.x - Math.floor(VIEW_COLS / 2));
        const startY = Math.max(0, position.y - Math.floor(VIEW_ROWS / 2));

        for (let y = 0; y < VIEW_ROWS; y++) {
            for (let x = 0; x < VIEW_COLS; x++) {
                const mapX = startX + x;
                const mapY = startY + y;
                if (mapY >= grid.length || mapX >= grid[0].length) continue;

                const cell = grid[mapY][mapX];

                if ((cell === 'B' || cell === 'O') && boxSprite.current) {
                    const spriteX = cell === 'B' ? 0 : boxSprite.current.width / 2;
                    const boxHeight = TILE_SIZE * 1.8;
                    const boxOffsetY = TILE_SIZE - boxHeight + 14;
                    ctx.drawImage(
                        boxSprite.current,
                        spriteX, 0,
                        boxSprite.current.width / 2, boxSprite.current.height,
                        x * TILE_SIZE,
                        y * TILE_SIZE + boxOffsetY,
                        TILE_SIZE,
                        boxHeight
                    );
                    continue;
                }

                let color = 'black';
                if (cell === 'W') color = 'dimgray';
                if (cell === 'K') color = 'gold';
                if (cell === 'T') color = 'red';
                if (cell === 'H') color = 'skyblue';
                if (cell === 'E') color = 'lime';

                ctx.fillStyle = color;
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }

        floatEffects.forEach(({ x: fx, y: fy, text }) => {
            const drawX = (fx - startX) * TILE_SIZE + TILE_SIZE / 2;
            const drawY = (fy - startY) * TILE_SIZE + TILE_SIZE / 2;
            ctx.fillStyle = 'white';
            ctx.font = "12px 'Press Start 2P'";
            ctx.textAlign = 'center';
            ctx.fillText(text, drawX, drawY);
        });

        ctx.font = "13px 'Press Start 2P'";
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText(`⏱ ${timeLeft}s 🔑 ${keysCollected}/3`, (VIEW_COLS * TILE_SIZE) / 2, 20);

        if (spriteLoaded) {
            const drawX = (position.x - startX) * TILE_SIZE;
            const drawY = (position.y - startY) * TILE_SIZE;
            const spriteOffsetY = TILE_SIZE - (frameHeight * scale);
            ctx.drawImage(
                spriteRef.current,
                frameX.current * frameWidth, 0,
                frameWidth, frameHeight,
                drawX,
                drawY + spriteOffsetY,
                frameWidth * scale,
                frameHeight * scale
            );
        } else {
            ctx.fillStyle = 'hotpink';
            ctx.fillRect((position.x - startX) * TILE_SIZE, (position.y - startY) * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }, [grid, position, spriteLoaded, timeLeft, keysCollected, floatEffects]);

    // 페이지 진입 시 GA 이벤트 전송
    useEffect(() => {
    if (window.gtag) {
        window.gtag('event', 'page_view', {
        page_title: 'BrickGirlME',
        page_location: window.location.href,
        page_path: window.location.hash.replace(/^#/, '') || '/'
        });
    }
    }, []);

    return (
        <div className="flex flex-col items-center mt-6 relative">
            <h2 className="font-press font-bold mb-4 text-rose-400">Brick Girl: Maze Escape</h2>
            <div className="relative" style={{ width: canvasSize.width, height: canvasSize.height }}>
                <canvas
                    ref={canvasRef}
                    width={canvasSize.width}
                    height={canvasSize.height}
                    className="bg-black rounded shadow-md touch-none"
                    style={{ width: '100%', maxWidth: "480px", display: 'block' }}
                />
                {/* 방향 조작 버튼 (모바일용) */}
                <div
                    ref={joystickRef}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center space-y-2 md:hidden"
                >
                    <div className="w-12 h-12 bg-white rounded-full mx-auto mt-6 opacity-80 select-none touch-none"></div>
                </div>

                <p className="text-xs text-center mt-4 text-gray-500 dark:text-gray-400 font-press">
                    🟡Key×3 = 🟩Exit | 🔵+10s | 🔴-5s
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
}