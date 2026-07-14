import { AuthToken } from '../value-object/AuthToken.js';

export interface AuthRepository {
  login(email: string, password: string): Promise<AuthToken>;
}
