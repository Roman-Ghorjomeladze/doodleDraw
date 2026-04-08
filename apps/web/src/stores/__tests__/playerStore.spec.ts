import { describe, it, expect, beforeEach } from 'vitest';
import { usePlayerStore } from '@/stores/playerStore';
import type { AuthUser } from '@doodledraw/shared';

describe('playerStore', () => {
  beforeEach(() => {
    localStorage.clear();
    usePlayerStore.setState({
      nickname: '',
      avatar: 'adventurer:seed-1',
      playerId: null,
      isSpectator: false,
    });
  });

  it('has a non-empty persistentId on initial state', () => {
    const state = usePlayerStore.getState();
    expect(typeof state.persistentId).toBe('string');
    expect(state.persistentId.length).toBeGreaterThan(0);
  });

  it('starts with empty nickname, null playerId, not spectator', () => {
    const state = usePlayerStore.getState();
    expect(state.nickname).toBe('');
    expect(state.playerId).toBeNull();
    expect(state.isSpectator).toBe(false);
  });

  it('setNickname updates nickname', () => {
    usePlayerStore.getState().setNickname('Alice');
    expect(usePlayerStore.getState().nickname).toBe('Alice');
  });

  it('setAvatar updates avatar', () => {
    usePlayerStore.getState().setAvatar('adventurer:zelda');
    expect(usePlayerStore.getState().avatar).toBe('adventurer:zelda');
  });

  it('setPlayerId updates playerId', () => {
    usePlayerStore.getState().setPlayerId('socket-123');
    expect(usePlayerStore.getState().playerId).toBe('socket-123');
    usePlayerStore.getState().setPlayerId(null);
    expect(usePlayerStore.getState().playerId).toBeNull();
  });

  it('setIsSpectator toggles spectator flag', () => {
    usePlayerStore.getState().setIsSpectator(true);
    expect(usePlayerStore.getState().isSpectator).toBe(true);
    usePlayerStore.getState().setIsSpectator(false);
    expect(usePlayerStore.getState().isSpectator).toBe(false);
  });

  it('syncFromAuth copies nickname, avatar and persistentId from AuthUser', () => {
    const user: AuthUser = {
      username: 'alice',
      nickname: 'Alice',
      avatar: 'adventurer:elf',
      country: 'US',
      birthYear: 1990,
      persistentId: 'auth-pid-99',
    };

    usePlayerStore.getState().syncFromAuth(user);

    const state = usePlayerStore.getState();
    expect(state.nickname).toBe('Alice');
    expect(state.avatar).toBe('adventurer:elf');
    expect(state.persistentId).toBe('auth-pid-99');
  });

  it('persists state to localStorage under doodledraw-player', () => {
    usePlayerStore.getState().setNickname('Persisted');
    const raw = localStorage.getItem('doodledraw-player');
    expect(raw).toBeTruthy();
    expect(raw).toContain('Persisted');
  });
});
