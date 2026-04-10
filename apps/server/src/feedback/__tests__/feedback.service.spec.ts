import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { FeedbackService } from '../feedback.service';
import { FeedbackDoc } from '../../database/schemas/feedback.schema';

describe('FeedbackService', () => {
  let service: FeedbackService;
  let mockModel: any;

  beforeEach(async () => {
    mockModel = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      countDocuments: jest.fn(),
      deleteOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackService,
        { provide: getModelToken(FeedbackDoc.name), useValue: mockModel },
      ],
    }).compile();

    service = module.get<FeedbackService>(FeedbackService);
  });

  describe('createFeedback', () => {
    it('creates a feedback with trimmed message and default category', async () => {
      mockModel.create.mockResolvedValue({ _id: 'id1', message: 'Hello', category: 'feedback' });

      const doc = await service.createFeedback({
        message: '  Hello  ',
      });

      expect(mockModel.create).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Hello',
        category: 'feedback',
        status: 'open',
      }));
      expect(doc).toBeDefined();
    });

    it('accepts a valid category', async () => {
      mockModel.create.mockResolvedValue({ _id: 'id1' });
      await service.createFeedback({ message: 'bug!', category: 'bug' });
      expect(mockModel.create.mock.calls[0][0].category).toBe('bug');
    });

    it('falls back to "feedback" for invalid category', async () => {
      mockModel.create.mockResolvedValue({ _id: 'id1' });
      await service.createFeedback({ message: 'hi', category: 'nonsense' as any });
      expect(mockModel.create.mock.calls[0][0].category).toBe('feedback');
    });

    it('captures submitter info when provided', async () => {
      mockModel.create.mockResolvedValue({ _id: 'id1' });
      await service.createFeedback({
        message: 'hi',
        submitter: { persistentId: 'p1', username: 'alice', nickname: 'Alice' },
        pageUrl: 'http://x/',
        userAgent: 'TestAgent',
      });
      const payload = mockModel.create.mock.calls[0][0];
      expect(payload.submitterPersistentId).toBe('p1');
      expect(payload.submitterUsername).toBe('alice');
      expect(payload.submitterNickname).toBe('Alice');
      expect(payload.pageUrl).toBe('http://x/');
      expect(payload.userAgent).toBe('TestAgent');
    });

    it('rejects empty message', async () => {
      await expect(service.createFeedback({ message: '' })).rejects.toThrow(
        'Feedback message must be 1-2000 characters.',
      );
    });

    it('rejects whitespace-only message', async () => {
      await expect(service.createFeedback({ message: '     ' })).rejects.toThrow(
        'Feedback message must be 1-2000 characters.',
      );
    });

    it('rejects message longer than 2000 chars', async () => {
      await expect(
        service.createFeedback({ message: 'x'.repeat(2001) }),
      ).rejects.toThrow('Feedback message must be 1-2000 characters.');
    });
  });

  describe('getFeedback', () => {
    it('paginates with filters', async () => {
      const execFn = jest.fn().mockResolvedValue([{ _id: 'f1' }]);
      const leanFn = jest.fn().mockReturnValue({ exec: execFn });
      const limitFn = jest.fn().mockReturnValue({ lean: leanFn });
      const skipFn = jest.fn().mockReturnValue({ limit: limitFn });
      const sortFn = jest.fn().mockReturnValue({ skip: skipFn });
      mockModel.find.mockReturnValue({ sort: sortFn });
      mockModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(15) });

      const res = await service.getFeedback({ page: 1, limit: 10, status: 'open', category: 'bug' });

      expect(mockModel.find).toHaveBeenCalledWith({ status: 'open', category: 'bug' });
      expect(res.feedback).toEqual([{ _id: 'f1' }]);
      expect(res.pagination.total).toBe(15);
      expect(res.pagination.totalPages).toBe(2);
    });

    it('ignores invalid filter values', async () => {
      const execFn = jest.fn().mockResolvedValue([]);
      const leanFn = jest.fn().mockReturnValue({ exec: execFn });
      const limitFn = jest.fn().mockReturnValue({ lean: leanFn });
      const skipFn = jest.fn().mockReturnValue({ limit: limitFn });
      const sortFn = jest.fn().mockReturnValue({ skip: skipFn });
      mockModel.find.mockReturnValue({ sort: sortFn });
      mockModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });

      await service.getFeedback({ status: 'bogus', category: 'nope' });

      expect(mockModel.find).toHaveBeenCalledWith({});
    });
  });

  describe('updateFeedback', () => {
    it('updates status and adminNotes', async () => {
      const execFn = jest.fn().mockResolvedValue({ _id: 'f1', status: 'resolved' });
      const leanFn = jest.fn().mockReturnValue({ exec: execFn });
      mockModel.findByIdAndUpdate.mockReturnValue({ lean: leanFn });

      const res = await service.updateFeedback('f1', {
        status: 'resolved',
        adminNotes: 'Fixed in v1.2',
      });

      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'f1',
        { $set: { status: 'resolved', adminNotes: 'Fixed in v1.2' } },
        { new: true },
      );
      expect(res).toEqual({ _id: 'f1', status: 'resolved' });
    });

    it('rejects invalid status', async () => {
      await expect(
        service.updateFeedback('f1', { status: 'bogus' as any }),
      ).rejects.toThrow('Invalid status.');
    });

    it('clears adminNotes when empty string provided', async () => {
      const execFn = jest.fn().mockResolvedValue({ _id: 'f1' });
      const leanFn = jest.fn().mockReturnValue({ exec: execFn });
      mockModel.findByIdAndUpdate.mockReturnValue({ lean: leanFn });

      await service.updateFeedback('f1', { adminNotes: '' });
      const setArg = mockModel.findByIdAndUpdate.mock.calls[0][1].$set;
      expect(setArg.adminNotes).toBeNull();
    });
  });

  describe('deleteFeedback', () => {
    it('returns true when deletedCount > 0', async () => {
      mockModel.deleteOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ deletedCount: 1 }) });
      const ok = await service.deleteFeedback('f1');
      expect(ok).toBe(true);
    });

    it('returns false when nothing was deleted', async () => {
      mockModel.deleteOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ deletedCount: 0 }) });
      const ok = await service.deleteFeedback('f1');
      expect(ok).toBe(false);
    });

    it('returns false on error', async () => {
      mockModel.deleteOne.mockImplementation(() => { throw new Error('bad id'); });
      const ok = await service.deleteFeedback('bad');
      expect(ok).toBe(false);
    });
  });
});
