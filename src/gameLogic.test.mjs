import assert from 'node:assert/strict';
import test from 'node:test';
import {
  boardCellCount,
  canRecordDraw,
  createDefaultGame,
  DEFAULT_CONFIG,
  locationHint,
  normalizeConfig,
  normalizeGame,
  parseDraw,
  randomBoard,
  validateConfig,
} from './gameLogic.js';

test('creates a default game with default config and three 5x5 unique boards', () => {
  const game = createDefaultGame();
  assert.deepEqual(game.config, DEFAULT_CONFIG);
  assert.equal(game.players.length, 3);
  for (const player of game.players) {
    assert.equal(player.board.length, 25);
    assert.equal(new Set(player.board).size, 25);
    assert.ok(player.board.every((number) => number >= 1 && number <= 99));
  }
  assert.equal(game.selectedPlayerId, game.players[0].id);
});

test('board size changes produce the configured board length', () => {
  const config = normalizeConfig({ boardSize: 4, maxNumber: 75, defaultPlayerCount: 2 });
  const game = createDefaultGame(config);
  assert.equal(boardCellCount(config), 16);
  assert.equal(game.players.length, 2);
  assert.ok(game.players.every((player) => player.board.length === 16));
});

test('randomBoard uses configured max number and unique cell count', () => {
  const board = randomBoard({ boardSize: 3, maxNumber: 30 }, () => 0.42);
  assert.equal(board.length, 9);
  assert.equal(new Set(board).size, 9);
  assert.ok(board.every((number) => number >= 1 && number <= 30));
});

test('validateConfig rejects impossible board configurations', () => {
  const result = validateConfig({
    boardSize: 7,
    maxNumber: 48,
    defaultPlayerCount: 3,
    blockDuplicateDraws: true,
    autoHintLatestDraw: true,
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes('at least 49')));
});

test('parseDraw respects configured max number', () => {
  const config = normalizeConfig({ maxNumber: 75 });
  assert.deepEqual(parseDraw('75', config), { ok: true, value: 75 });
  assert.equal(parseDraw('76', config).ok, false);
  assert.equal(parseDraw('0', config).ok, false);
  assert.equal(parseDraw('4.2', config).ok, false);
});

test('duplicate draw behavior follows config', () => {
  assert.equal(canRecordDraw([42], 42, { blockDuplicateDraws: true }).ok, false);
  assert.equal(canRecordDraw([42], 42, { blockDuplicateDraws: false }).ok, true);
});

test('locationHint uses configured board size', () => {
  const board = Array.from({ length: 16 }, (_, index) => index + 1);
  assert.deepEqual(locationHint(board, 11, { boardSize: 4 }), { index: 10, row: 3, column: 3 });
  assert.equal(locationHint(board, 42, { boardSize: 4 }), null);
});

test('normalizeGame migrates saved games without config to defaults', () => {
  const game = normalizeGame({
    players: [{ id: 'one', name: 'One', board: Array.from({ length: 25 }, (_, index) => index + 1), marked: [1] }],
    selectedPlayerId: 'one',
    drawHistory: [1],
  });
  assert.deepEqual(game.config, DEFAULT_CONFIG);
  assert.equal(game.players[0].marked.length, 1);
  assert.equal(game.version, 2);
});
