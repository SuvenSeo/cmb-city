export function bearingFromDirection(x, z) {
  return (Math.atan2(x, -z) * 180 / Math.PI + 360) % 360;
}

export function compassLabel(bearing) {
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(bearing / 45) % 8];
}

export function coordinateLabel([latitude, longitude]) {
  return `${Math.abs(latitude).toFixed(5)}° ${latitude < 0 ? 'S' : 'N'} · ${Math.abs(longitude).toFixed(5)}° ${longitude < 0 ? 'W' : 'E'}`;
}

export function placeLabels(points, width, height, selected) {
  const phone = width < 700, top = phone ? 228 : 165, bottom = phone ? 205 : 155;
  const accepted = [];
  return [...points].sort((a,b) => Number(b.id === selected) - Number(a.id === selected)).map(point => {
    const x=(point.x+1)*width/2, y=(1-point.y)*height/2;
    const visible=!point.occluded && point.z > -1 && point.z < 1 && x>76 && x<width-76 && y>top && y<height-bottom &&
      !accepted.some(other => Math.abs(other.x-x)<(phone?155:175) && Math.abs(other.y-y)<86);
    if(visible) accepted.push({x,y});
    return {id:point.id,x,y,visible};
  });
}
