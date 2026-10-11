# Pocket Dungeon

A small 2D browser dungeon game built with **Phaser, TypeScript, and Vite**. Fight through three randomized rooms, choose upgrades, and defeat the crown guardian.

## Features

- Shuffled room layouts, enemy positions, and themes on each run.
- Slimes, bats, bone archers, charging beetles, wisps, and an enraging guardian.
- Telegraphed attacks, dash dodges, collectible coins, and upgrade choices.
- Pixel art, optional sound effects, keyboard/mouse controls, and touch buttons.

## Run locally

Requires Node.js **20.19+ or 22.12+**.

```sh
git clone https://github.com/raising-heart/pocket-dungeon.git
cd pocket-dungeon
npm install
npm run dev
```

Open the local URL printed by Vite.

## Controls

| Action | Control |
| --- | --- |
| Move | WASD or arrow keys |
| Aim and fire | Mouse; hold left click |
| Auto-aim and fire | Hold Space |
| Dash | Shift |
| Pause | Escape |

On touch devices, use the directional pad and FIRE/DASH buttons. Clear every foe, then enter the glowing north door. Choose a blessing between rooms. Combat tips are available in the pause menu.

## Test and build

```sh
npm test
npm run build
npm run preview
```

The 16 tests cover gameplay, enemy attacks, and safety checks across 1,500 generated room layouts. Production files are built into `dist/`.

## License

[MIT](LICENSE).
