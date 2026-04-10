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
  mockTokenModel.deleteMany = jest.fn();
  mockProfileModel.deleteOne = jest.fn();
  mockProfileModel.updateOne = jest.fn();

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

    it('rejects soft-deleted users with the generic invalid credentials error', async () => {
      mockProfileModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          persistentId: 'pid-1',
          username: 'alice',
          passwordHash: 'hashed',
          deletedAt: new Date(),
        }),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.login({ username: 'alice', password: 'password123' } as any),
      ).rejects.toThrow(/Invalid username or password/);
    });
  });

  // ---------------------------------------------------------------------------
  // validateToken
  // ---------------------------------------------------------------------------
  describe('validateToken', () => {
    /** Helper: returns a chainable mock for profileModel.findOne().select().lean().exec(). */
    function mockProfileFindOneSelectLean(result: any) {
      const exec = jest.fn().mockResolvedValue(result);
      const lean = jest.fn().mockReturnValue({ exec });
      const select = jest.fn().mockReturnValue({ lean });
      mockProfileModel.findOne.mockReturnValue({ select });
    }

    it('returns persistentId for a valid token belonging to an active user', async () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60);
      mockTokenModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          token: 'tok',
          persistentId: 'pid-1',
          expiresAt: futureDate,
        }),
      });
      mockProfileFindOneSelectLean({ deletedAt: null });

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

    it('returns null when the owning profile is soft-deleted', async () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60);
      mockTokenModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          token: 'tok',
          persistentId: 'pid-1',
          expiresAt: futureDate,
        }),
      });
      mockProfileFindOneSelectLean({ deletedAt: new Date() });

      const result = await service.validateToken('tok');
      expect(result).toBeNull();
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
        isAdmin: false,
      });
    });

    it('returns isAdmin: true when the profile has isAdmin flag set', async () => {
      mockProfileModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          persistentId: 'pid-2',
          username: 'admin',
          nickname: 'Admin',
          avatar: 'av',
          country: 'US',
          birthYear: 1990,
          isAdmin: true,
        }),
      });

      const result = await service.getAuthUser('pid-2');
      expect(result?.isAdmin).toBe(true);
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

    it('returns null when the profile is soft-deleted', async () => {
      mockProfileModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          persistentId: 'pid-1',
          username: 'alice',
          nickname: 'Alice',
          avatar: '',
          deletedAt: new Date(),
        }),
      });
      const result = await service.getAuthUser('pid-1');
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

  // ---------------------------------------------------------------------------
  // resetUserPassword (admin action)
  // ---------------------------------------------------------------------------
  describe('resetUserPassword', () => {
    function mockFindProfile(profile: any) {
      mockProfileModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(profile) });
    }

    beforeEach(() => {
      mockTokenModel.deleteMany.mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });
    });

    it('updates the password hash and invalidates all tokens', async () => {
      const profile: any = {
        persistentId: 'pid-1',
        username: 'alice',
        passwordHash: 'old-hash',
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockFindProfile(profile);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');

      await service.resetUserPassword('pid-1', 'NewPass99');

      expect(bcrypt.hash).toHaveBeenCalledWith('NewPass99', 10);
      expect(profile.passwordHash).toBe('new-hash');
      expect(profile.save).toHaveBeenCalled();
      expect(mockTokenModel.deleteMany).toHaveBeenCalledWith({ persistentId: 'pid-1' });
    });

    it('throws when the password is too short', async () => {
      await expect(service.resetUserPassword('pid-1', 'abc')).rejects.toThrow(
        'Password must be 6-100 characters',
      );
    });

    it('throws when the password is too long', async () => {
      await expect(service.resetUserPassword('pid-1', 'x'.repeat(101))).rejects.toThrow(
        'Password must be 6-100 characters',
      );
    });

    it('throws when the profile is not found', async () => {
      mockFindProfile(null);
      await expect(service.resetUserPassword('missing', 'Good1234')).rejects.toThrow(
        'User not found',
      );
    });

    it('throws when the profile is anonymous (no username)', async () => {
      mockFindProfile({
        persistentId: 'pid-1',
        passwordHash: undefined,
        save: jest.fn(),
      });
      await expect(service.resetUserPassword('pid-1', 'Good1234')).rejects.toThrow(
        'Cannot reset password for an anonymous (unregistered) profile',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // deleteUserAccount (admin action — soft delete)
  // ---------------------------------------------------------------------------
  describe('deleteUserAccount', () => {
    it('soft-deletes the profile by setting deletedAt and invalidates tokens', async () => {
      const profileExec = jest.fn().mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
      const tokenExec = jest.fn().mockResolvedValue({ deletedCount: 3 });
      mockProfileModel.updateOne.mockReturnValue({ exec: profileExec });
      mockTokenModel.deleteMany.mockReturnValue({ exec: tokenExec });

      const ok = await service.deleteUserAccount('pid-1');

      expect(ok).toBe(true);
      expect(mockProfileModel.updateOne).toHaveBeenCalledWith(
        { persistentId: 'pid-1', deletedAt: null },
        { $set: { deletedAt: expect.any(Date) } },
      );
      expect(mockTokenModel.deleteMany).toHaveBeenCalledWith({ persistentId: 'pid-1' });
      expect(profileExec).toHaveBeenCalled();
      expect(tokenExec).toHaveBeenCalled();
    });

    it('returns false when no active profile is matched (already deleted or missing)', async () => {
      mockProfileModel.updateOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ matchedCount: 0, modifiedCount: 0 }),
      });

      const ok = await service.deleteUserAccount('ghost');
      expect(ok).toBe(false);
      // Tokens must NOT be cleared when nothing was deleted.
      expect(mockTokenModel.deleteMany).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // undeleteUserAccount (admin action — restore)
  // ---------------------------------------------------------------------------
  describe('undeleteUserAccount', () => {
    it('clears the deletedAt field and returns true on match', async () => {
      mockProfileModel.updateOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ matchedCount: 1, modifiedCount: 1 }),
      });

      const ok = await service.undeleteUserAccount('pid-1');
      expect(ok).toBe(true);
      expect(mockProfileModel.updateOne).toHaveBeenCalledWith(
        { persistentId: 'pid-1', deletedAt: { $ne: null } },
        { $set: { deletedAt: null } },
      );
    });

    it('returns false when no matching deleted profile exists', async () => {
      mockProfileModel.updateOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ matchedCount: 0, modifiedCount: 0 }),
      });

      const ok = await service.undeleteUserAccount('pid-1');
      expect(ok).toBe(false);
    });
  });
});
