import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Plus,
  RefreshCcw,
  Save,
  Settings,
  Sparkles,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import {
  boardCellCount,
  canRecordDraw,
  CONFIG_LIMITS,
  createDefaultGame,
  createPlayer,
  locationHint,
  MIN_NUMBER,
  normalizeConfig,
  normalizeGame,
  parseDraw,
  randomBoard,
  validateConfig,
} from './gameLogic.js';
import './styles.css';

const STORAGE_KEY = 'bingo-assistant:v1';

function loadGame() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? normalizeGame(JSON.parse(saved)) : normalizeGame(createDefaultGame());
  } catch {
    return normalizeGame(createDefaultGame());
  }
}

function configNeedsReset(current, next) {
  return (
    current.maxNumber !== next.maxNumber
    || current.boardSize !== next.boardSize
    || current.defaultPlayerCount !== next.defaultPlayerCount
  );
}

function SettingsPanel({ config, onCancel, onSave }) {
  const [draft, setDraft] = useState(config);
  const validation = validateConfig(draft);

  function updateField(field, value) {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function submit(event) {
    event.preventDefault();
    if (!validation.ok) return;
    onSave(validation.config);
  }

  return (
    <section className="settings-panel" aria-label="Settings">
      <form onSubmit={submit}>
        <div className="settings-heading">
          <div>
            <h2>Settings</h2>
            <p>Board-shaping changes reset the active game after confirmation.</p>
          </div>
          <button className="icon-button" type="button" onClick={onCancel} aria-label="Close settings">
            <X size={18} />
          </button>
        </div>

        <div className="settings-grid">
          <label className="setting-control">
            <span>Max lottery number</span>
            <input
              type="number"
              min={CONFIG_LIMITS.maxNumber.min}
              max={CONFIG_LIMITS.maxNumber.max}
              value={draft.maxNumber}
              onChange={(event) => updateField('maxNumber', Number(event.target.value))}
            />
          </label>

          <label className="setting-control">
            <span>Board size</span>
            <input
              type="number"
              min={CONFIG_LIMITS.boardSize.min}
              max={CONFIG_LIMITS.boardSize.max}
              value={draft.boardSize}
              onChange={(event) => updateField('boardSize', Number(event.target.value))}
            />
            <small>{draft.boardSize} x {draft.boardSize}</small>
          </label>

          <label className="setting-control">
            <span>Default players</span>
            <input
              type="number"
              min={CONFIG_LIMITS.defaultPlayerCount.min}
              max={CONFIG_LIMITS.defaultPlayerCount.max}
              value={draft.defaultPlayerCount}
              onChange={(event) => updateField('defaultPlayerCount', Number(event.target.value))}
            />
          </label>

          <label className="toggle-control">
            <input
              type="checkbox"
              checked={draft.blockDuplicateDraws}
              onChange={(event) => updateField('blockDuplicateDraws', event.target.checked)}
            />
            <span>
              <strong>Block duplicate draws</strong>
              <small>Reject a draw number that already appears in history.</small>
            </span>
          </label>

          <label className="toggle-control">
            <input
              type="checkbox"
              checked={draft.autoHintLatestDraw}
              onChange={(event) => updateField('autoHintLatestDraw', event.target.checked)}
            />
            <span>
              <strong>Auto-hint latest draw</strong>
              <small>Highlight the matching board cell after a draw is recorded.</small>
            </span>
          </label>
        </div>

        {!validation.ok && (
          <div className="settings-errors" role="alert">
            {validation.errors.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        )}

        <div className="settings-actions">
          <button className="secondary-action" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="save-action" type="submit" disabled={!validation.ok}>
            <Save size={18} />
            Save settings
          </button>
        </div>
      </form>
    </section>
  );
}

function BingoApp() {
  const [game, setGame] = useState(loadGame);
  const [drawInput, setDrawInput] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
  }, [game]);

  const config = normalizeConfig(game.config);
  const cellCount = boardCellCount(config);
  const latestDraw = game.drawHistory[0] ?? null;
  const selectedPlayer = useMemo(
    () => game.players.find((player) => player.id === game.selectedPlayerId) ?? game.players[0],
    [game.players, game.selectedPlayerId],
  );
  const latestDrawIndex = latestDraw && selectedPlayer ? selectedPlayer.board.indexOf(latestDraw) : -1;
  const markedCount = selectedPlayer?.marked.length ?? 0;

  function updateMessage(type, text) {
    setGame((current) => ({
      ...current,
      message: { type, text },
    }));
  }

  function recordDraw(event) {
    event.preventDefault();
    const parsed = parseDraw(drawInput, config);
    if (!parsed.ok) {
      updateMessage('danger', parsed.message);
      return;
    }
    const value = parsed.value;
    const duplicateCheck = canRecordDraw(game.drawHistory, value, config);

    if (!duplicateCheck.ok) {
      updateMessage('danger', duplicateCheck.message);
      return;
    }

    const existsOnBoard = selectedPlayer.board.includes(value);
    setGame((current) => ({
      ...current,
      drawHistory: [value, ...current.drawHistory],
      message: {
        type: existsOnBoard && config.autoHintLatestDraw ? 'hint' : 'info',
        text: existsOnBoard
          ? `${value} is on ${selectedPlayer.name}'s board.${config.autoHintLatestDraw ? ' Tap the highlighted spot.' : ''}`
          : `${value} is recorded, but it is not on ${selectedPlayer.name}'s board.`,
      },
    }));
    setDrawInput('');
  }

  function selectPlayer(playerId) {
    const nextPlayer = game.players.find((player) => player.id === playerId);
    const hasDraw = latestDraw !== null;
    const drawOnBoard = hasDraw && nextPlayer?.board.includes(latestDraw);
    setGame((current) => ({
      ...current,
      selectedPlayerId: playerId,
      message: hasDraw
        ? {
            type: drawOnBoard && config.autoHintLatestDraw ? 'hint' : 'info',
            text: drawOnBoard
              ? `${latestDraw} is on ${nextPlayer.name}'s board.${config.autoHintLatestDraw ? ' Tap the highlighted spot.' : ''}`
              : `${latestDraw} is not on ${nextPlayer.name}'s board.`,
          }
        : current.message,
    }));
  }

  function markCell(number) {
    if (latestDraw === null) {
      updateMessage('danger', 'Record the latest draw before marking a board.');
      return;
    }

    if (number !== latestDraw) {
      const location = locationHint(selectedPlayer.board, latestDraw, config);
      const locationText = location
        ? ` Hint: ${latestDraw} is at row ${location.row}, column ${location.column}.`
        : ` ${latestDraw} is not on this board.`;
      updateMessage('danger', `Registration halted. Tap only the latest draw number: ${latestDraw}.${locationText}`);
      return;
    }

    if (!selectedPlayer.board.includes(number)) {
      updateMessage('info', `${number} is recorded, but it is not on this board.`);
      return;
    }

    if (selectedPlayer.marked.includes(number)) {
      updateMessage('info', `${number} is already registered for ${selectedPlayer.name}.`);
      return;
    }

    setGame((current) => ({
      ...current,
      players: current.players.map((player) => (
        player.id === selectedPlayer.id
          ? { ...player, marked: [...player.marked, number] }
          : player
      )),
      message: {
        type: 'success',
        text: `${selectedPlayer.name} registered ${number}. Switch players to continue.`,
      },
    }));
  }

  function addPlayer() {
    setGame((current) => {
      const player = createPlayer(current.players.length + 1, current.config);
      return {
        ...current,
        players: [...current.players, player],
        selectedPlayerId: player.id,
        message: { type: 'success', text: `${player.name} added with a fresh board.` },
      };
    });
  }

  function undoLastDraw() {
    if (latestDraw === null) {
      updateMessage('info', 'There is no draw to undo.');
      return;
    }

    setGame((current) => {
      const [removedDraw, ...remainingDraws] = current.drawHistory;
      const shouldKeepMarks = remainingDraws.includes(removedDraw);
      return {
        ...current,
        drawHistory: remainingDraws,
        players: shouldKeepMarks
          ? current.players
          : current.players.map((player) => ({
              ...player,
              marked: player.marked.filter((number) => number !== removedDraw),
            })),
        message: { type: 'info', text: `Undid draw ${removedDraw}${shouldKeepMarks ? '.' : ' and removed matching marks.'}` },
      };
    });
  }

  function regenerateBoards() {
    if (!window.confirm('Regenerate all boards and clear registered marks? Draw history will stay.')) return;
    setGame((current) => ({
      ...current,
      players: current.players.map((player) => ({ ...player, board: randomBoard(current.config), marked: [] })),
      message: { type: 'success', text: 'Boards regenerated. Draw history was kept.' },
    }));
  }

  function newGame() {
    if (!window.confirm(`Start a new game with ${config.defaultPlayerCount} players and clear all draws?`)) return;
    const next = normalizeGame(createDefaultGame(config));
    setGame({
      ...next,
      message: { type: 'success', text: 'New game ready. Enter the first draw.' },
    });
    setDrawInput('');
  }

  function saveSettings(nextConfig) {
    const normalizedNextConfig = normalizeConfig(nextConfig);
    if (configNeedsReset(config, normalizedNextConfig)) {
      const confirmed = window.confirm('These settings change board shape or player defaults. Apply them and reset the active game?');
      if (!confirmed) return;
      const next = normalizeGame(createDefaultGame(normalizedNextConfig));
      setGame({
        ...next,
        message: { type: 'success', text: 'Settings saved. A fresh game was created.' },
      });
      setDrawInput('');
      setSettingsOpen(false);
      return;
    }

    setGame((current) => ({
      ...current,
      config: normalizedNextConfig,
      message: { type: 'success', text: 'Settings saved.' },
    }));
    setSettingsOpen(false);
  }

  return (
    <main className="app-shell">
      <section className="topbar" aria-label="Draw controls">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">B</span>
          <div>
            <h1>Bingo Assistant</h1>
            <p>Draw first. Tap the matching board number.</p>
          </div>
        </div>

        <div className="actions">
          <button className="icon-button" type="button" onClick={() => setSettingsOpen((open) => !open)} aria-label="Open settings">
            <Settings size={18} />
          </button>
          <button className="icon-button" type="button" onClick={undoLastDraw} aria-label="Undo last draw">
            <Undo2 size={18} />
          </button>
          <button className="icon-button" type="button" onClick={regenerateBoards} aria-label="Regenerate boards">
            <RefreshCcw size={18} />
          </button>
          <button className="icon-button danger-button" type="button" onClick={newGame} aria-label="Start new game">
            <Trash2 size={18} />
          </button>
        </div>
      </section>

      {settingsOpen && (
        <SettingsPanel
          config={config}
          onCancel={() => setSettingsOpen(false)}
          onSave={saveSettings}
        />
      )}

      <section className="draw-panel">
        <form className="draw-form" onSubmit={recordDraw}>
          <label htmlFor="draw-input">Latest draw</label>
          <div className="draw-entry">
            <input
              id="draw-input"
              inputMode="numeric"
              min={MIN_NUMBER}
              max={config.maxNumber}
              pattern="[0-9]*"
              placeholder={latestDraw ? String(latestDraw) : '42'}
              type="number"
              value={drawInput}
              onChange={(event) => setDrawInput(event.target.value)}
            />
            <button type="submit">
              <Sparkles size={18} />
              Record
            </button>
          </div>
        </form>

        <div className="draw-history" aria-label="Draw history">
          <div className="history-heading">
            <span>Recent draws</span>
            <strong>{game.drawHistory.length}</strong>
          </div>
          <div className="history-strip">
            {game.drawHistory.length > 0 ? (
              game.drawHistory.slice(0, 12).map((draw, index) => (
                <span className={index === 0 ? 'draw-chip current' : 'draw-chip'} key={`${draw}-${index}`}>
                  {draw}
                </span>
              ))
            ) : (
              <span className="empty-history">No draws yet</span>
            )}
          </div>
        </div>
      </section>

      <section className="player-strip" aria-label="Players">
        <div className="player-tabs">
          {game.players.map((player) => (
            <button
              className={player.id === selectedPlayer.id ? 'player-tab selected' : 'player-tab'}
              type="button"
              key={player.id}
              onClick={() => selectPlayer(player.id)}
            >
              <span>{player.name}</span>
              <strong>{player.marked.length}/{cellCount}</strong>
            </button>
          ))}
        </div>
        <button className="add-player" type="button" onClick={addPlayer}>
          <Plus size={18} />
          Add player
        </button>
      </section>

      <section className="board-area" aria-label={`${selectedPlayer.name} board`}>
        <div className="board-header">
          <div>
            <h2>{selectedPlayer.name}</h2>
            <p>{markedCount} registered - {latestDraw === null ? 'Waiting for first draw' : `Latest draw ${latestDraw}`}</p>
          </div>
          <div className="board-meter" aria-label={`${markedCount} of ${cellCount} numbers registered`}>
            <span style={{ width: `${(markedCount / cellCount) * 100}%` }} />
          </div>
        </div>

        <div className={`status ${game.message.type}`} role="status">
          {game.message.text}
        </div>

        <div className="bingo-board" style={{ '--board-size': config.boardSize }}>
          {selectedPlayer.board.map((number, index) => {
            const isMarked = selectedPlayer.marked.includes(number);
            const isLatest = number === latestDraw;
            const shouldHint = config.autoHintLatestDraw && isLatest && latestDrawIndex >= 0 && !isMarked;
            return (
              <button
                className={[
                  'cell',
                  isMarked ? 'marked' : '',
                  shouldHint ? 'hinted' : '',
                ].filter(Boolean).join(' ')}
                type="button"
                key={`${number}-${index}`}
                onClick={() => markCell(number)}
                aria-pressed={isMarked}
                aria-label={`${selectedPlayer.name} board number ${number}${isMarked ? ', registered' : ''}`}
              >
                <span>{number}</span>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<BingoApp />);
