import { describe, it, expect, beforeEach } from 'vitest';
import { mock, mockReset } from 'vitest-mock-extended';
import { LoginUseCase } from './LoginUseCase.js';
import type { AuthRepository } from '../../domain/auth/repository/AuthRepository.js';
import { AuthToken } from '../../domain/auth/value-object/AuthToken.js';

describe('LoginUseCase', () => {
  const repositoryMock = mock<AuthRepository>();
  let useCase: LoginUseCase;

  beforeEach(() => {
    mockReset(repositoryMock);
    useCase = new LoginUseCase(repositoryMock);
  });

  it('should authenticate a user and return an access token', async () => {
    const expectedToken = new AuthToken('eyJhbGciOiJIUzI1NiIsInR5cCI6Ikp...');
    repositoryMock.login.mockResolvedValue(expectedToken);

    const token = await useCase.run('user@example.com', 'tu_contraseña');

    expect(repositoryMock.login).toHaveBeenCalledWith('user@example.com', 'tu_contraseña');
    expect(token).toEqual(expectedToken);
  });
});
