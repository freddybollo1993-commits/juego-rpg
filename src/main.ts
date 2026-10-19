import './style.css';

console.log('Juego reiniciado desde cero. Base limpia lista para la nueva arquitectura y dirección artística.');

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function render() {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('RPG Medieval de Supervivencia', canvas.width / 2, canvas.height / 2 - 20);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '16px sans-serif';
  ctx.fillText('Base limpia. Listo para el nuevo rumbo y estilo artístico.', canvas.width / 2, canvas.height / 2 + 20);

  requestAnimationFrame(render);
}

requestAnimationFrame(render);
