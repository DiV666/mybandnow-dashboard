import type { AuthRepository } from '../../domain/auth/repository/AuthRepository.js';
import { AuthToken } from '../../domain/auth/value-object/AuthToken.js';
import { httpClient } from '../http/httpClient.js';

export class AxiosAuthRepository implements AuthRepository {
  async login(email: string, password: string): Promise<AuthToken> {
    const response = await httpClient.post('/v1/auth/login', { email, password });
    return new AuthToken(response.data.accessToken);
  }
}
