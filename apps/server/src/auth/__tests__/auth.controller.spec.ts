import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { UserAuthGuard } from '../auth.guard';

describe('AuthController', () => {
  let app: INestApplication;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    getAuthUser: jest.fn(),
    updateProfile: jest.fn(),
    logout: jest.fn(),
    validateToken: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    })
      .overrideGuard(UserAuthGuard)
      .useValue({
        canActivate: (ctx: any) => {
          const req = ctx.switchToHttp().getRequest();
          req.persistentId = 'pid-1';
          req.authToken = 'tok';
          return true;
        },
      })
      .compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // POST /api/auth/register
  // ---------------------------------------------------------------------------
  describe('POST /api/auth/register', () => {
    it('returns 201 on success', async () => {
      mockAuthService.register.mockResolvedValue({
        token: 'tok',
        user: { username: 'alice', nickname: 'Alice', persistentId: 'pid-1' },
      });

      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ username: 'alice', password: 'password123', nickname: 'Alice' })
        .expect(HttpStatus.CREATED);

      expect(res.body.token).toBe('tok');
      expect(res.body.user.username).toBe('alice');
    });

    it('returns 400 on validation error', async () => {
      mockAuthService.register.mockRejectedValue(new Error('Password must be 6-100 characters'));

      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ username: 'alice', password: 'x', nickname: 'A' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(res.body.message).toMatch(/Password must be 6-100/);
    });

    it('returns 409 when username already taken', async () => {
      mockAuthService.register.mockRejectedValue(new Error('Username already taken'));

      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ username: 'alice', password: 'password123', nickname: 'Alice' })
        .expect(HttpStatus.CONFLICT);

      expect(res.body.message).toBe('Username already taken');
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/auth/login
  // ---------------------------------------------------------------------------
  describe('POST /api/auth/login', () => {
    it('returns 200 on success', async () => {
      mockAuthService.login.mockResolvedValue({
        token: 'tok',
        user: { username: 'alice', nickname: 'Alice', persistentId: 'pid-1' },
      });

      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: 'alice', password: 'password123' })
        .expect(HttpStatus.OK);

      expect(res.body.token).toBe('tok');
    });

    it('returns 401 on invalid credentials', async () => {
      mockAuthService.login.mockRejectedValue(new Error('Invalid username or password'));

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: 'alice', password: 'wrong' })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/auth/me
  // ---------------------------------------------------------------------------
  describe('GET /api/auth/me', () => {
    it('returns 200 with the user', async () => {
      mockAuthService.getAuthUser.mockResolvedValue({
        username: 'alice',
        nickname: 'Alice',
        persistentId: 'pid-1',
        avatar: 'av',
        country: 'US',
        birthYear: 1990,
      });

      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .expect(HttpStatus.OK);

      expect(res.body.username).toBe('alice');
      expect(mockAuthService.getAuthUser).toHaveBeenCalledWith('pid-1');
    });

    it('returns 404 when user not found', async () => {
      mockAuthService.getAuthUser.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/api/auth/me')
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  // ---------------------------------------------------------------------------
  // PUT /api/auth/profile
  // ---------------------------------------------------------------------------
  describe('PUT /api/auth/profile', () => {
    it('returns the updated user on success', async () => {
      mockAuthService.updateProfile.mockResolvedValue({
        username: 'alice',
        nickname: 'NewNick',
        persistentId: 'pid-1',
        avatar: 'av',
        country: 'US',
        birthYear: 1990,
      });

      const res = await request(app.getHttpServer())
        .put('/api/auth/profile')
        .send({ nickname: 'NewNick' })
        .expect(HttpStatus.OK);

      expect(res.body.nickname).toBe('NewNick');
      expect(mockAuthService.updateProfile).toHaveBeenCalledWith('pid-1', { nickname: 'NewNick' });
    });

    it('returns 404 when user not found', async () => {
      mockAuthService.updateProfile.mockResolvedValue(null);

      await request(app.getHttpServer())
        .put('/api/auth/profile')
        .send({ nickname: 'NewNick' })
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/auth/logout
  // ---------------------------------------------------------------------------
  describe('POST /api/auth/logout', () => {
    it('returns 204 and calls logout', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .expect(HttpStatus.NO_CONTENT);

      expect(mockAuthService.logout).toHaveBeenCalledWith('tok');
    });
  });

  // ---------------------------------------------------------------------------
  // Rate limiting (module-level state in controller)
  // ---------------------------------------------------------------------------
  describe('rate limiting', () => {
    it('eventually blocks the IP with 429 after repeated failed login attempts', async () => {
      mockAuthService.login.mockRejectedValue(new Error('Invalid username or password'));

      // Earlier tests in this file may have already incremented the
      // module-level rate-limit counter for this IP. Loop until we get 429.
      let got429 = false;
      let saw401 = false;
      for (let i = 0; i < 15; i++) {
        const res = await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({ username: 'rate-test', password: 'wrong' });
        if (res.status === HttpStatus.TOO_MANY_REQUESTS) {
          got429 = true;
          break;
        }
        if (res.status === HttpStatus.UNAUTHORIZED) {
          saw401 = true;
        }
      }

      expect(saw401).toBe(true);
      expect(got429).toBe(true);
    });
  });
});
