export const MIN_NUMBER = 1;

export const DEFAULT_CONFIG = {
  maxNumber: 99,
  boardSize: 5,
  defaultPlayerCount: 3,
  blockDuplicateDraws: true,
  autoHintLatestDraw: true,
};

export const CONFIG_LIMITS = {
  maxNumber: { min: 25, max: 999 },
  boardSize: { min: 3, max: 7 },
  defaultPlayerCount: { min: 1, max: 12 },
};

function toInteger(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function normalizeConfig(config = {}) {
  const boardSize = clamp(
    toInteger(config.boardSize, DEFAULT_CONFIG.boardSize),
    CONFIG_LIMITS.boardSize.min,
    CONFIG_LIMITS.boardSize.max,
  );
  const minimumMaxNumber = Math.max(CONFIG_LIMITS.maxNumber.min, boardSize * boardSize);
  const maxNumber = clamp(
    Math.max(toInteger(config.maxNumber, DEFAULT_CONFIG.maxNumber), minimumMaxNumber),
    CONFIG_LIMITS.maxNumber.min,
    CONFIG_LIMITS.maxNumber.max,
  );

  return {
    maxNumber,
    boardSize,
    defaultPlayerCount: clamp(
      toInteger(config.defaultPlayerCount, DEFAULT_CONFIG.defaultPlayerCount),
      CONFIG_LIMITS.defaultPlayerCount.min,
      CONFIG_LIMITS.defaultPlayerCount.max,
    ),
    blockDuplicateDraws: config.blockDuplicateDraws ?? DEFAULT_CONFIG.blockDuplicateDraws,
    autoHintLatestDraw: config.autoHintLatestDraw ?? DEFAULT_CONFIG.autoHintLatestDraw,
  };
}

export function validateConfig(config) {
  const maxNumber = Number(config.maxNumber);
  const boardSize = Number(config.boardSize);
  const defaultPlayerCount = Number(config.defaultPlayerCount);
  const errors = [];

  if (!Number.isInteger(maxNumber) || maxNumber < CONFIG_LIMITS.maxNumber.min || maxNumber > CONFIG_LIMITS.maxNumber.max) {
    errors.push(`Max number must be a whole number from ${CONFIG_LIMITS.maxNumber.min} to ${CONFIG_LIMITS.maxNumber.max}.`);
  }

  if (!Number.isInteger(boardSize) || boardSize < CONFIG_LIMITS.boardSize.min || boardSize > CONFIG_LIMITS.boardSize.max) {
    errors.push(`Board size must be a whole number from ${CONFIG_LIMITS.boardSize.min} to ${CONFIG_LIMITS.boardSize.max}.`);
  }

  if (Number.isInteger(maxNumber) && Number.isInteger(boardSize) && maxNumber < boardSize * boardSize) {
    errors.push(`Max number must be at least ${boardSize * boardSize} for a ${boardSize}x${boardSize} board.`);
  }

  if (
    !Number.isInteger(defaultPlayerCount)
    || defaultPlayerCount < CONFIG_LIMITS.defaultPlayerCount.min
    || defaultPlayerCount > CONFIG_LIMITS.defaultPlayerCount.max
  ) {
    errors.push(
      `Default player count must be a whole number from ${CONFIG_LIMITS.defaultPlayerCount.min} to ${CONFIG_LIMITS.defaultPlayerCount.max}.`,
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    config: {
      maxNumber,
      boardSize,
      defaultPlayerCount,
      blockDuplicateDraws: Boolean(config.blockDuplicateDraws),
      autoHintLatestDraw: Boolean(config.autoHintLatestDraw),
    },
  };
}

export function boardCellCount(config = DEFAULT_CONFIG) {
  const normalized = normalizeConfig(config);
  return normalized.boardSize * normalized.boardSize;
}

export function randomBoard(config = DEFAULT_CONFIG, rng = Math.random) {
  const normalized = normalizeConfig(config);
  const pool = Array.from({ length: normalized.maxNumber }, (_, index) => index + 1);
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }
  return pool.slice(0, boardCellCount(normalized));
}

export function createPlayer(index, config = DEFAULT_CONFIG, rng = Math.random) {
  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${index}-${rng()}`;
  return {
    id,
    name: `Player ${index}`,
    board: randomBoard(config, rng),
    marked: [],
  };
}

export function createDefaultGame(config = DEFAULT_CONFIG, rng = Math.random) {
  const normalizedConfig = normalizeConfig(config);
  const players = Array.from(
    { length: normalizedConfig.defaultPlayerCount },
    (_, index) => createPlayer(index + 1, normalizedConfig, rng),
  );
  return {
    version: 2,
    config: normalizedConfig,
    players,
    selectedPlayerId: players[0]?.id ?? '',
    drawHistory: [],
    message: {
      type: 'info',
      text: 'Enter the latest draw, then tap that number on each player board.',
    },
  };
}

export function normalizeGame(game) {
  const config = normalizeConfig(game?.config);
  const fallback = createDefaultGame(config);
  const expectedBoardLength = boardCellCount(config);
  const players = Array.isArray(game?.players) && game.players.length > 0 ? game.players : fallback.players;
  const normalizedPlayers = players.map((player, index) => {
    const board = Array.isArray(player.board) && player.board.length === expectedBoardLength
      ? player.board
      : randomBoard(config);
    return {
      id: player.id || `player-${index + 1}`,
      name: player.name || `Player ${index + 1}`,
      board,
      marked: Array.isArray(player.marked)
        ? player.marked.filter((number) => board.includes(number))
        : [],
    };
  });
  const selectedPlayerId = normalizedPlayers.some((player) => player.id === game?.selectedPlayerId)
    ? game.selectedPlayerId
    : normalizedPlayers[0].id;

  return {
    version: 2,
    config,
    players: normalizedPlayers,
    selectedPlayerId,
    drawHistory: Array.isArray(game?.drawHistory)
      ? game.drawHistory.filter((number) => Number.isInteger(number) && number >= MIN_NUMBER && number <= config.maxNumber)
      : [],
    message: game?.message || fallback.message,
  };
}

export function parseDraw(input, config = DEFAULT_CONFIG) {
  const normalized = normalizeConfig(config);
  const value = Number(input);
  if (!Number.isInteger(value) || value < MIN_NUMBER || value > normalized.maxNumber) {
    return { ok: false, message: `Draw must be a whole number from 1 to ${normalized.maxNumber}.` };
  }
  return { ok: true, value };
}

export function canRecordDraw(drawHistory, value, config = DEFAULT_CONFIG) {
  const normalized = normalizeConfig(config);
  if (normalized.blockDuplicateDraws && drawHistory.includes(value)) {
    return { ok: false, message: `${value} was already drawn. Duplicate draws are blocked.` };
  }
  return { ok: true };
}

export function locationHint(board, number, config = DEFAULT_CONFIG) {
  const normalized = normalizeConfig(config);
  const index = board.indexOf(number);
  if (index < 0) return null;
  return {
    index,
    row: Math.floor(index / normalized.boardSize) + 1,
    column: (index % normalized.boardSize) + 1,
  };
}
