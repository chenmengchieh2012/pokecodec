// 環境前綴：開發環境使用 'dev-'，生產環境使用空字串
let ENV_PREFIX = 'dev-';

export const setGlobalStateEnvPrefix = (isProduction: boolean) => {
    ENV_PREFIX = isProduction ? '' : 'dev-';
};

const GlobalStateKey = {
    get BAG_DATA() { return `${ENV_PREFIX}pokemon-bag-data`; },
    get USER_DATA() { return `${ENV_PREFIX}pokemon-user-data`; },
    get PARTY_DATA() { return `${ENV_PREFIX}pokemon-party-data`; },
    get BOX_DATA() { return `${ENV_PREFIX}pokemon-box-data`; },
    get CURRENT_BOX_INDEX() { return `${ENV_PREFIX}pokemon-current-box-index`; },
    get GAME_STATE() { return `${ENV_PREFIX}pokemon-game-state`; },
    get POKEDEX_DATA_BASE() { return `${ENV_PREFIX}pokemon-pokedex-data`; },
    get POKEDEX_CURRENT_GEN() { return `${ENV_PREFIX}pokemon-pokedex-current-gen`; },
    get ACHIEVEMENT() { return `${ENV_PREFIX}pokemon-achievement-data`; },
    get SESSION_LOCK() { return `${ENV_PREFIX}pokemon-session-lock`; },
    get DEVICE_BIND_STATE() { return `${ENV_PREFIX}pokemon-device-bind-state`; },
    get HAS_MIGRATED_TO_002() { return `${ENV_PREFIX}hasMigratedTo002`; },
    get EXTENSION_VERSION() { return `${ENV_PREFIX}extensionVersion`; },
    get IS_FIRST_RUN() { return `${ENV_PREFIX}isFirstRun`; },
};

export default GlobalStateKey;