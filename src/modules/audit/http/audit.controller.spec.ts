import { AuditController } from './audit.controller';
import { ListAuditLogsUseCase } from '../use-cases/list-audit-logs.use-case';
import type { WorkspaceContext } from '@shared/types/workspace-context.type';

describe('AuditController', () => {
  let listAuditLogs: jest.Mocked<ListAuditLogsUseCase>;
  let controller: AuditController;

  const workspace = { id: 'w1' } as WorkspaceContext;

  beforeEach(() => {
    listAuditLogs = {
      execute: jest.fn().mockResolvedValue({ data: [], meta: {} }),
    } as unknown as jest.Mocked<ListAuditLogsUseCase>;
    controller = new AuditController(listAuditLogs);
  });

  it('forwards filters and parses date strings', async () => {
    await controller.list(workspace, {
      userId: 'u1',
      action: 'user.created',
      from: '2026-01-01T00:00:00Z',
      to: '2026-01-31T23:59:59Z',
      page: 2,
      limit: 25,
    });

    expect(listAuditLogs.execute).toHaveBeenCalledWith({
      workspaceId: 'w1',
      userId: 'u1',
      action: 'user.created',
      from: new Date('2026-01-01T00:00:00Z'),
      to: new Date('2026-01-31T23:59:59Z'),
      page: 2,
      limit: 25,
    });
  });

  it('passes undefined dates when not provided', async () => {
    await controller.list(workspace, {
      page: 1,
      limit: 10,
    });

    const arg = listAuditLogs.execute.mock.calls[0][0];
    expect(arg.from).toBeUndefined();
    expect(arg.to).toBeUndefined();
  });
});
