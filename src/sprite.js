export const POSES = ['idle', 'blink', 'typing_a', 'typing_b', 'typing_c', 'alert', 'celebrate'];

export const ANIMALS = [
  'orange_cat',
  'tuxedo_cat',
  'chipmunk',
  'beagle',
  'hamster',
  'red_panda',
  'evil_beagle',
];

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed to load sprite: ${src}`));
    img.src = src;
  });
}

export async function loadAnimal(base, animal) {
  const imgs = await Promise.all(POSES.map((p) => loadImage(`${base}/${animal}_${p}.png`)));
  const map = {};
  POSES.forEach((p, i) => { map[p] = imgs[i]; });
  return map;
}
