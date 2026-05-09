import { WorkspacesController } from './workspaces.controller';
import { GetWorkspaceUseCase } from '../use-cases/get-workspace.use-case';
import { ListWorkspacesUseCase } from '../use-cases/list-workspaces.use-case';
import { UpdateWorkspaceUseCase } from '../use-cases/update-workspace.use-case';
import { DeleteWorkspaceUseCase } from '../use-cases/delete-workspace.use-case';
import { WorkspaceResponseDto } from './dto/workspace-response.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import type { WorkspaceContext } from '@shared/types/workspace-context.type';
import type { AuthenticatedUser } from '@shared/types/authenticated-user.type';

describe('WorkspacesController', () => {
  const workspace = { id: 'w1' } as WorkspaceContext;
  const currentUser: AuthenticatedUser = { id: 'u1' };

  const workspaceDto: WorkspaceResponseDto = {
    id: 'w1',
    name: 'Acme',
    slug: 'acme',
    isPersonal: false,
    ownerId: 'u1',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  let getWorkspace: jest.Mocked<GetWorkspaceUseCase>;
  let listWorkspaces: jest.Mocked<ListWorkspacesUseCase>;
  let updateWorkspace: jest.Mocked<UpdateWorkspaceUseCase>;
  let deleteWorkspace: jest.Mocked<DeleteWorkspaceUseCase>;
  let controller: WorkspacesController;

  beforeEach(() => {
    getWorkspace = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetWorkspaceUseCase>;
    listWorkspaces = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ListWorkspacesUseCase>;
    updateWorkspace = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<UpdateWorkspaceUseCase>;
    deleteWorkspace = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<DeleteWorkspaceUseCase>;
    controller = new WorkspacesController(
      getWorkspace,
      listWorkspaces,
      updateWorkspace,
      deleteWorkspace,
    );
  });

  it('list passes the current user id to ListWorkspacesUseCase', async () => {
    listWorkspaces.execute.mockResolvedValue([workspaceDto]);

    const result = await controller.list(currentUser);

    expect(listWorkspaces.execute).toHaveBeenCalledWith('u1');
    expect(result).toEqual([workspaceDto]);
  });

  it('findOne resolves the workspace from the request context', async () => {
    getWorkspace.execute.mockResolvedValue(workspaceDto);

    const result = await controller.findOne(workspace);

    expect(getWorkspace.execute).toHaveBeenCalledWith('w1');
    expect(result).toBe(workspaceDto);
  });

  it('update forwards id and name to UpdateWorkspaceUseCase', async () => {
    const dto: UpdateWorkspaceDto = { name: 'Acme Inc.' };
    updateWorkspace.execute.mockResolvedValue({
      ...workspaceDto,
      name: 'Acme Inc.',
    });

    await controller.update(dto, workspace);

    expect(updateWorkspace.execute).toHaveBeenCalledWith({
      id: 'w1',
      name: 'Acme Inc.',
    });
  });

  it('remove delegates to DeleteWorkspaceUseCase with the workspace id', async () => {
    deleteWorkspace.execute.mockResolvedValue(undefined);

    await controller.remove(workspace);

    expect(deleteWorkspace.execute).toHaveBeenCalledWith('w1');
  });
});
