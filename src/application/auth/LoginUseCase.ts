import type { AuthRepository } from '../../domain/auth/repository/AuthRepository.js';
import { AuthToken } from '../../domain/auth/value-object/AuthToken.js';

export class LoginUseCase {
  private readonly authRepository: AuthRepository;

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository;
  }

  async run(email: string, password: string): Promise<AuthToken> {
    return this.authRepository.login(email, password);
  }
}
