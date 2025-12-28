/**
 * NoteGen 앱 에셋 생성 스크립트
 * 실행: node scripts/generate-assets.js
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '../assets');

// 색상 정의
const COLORS = {
  background: '#FFFEF8',  // 크림색 배경
  primary: '#3B82F6',     // 파란색
  text: '#2C2C2C',        // 텍스트
  accent: '#10B981',      // 민트
};

// 이모지를 텍스트로 그리기 (시스템 폰트 사용)
function drawEmoji(ctx, emoji, x, y, size) {
  ctx.font = `${size}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, x, y);
}

// 1. 앱 아이콘 생성 (1024x1024)
function generateIcon() {
  const size = 1024;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // 배경 (둥근 모서리 효과를 위해 원형 그라데이션)
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, size, size);

  // 중앙에 큰 원 (약간의 그림자 효과)
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.4;

  // 그림자
  ctx.beginPath();
  ctx.arc(centerX + 10, centerY + 10, radius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.fill();

  // 메인 원
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.primary;
  ctx.fill();

  // 노트 아이콘 (사각형 + 줄)
  const noteWidth = size * 0.35;
  const noteHeight = size * 0.45;
  const noteX = centerX - noteWidth / 2;
  const noteY = centerY - noteHeight / 2;
  const cornerRadius = 20;

  // 노트 배경 (흰색 사각형)
  ctx.beginPath();
  ctx.roundRect(noteX, noteY, noteWidth, noteHeight, cornerRadius);
  ctx.fillStyle = 'white';
  ctx.fill();

  // 노트 줄들
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 8;
  const lineStartX = noteX + 40;
  const lineEndX = noteX + noteWidth - 40;
  for (let i = 0; i < 4; i++) {
    const lineY = noteY + 80 + i * 55;
    ctx.beginPath();
    ctx.moveTo(lineStartX, lineY);
    ctx.lineTo(lineEndX, lineY);
    ctx.stroke();
  }

  // 연필 아이콘 (오른쪽 하단)
  const pencilX = centerX + radius * 0.5;
  const pencilY = centerY + radius * 0.5;

  // 연필 몸체
  ctx.save();
  ctx.translate(pencilX, pencilY);
  ctx.rotate(-Math.PI / 4);

  ctx.fillStyle = '#FCD34D'; // 노란색
  ctx.fillRect(-15, -60, 30, 80);

  // 연필 팁
  ctx.beginPath();
  ctx.moveTo(-15, 20);
  ctx.lineTo(0, 45);
  ctx.lineTo(15, 20);
  ctx.fillStyle = '#F59E0B';
  ctx.fill();

  // 연필 끝 (검정)
  ctx.beginPath();
  ctx.moveTo(-5, 35);
  ctx.lineTo(0, 45);
  ctx.lineTo(5, 35);
  ctx.fillStyle = '#1F2937';
  ctx.fill();

  ctx.restore();

  // 저장
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(ASSETS_DIR, 'icon.png'), buffer);
  console.log('icon.png (1024x1024)');
}

// 2. 적응형 아이콘 (Android) - 포그라운드만
function generateAdaptiveIcon() {
  const size = 1024;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // 투명 배경
  ctx.clearRect(0, 0, size, size);

  const centerX = size / 2;
  const centerY = size / 2;

  // 노트 아이콘 (더 크게)
  const noteWidth = size * 0.5;
  const noteHeight = size * 0.6;
  const noteX = centerX - noteWidth / 2;
  const noteY = centerY - noteHeight / 2;
  const cornerRadius = 30;

  // 그림자
  ctx.beginPath();
  ctx.roundRect(noteX + 8, noteY + 8, noteWidth, noteHeight, cornerRadius);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.fill();

  // 노트 배경
  ctx.beginPath();
  ctx.roundRect(noteX, noteY, noteWidth, noteHeight, cornerRadius);
  ctx.fillStyle = 'white';
  ctx.fill();
  ctx.strokeStyle = COLORS.primary;
  ctx.lineWidth = 8;
  ctx.stroke();

  // 노트 줄들
  ctx.strokeStyle = '#D1D5DB';
  ctx.lineWidth = 10;
  const lineStartX = noteX + 50;
  const lineEndX = noteX + noteWidth - 50;
  for (let i = 0; i < 4; i++) {
    const lineY = noteY + 100 + i * 70;
    ctx.beginPath();
    ctx.moveTo(lineStartX, lineY);
    ctx.lineTo(lineEndX, lineY);
    ctx.stroke();
  }

  // 체크 마크 (첫번째 줄)
  ctx.strokeStyle = COLORS.primary;
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(lineStartX - 20, noteY + 100);
  ctx.lineTo(lineStartX, noteY + 115);
  ctx.lineTo(lineStartX + 30, noteY + 85);
  ctx.stroke();

  // 저장
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(ASSETS_DIR, 'adaptive-icon.png'), buffer);
  console.log('adaptive-icon.png (1024x1024)');
}

// 3. 스플래시 화면 (1284x2778 - iPhone 14 Pro Max)
function generateSplash() {
  const width = 1284;
  const height = 2778;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 배경
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, width, height);

  const centerX = width / 2;
  const centerY = height / 2 - 100;

  // 로고 원
  const radius = 180;

  // 그림자
  ctx.beginPath();
  ctx.arc(centerX + 8, centerY + 8, radius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.fill();

  // 메인 원
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.primary;
  ctx.fill();

  // 노트 아이콘
  const noteWidth = 160;
  const noteHeight = 200;
  const noteX = centerX - noteWidth / 2;
  const noteY = centerY - noteHeight / 2;

  ctx.beginPath();
  ctx.roundRect(noteX, noteY, noteWidth, noteHeight, 15);
  ctx.fillStyle = 'white';
  ctx.fill();

  // 줄
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 6;
  for (let i = 0; i < 4; i++) {
    const lineY = noteY + 40 + i * 35;
    ctx.beginPath();
    ctx.moveTo(noteX + 25, lineY);
    ctx.lineTo(noteX + noteWidth - 25, lineY);
    ctx.stroke();
  }

  // 앱 이름
  ctx.font = 'bold 72px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.text;
  ctx.fillText('NoteGen', centerX, centerY + radius + 120);

  // 태그라인
  ctx.font = '36px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#666666';
  ctx.fillText('AI가 필기를 정리해드려요', centerX, centerY + radius + 180);

  // 저장
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(ASSETS_DIR, 'splash.png'), buffer);
  console.log('splash.png (1284x2778)');
}

// 4. 파비콘 (48x48)
function generateFavicon() {
  const size = 48;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // 배경
  ctx.fillStyle = COLORS.primary;
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
  ctx.fill();

  // 간단한 노트 아이콘
  const noteWidth = 24;
  const noteHeight = 30;
  const noteX = (size - noteWidth) / 2;
  const noteY = (size - noteHeight) / 2;

  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.roundRect(noteX, noteY, noteWidth, noteHeight, 3);
  ctx.fill();

  // 줄
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const lineY = noteY + 8 + i * 7;
    ctx.beginPath();
    ctx.moveTo(noteX + 4, lineY);
    ctx.lineTo(noteX + noteWidth - 4, lineY);
    ctx.stroke();
  }

  // 저장
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(ASSETS_DIR, 'favicon.png'), buffer);
  console.log('favicon.png (48x48)');
}

// 메인 실행
console.log('NoteGen 앱 에셋 생성 중...\n');

try {
  generateIcon();
  generateAdaptiveIcon();
  generateSplash();
  generateFavicon();
  console.log('\n모든 에셋이 생성되었습니다!');
  console.log('위치: mobile/assets/');
} catch (error) {
  console.error('에셋 생성 실패:', error.message);
  process.exit(1);
}
