// Chart utility functions for teacher dashboard

export function generateSmoothPath(points: number[][], tension: number = 0.3): string {
  if (points.length < 2) return '';
  
  let path = `M ${points[0][0]},${points[0][1]}`;
  
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const cpx = x1 + (x2 - x1) * tension;
    const cpy = y1;
    
    path += ` Q ${cpx},${cpy} ${x2},${y2}`;
  }
  
  return path;
}

export function generateAreaPath(points: number[][], baseY: number): string {
  const smoothPath = generateSmoothPath(points);
  const lastPoint = points[points.length - 1];
  
  return `${smoothPath} L ${lastPoint[0]},${baseY} L ${points[0][0]},${baseY} Z`;
}
