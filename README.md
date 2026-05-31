# Bingo Assistant

A touch-first web app for replacing paper bingo boards on a phone or iPad while an external lottery drawer supplies the numbers.

## Workflow

1. Enter the latest draw number at the top.
2. Switch to each player.
3. Tap the matching number on that player's board.

The app blocks wrong taps. If the latest draw exists on the selected board, the matching cell is highlighted and wrong taps show the row and column hint.

## Defaults

- 3 players
- 5x5 board per player
- Unique random numbers from 1 to 99
- No free center square
- Manual draw entry only
- Same-device autosave through browser `localStorage`

## Controls

- **Record**: adds a new draw from 1 to 99 and rejects duplicates.
- **Player tabs**: switch the active board.
- **Add player**: creates a new board for another player.
- **Undo last draw**: removes the latest draw and clears that number from all marked boards.
- **Regenerate boards**: keeps draw history but replaces all boards and clears marks.
- **New game**: resets to 3 players with fresh boards and no draw history.

## Settings

Use the gear button to change game configuration:

- **Max lottery number**: whole number from 25 to 999.
- **Board size**: whole number from 3 to 7, creating an `NxN` board.
- **Default players**: whole number from 1 to 12.
- **Block duplicate draws**: reject or allow repeated draw entries.
- **Auto-hint latest draw**: highlight the matching board cell after a draw.

The max lottery number must be at least the number of board cells. For example, a 7x7 board needs a max number of at least 49. Changing max number, board size, or default player count resets the active game after confirmation. Toggle-only changes apply without resetting.

## Development

```bash
npm install
npm run dev -- --host 127.0.0.1
```

Build check:

```bash
npm run build
npm run smoke
```

Serve the production build locally:

```bash
npm run preview:dist
```

## Deploy to GitHub Pages

This project includes a GitHub Actions workflow at `.github/workflows/deploy-pages.yml`.

1. Create a GitHub repository and push this project to the `main` branch.
2. In GitHub, open **Settings > Pages**.
3. Set **Build and deployment > Source** to **GitHub Actions**.
4. Push to `main` or run the **Deploy to GitHub Pages** workflow manually.

The Vite build uses relative asset paths, so it works for both user pages and project pages.
