import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AuthService } from '../auth.service';
import { ProfileDoc } from '../../database/schemas/profile.schema';
import { AuthTokenDoc } from '../../database/schemas/auth-token.schema';

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;

  // Profile model: callable constructor + static methods.
  const mockProfileModel: any = jest.fn().mockImplementation((data) => ({
    ...data,
    save: jest.fn().mockResolvedValue(undefined),
    markModified: jest.fn(),
  }));
  mockProfileModel.findOne = jest.fn();
  mockProfileModel.create = jest.fn();
  mockProfileModel.find = jest.fn();

  const mockTokenModel: any = jest.fn().mockImplementation((data) => ({
    ...data,
    save: jest.fn().mockResolvedValue(undefined),
  }));
  mockTokenModel.findOne = jest.fn();
  mockTokenModel.create = jest.fn();
  mockTokenModel.deleteOne = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();

    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getModelToken(ProfileDoc.name), useValue: mockProfileModel },
        { provide: getModelToken(AuthTokenDoc.name), useValue: mockTokenModel },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ---------------------------------------------------------------------------
  // register
  // ---------------------------------------------------------------------------
  describe('register', () => {
    it('successfully registers a new user with valid data', async () => {
      mockProfileModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      const created = {
        persistentId: 'pid-1',
        username: 'alice',
        nickname: 'Alice',
        avatar: 'av',
        country: 'US',
        birthYear: 1990,
      };
      mockProfileModel.create.mockResolvedValue(created);
      mockTokenModel.create.mockResolvedValue({});

      const result = await service.register({
        username: 'alice',
        password: 'password123',
        nickname: 'Alice',
        avatar: 'av',
        country: 'US',
        birthYear: 1990,
      } as any);

      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
      expect(result.user.username).toBe('alice');
      expect(result.user.nickname).toBe('Alice');
      expect(result.user.persistentId).toBe('pid-1');
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    });

    it('allows email format as username', async () => {
      mockProfileModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      mockProfileModel.create.mockResolvedValue({
        persistentId: 'pid-1',
        username: 'alice@example.com',
        nickname: 'Alice',
        avatar: 'av',
      });
      mockTokenModel.create.mockResolvedValue({});

      const result = await service.register({
        username: 'alice@example.com',
        password: 'password123',
        nickname: 'Alice',
        avatar: 'av',
      } as any);

      expect(result.user.username).toBe('alice@example.com');
    });

    it('throws on short username (<3 chars)', async () => {
      await expect(
        service.register({ username: 'al', password: 'password123', nickname: 'A', avatar: '' } as any),
      ).rejects.toThrow(/Username must be 3-20/);
    });

    it('throws on missing username', async () => {
      await expect(
        service.register({ username: '', password: 'password123', nickname: 'A', avatar: '' } as any),
      ).rejects.toThrow(/Username must be 3-20/);
    });

    it('throws on bad password (too short)', async () => {
      await expect(
        service.register({ username: 'alice', password: 'short', nickname: 'A', avatar: '' } as any),
      ).rejects.toThrow(/Password must be 6-100/);
    });

    it('throws on missing password', async () => {
      await expect(
        service.register({ username: 'alice', password: '', nickname: 'A', avatar: '' } as any),
      ).rejects.toThrow(/Password must be 6-100/);
    });

    it('throws when nickname is missing or empty', async () => {
      await expect(
        service.register({ username: 'alice', password: 'password123', nickname: '', avatar: '' } as any),
      ).rejects.toThrow(/Nickname must be 1-20/);
    });

    it('throws when nickname is too long', async () => {
      await expect(
        service.register({
          username: 'alice',
          password: 'password123',
          nickname: 'a'.repeat(21),
          avatar: '',
        } as any),
      ).rejects.toThrow(/Nickname must be 1-20/);
    });

    it('throws when username already taken', async () => {
      mockProfileModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ username: 'alice' }),
      });

      await expect(
        service.register({
          username: 'alice',
          password: 'password123',
          nickname: 'Alice',
          avatar: '',
        } as any),
      ).rejects.toThrow(/Username already taken/);
    });

    it('merges into anonymous profile when persistentId provided', async () => {
      const anonProfile = {
        persistentId: 'anon-1',
        username: undefined,
        nickname: 'Anon',
        avatar: '',
        save: jest.fn().mockResolvedValue(undefined),
      };

      // First findOne: username uniqueness check (none)
      // Second findOne: anonymous profile lookup (found)
      mockProfileModel.findOne
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) })
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(anonProfile) });

      mockTokenModel.create.mockResolvedValue({});

      const result = await service.register({
        username: 'alice',
        password: 'password123',
        nickname: 'Alice',
        avatar: 'av',
        persistentId: 'anon-1',
      } as any);

      expect(anonProfile.save).toHaveBeenCalled();
      expect(anonProfile.username).toBe('alice');
      expect(anonProfile.nickname).toBe('Alice');
      expect(result.user.username).toBe('alice');
      // create should NOT have been called since we merged the anon profile
      expect(mockProfileModel.create).not.toHaveBeenCalled();
    });

    it('ignores invalid country and birthYear silently', async () => {
      mockProfileModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      mockProfileModel.create.mockResolvedValue({
        persistentId: 'pid-1',
        username: 'alice',
        nickname: 'Alice',
        avatar: '',
      });
      mockTokenModel.create.mockResolvedValue({});

      await service.register({
        username: 'alice',
        password: 'password123',
        nickname: 'Alice',
        avatar: '',
        country: 'XX', // not in COUNTRIES
        birthYear: 1800, // out of range
      } as any);

      const createArgs = mockProfileModel.create.mock.calls[0][0];
      expect(createArgs.country).toBeUndefined();
      expect(createArgs.birthYear).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // login
  // ---------------------------------------------------------------------------
  describe('login', () => {
    it('logs in successfully with valid credentials', async () => {
      const profile = {
        persistentId: 'pid-1',
        username: 'alice',
        passwordHash: 'hashed',
        nickname: 'Alice',
        avatar: '',
      };
      mockProfileModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(profile) });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockTokenModel.create.mockResolvedValue({});

      const result = await service.login({ username: 'alice', password: 'password123' } as any);

      expect(result.token).toBeDefined();
      expect(result.user.username).toBe('alice');
    });

    it('throws on invalid username (not found)', async () => {
      mockProfileModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(
        service.login({ username: 'nobody', password: 'password123' } as any),
      ).rejects.toThrow(/Invalid username or password/);
    });

    it('throws when profile has no passwordHash', async () => {
      mockProfileModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ persistentId: 'p', username: 'alice' }),
      });

      await expect(
        service.login({ username: 'alice', password: 'password123' } as any),
      ).rejects.toThrow(/Invalid username or password/);
    });

    it('throws on invalid password', async () => {
      mockProfileModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          persistentId: 'p',
          username: 'alice',
          passwordHash: 'hashed',
        }),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ username: 'alice', password: 'wrong' } as any),
      ).rejects.toThrow(/Invalid username or password/);
    });

    it('throws when username is missing', async () => {
      await expect(service.login({ username: '', password: 'pw' } as any)).rejects.toThrow(
        /Username is required/,
      );
    });

    it('throws when password is missing', async () => {
      await expect(service.login({ username: 'alice', password: '' } as any)).rejects.toThrow(
        /Password is required/,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // validateToken
  // ---------------------------------------------------------------------------
  describe('validateToken', () => {
    it('returns persistentId for a valid token', async () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60);
      mockTokenModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          token: 'tok',
          persistentId: 'pid-1',
          expiresAt: futureDate,
        }),
      });

      const result = await service.validateToken('tok');
      expect(result).toBe('pid-1');
    });

    it('returns null for empty token', async () => {
      const result = await service.validateToken('');
      expect(result).toBeNull();
    });

    it('returns null when token does not exist', async () => {
      mockTokenModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      const result = await service.validateToken('missing');
      expect(result).toBeNull();
    });

    it('returns null and deletes expired tokens', async () => {
      const past = new Date(Date.now() - 1000);
      const deleteOne = jest.fn().mockResolvedValue(undefined);
      mockTokenModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          token: 'tok',
          persistentId: 'pid-1',
          expiresAt: past,
          deleteOne,
        }),
      });

      const result = await service.validateToken('tok');
      expect(result).toBeNull();
      expect(deleteOne).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // getAuthUser
  // ---------------------------------------------------------------------------
  describe('getAuthUser', () => {
    it('returns the user when found', async () => {
      mockProfileModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          persistentId: 'pid-1',
          username: 'alice',
          nickname: 'Alice',
          avatar: 'av',
          country: 'US',
          birthYear: 1990,
        }),
      });

      const result = await service.getAuthUser('pid-1');
      expect(result).toEqual({
        username: 'alice',
        nickname: 'Alice',
        avatar: 'av',
        country: 'US',
        birthYear: 1990,
        persistentId: 'pid-1',
      });
    });

    it('returns null when profile not found', async () => {
      mockProfileModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      const result = await service.getAuthUser('missing');
      expect(result).toBeNull();
    });

    it('returns null when profile has no username (anonymous)', async () => {
      mockProfileModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ persistentId: 'p' }),
      });
      const result = await service.getAuthUser('p');
      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // updateProfile
  // ---------------------------------------------------------------------------
  describe('updateProfile', () => {
    it('updates nickname, avatar, country and birthYear', async () => {
      const profile: any = {
        persistentId: 'pid-1',
        username: 'alice',
        nickname: 'old',
        avatar: 'old-av',
        country: 'US',
        birthYear: 1990,
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockProfileModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(profile) });

      const result = await service.updateProfile('pid-1', {
        nickname: 'NewNick',
        avatar: 'new-av',
        country: 'AU',
        birthYear: 1995,
      });

      expect(profile.nickname).toBe('NewNick');
      expect(profile.avatar).toBe('new-av');
      expect(profile.country).toBe('AU');
      expect(profile.birthYear).toBe(1995);
      expect(profile.save).toHaveBeenCalled();
      expect(result?.nickname).toBe('NewNick');
    });

    it('returns null when profile not found', async () => {
      mockProfileModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      const result = await service.updateProfile('missing', { nickname: 'X' });
      expect(result).toBeNull();
    });

    it('ignores invalid nickname (empty after trim)', async () => {
      const profile: any = {
        persistentId: 'pid-1',
        username: 'alice',
        nickname: 'old',
        avatar: '',
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockProfileModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(profile) });

      await service.updateProfile('pid-1', { nickname: '   ' });
      expect(profile.nickname).toBe('old');
    });

    it('ignores invalid country code', async () => {
      const profile: any = {
        persistentId: 'pid-1',
        username: 'alice',
        nickname: 'A',
        avatar: '',
        country: 'US',
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockProfileModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(profile) });

      await service.updateProfile('pid-1', { country: 'ZZZ' });
      expect(profile.country).toBe('US');
    });
  });

  // ---------------------------------------------------------------------------
  // logout
  // ---------------------------------------------------------------------------
  describe('logout', () => {
    it('deletes the token', async () => {
      const exec = jest.fn().mockResolvedValue({});
      mockTokenModel.deleteOne.mockReturnValue({ exec });

      await service.logout('tok');
      expect(mockTokenModel.deleteOne).toHaveBeenCalledWith({ token: 'tok' });
      expect(exec).toHaveBeenCalled();
    });
  });
});
