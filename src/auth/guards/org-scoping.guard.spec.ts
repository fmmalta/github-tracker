import { ForbiddenException } from '@nestjs/common';
import { OrgScopingGuard } from './org-scoping.guard';

function mockContext(request: any): any {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  };
}

describe('OrgScopingGuard', () => {
  it('allows manager repo-scoped request by deriving org from repository', async () => {
    const guard = new OrgScopingGuard(
      { findOne: jest.fn().mockResolvedValue({ id: 'org-assignment' }) } as any,
      { findOne: jest.fn() } as any,
      { findOne: jest.fn().mockResolvedValue({ id: 'repo-1', org_id: 'org-1' }) } as any,
    );

    const allowed = await guard.canActivate(
      mockContext({
        user: { id: 'user-1', role: 'manager' },
        params: { repoId: 'repo-1' },
        query: {},
      }),
    );

    expect(allowed).toBe(true);
  });

  it('denies when repo does not belong to provided org_id', async () => {
    const guard = new OrgScopingGuard(
      { findOne: jest.fn().mockResolvedValue({ id: 'org-assignment' }) } as any,
      { findOne: jest.fn() } as any,
      { findOne: jest.fn().mockResolvedValue({ id: 'repo-1', org_id: 'org-1' }) } as any,
    );

    await expect(
      guard.canActivate(
        mockContext({
          user: { id: 'user-1', role: 'manager' },
          params: { repoId: 'repo-1' },
          query: { org_id: 'org-2' },
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('denies viewer without explicit repo assignment', async () => {
    const guard = new OrgScopingGuard(
      { findOne: jest.fn().mockResolvedValue({ id: 'org-assignment' }) } as any,
      { findOne: jest.fn().mockResolvedValue(null) } as any,
      { findOne: jest.fn().mockResolvedValue({ id: 'repo-1', org_id: 'org-1' }) } as any,
    );

    await expect(
      guard.canActivate(
        mockContext({
          user: { id: 'viewer-1', role: 'viewer' },
          params: { repoId: 'repo-1' },
          query: {},
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
